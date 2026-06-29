import { client, client2, authHeaders, withRefresh } from '../lib/api-client.js';

const REGISTRY_URL = 'https://registry.modelcontextprotocol.io/v0/servers';

export async function discoverMCPTools(
  mcpServerUrl: string,
  authConfig?: Record<string, unknown>,
): Promise<any[]> {
  try {
    const res = await client.api.mcp.tools.discover.$post(
      {
        json: { mcpServerUrl, authConfig } as any,
      },
      { headers: authHeaders() },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    return data.tools || [];
  } catch {
    return [];
  }
}

export async function listUserServers(): Promise<any[]> {
  try {
    const res = await client.api.mcp.servers.$get({}, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    return data.servers || [];
  } catch {
    return [];
  }
}

export async function toggleFavorite(serverId: string): Promise<boolean> {
  try {
    const res = await withRefresh(() =>
      (client.api.mcp.servers[':id'] as any).favorite.$post(
        { param: { id: serverId } },
        { headers: authHeaders() },
      ),
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function adoptRegistryServer(registryId: string): Promise<boolean> {
  try {
    const res = await withRefresh(() =>
      (client2.api.mcp.registry as any).adopt.$post(
        { json: { registryId } },
        { headers: authHeaders() },
      ),
    );
    return res.ok;
  } catch {
    return false;
  }
}

export interface RegistryServerEntry {
  registryId: string;
  name: string;
  description: string;
  transport: string;
  url: string | null;
  iconUrl: string | null;
  id: string;
  supportedAuthTypes: string[];
  authRequired: boolean;
}

export async function searchRegistry(
  query: string,
  transport: string,
  cursor: string | null,
  append: boolean,
  currentServers: RegistryServerEntry[],
): Promise<{
  servers: RegistryServerEntry[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const searchLower = query.toLowerCase();
  let regCursor: string | undefined = cursor || undefined;
  const matches: RegistryServerEntry[] = append ? [...currentServers] : [];
  let nextCursor: string | undefined;
  let pageCount = 0;

  while (
    (append ? matches.length : matches.length - currentServers.length) < 20 &&
    pageCount < 10
  ) {
    const params = new URLSearchParams({ limit: '100', version: 'latest' });
    if (regCursor) params.set('cursor', regCursor);
    const res = await fetch(`${REGISTRY_URL}?${params}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) break;
    const data = await res.json();
    if (!data.servers?.length) break;
    nextCursor = data.metadata?.nextCursor;
    pageCount++;

    for (const entry of data.servers) {
      const s = entry.server || {};
      const name = s.name;
      if (!name) continue;
      if (searchLower) {
        const haystack = ((s.title || '') + ' ' + name + ' ' + (s.description || '')).toLowerCase();
        if (!haystack.includes(searchLower)) continue;
      }
      const normEntry = (() => {
        const server = entry.server || entry;
        const remotes = server.remotes || [];
        const packages = server.packages || [];
        const transports = [
          ...remotes.map((r: any) => (r.type === 'streamable-http' ? 'http' : r.type)),
          ...packages.map((p: any) =>
            p.transport?.type === 'stdio' ? 'stdio' : p.transport?.type,
          ),
        ].filter(Boolean);
        const firstRemote = remotes[0] || {};
        return {
          registryId: server.name || '',
          name: server.title || server.name || '',
          description: server.description || '',
          transport: transports[0] || 'http',
          url: firstRemote.url || null,
          iconUrl: server.icons?.[0]?.src || null,
        };
      })();
      if (transport && normEntry.transport !== transport) continue;
      const supportedAuthTypes = (() => {
        const types = new Set<string>();
        const remotes = s.remotes || [];
        for (const remote of remotes) {
          const headers = remote.headers || [];
          for (const h of headers) {
            if (h.isRequired && typeof h.name === 'string') {
              const hn = h.name.toLowerCase();
              if (hn === 'authorization') {
                types.add(
                  (h.description || '').toLowerCase().includes('basic') ? 'basic' : 'bearer',
                );
              } else if (hn.includes('api') && hn.includes('key')) {
                types.add('api_key');
              }
            }
          }
        }
        const packages = s.packages || [];
        for (const pkg of packages) {
          const envVars = pkg.environmentVariables || [];
          let hasUser = false,
            hasPass = false;
          for (const env of envVars) {
            if (!env.isRequired || typeof env.name !== 'string') continue;
            const en = env.name.toLowerCase();
            if (en.includes('api_key') || en.includes('apikey') || en.includes('api-key'))
              types.add('api_key');
            else if (en.includes('token')) types.add('bearer');
            else if (en.includes('username') || en.includes('user')) hasUser = true;
            else if (en.includes('password') || en.includes('pass')) hasPass = true;
          }
          if (hasUser && hasPass) types.add('basic');
        }
        return Array.from(types);
      })();
      matches.push({
        ...normEntry,
        id: normEntry.registryId,
        supportedAuthTypes,
        authRequired: supportedAuthTypes.length > 0,
      });
      if (matches.length >= 20) break;
    }
    regCursor = nextCursor;
    if (!regCursor) break;
  }

  return {
    servers: matches,
    nextCursor: nextCursor || null,
    hasMore: !!nextCursor && matches.length >= 20,
  };
}
