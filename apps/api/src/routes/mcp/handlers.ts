import type { Context } from 'hono';
import { getQueryProvider } from '@qwenweaver/database';
import { discoverMCPTools, buildHeadersFromAuthConfig } from '../../engine/mcp-bridge.js';
import { createModuleLogger } from '../../logger.js';
import type { Variables } from '../../index.js';
import {
  SaveServerBody,
  DiscoverToolsBody,
  AdoptRegistryBody,
  UpdateServerAuthBody,
} from './schema.js';

const log = createModuleLogger('routes/mcp.handlers');

const REGISTRY_BASE = 'https://registry.modelcontextprotocol.io/v0/servers';

/** Fetch a page of servers from the live registry API */
async function fetchRegistryPage(cursor?: string, limit = 100) {
  const params = new URLSearchParams({ limit: String(limit), version: 'latest' });
  if (cursor) params.set('cursor', cursor);
  const resp = await fetch(`${REGISTRY_BASE}?${params}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`Registry API returned ${resp.status}`);
  return resp.json() as Promise<{ servers: any[]; metadata: { nextCursor?: string } }>;
}

/** Normalize a registry server entry into our SavedMCPServer shape */
function normalizeRegistryEntry(entry: any): {
  registryId: string;
  name: string;
  description: string;
  transport: string;
  url: string | null;
  iconUrl: string | null;
  registryMetadata: any;
} {
  const server = entry.server || entry;
  const remotes = server.remotes || [];
  const packages = server.packages || [];
  const transports = [
    ...remotes.map((r: any) => (r.type === 'streamable-http' ? 'http' : r.type)),
    ...packages.map((p: any) => (p.transport?.type === 'stdio' ? 'stdio' : p.transport?.type)),
  ].filter(Boolean);
  const firstRemote = remotes[0] || {};
  return {
    registryId: server.name || '',
    name: server.title || server.name || '',
    description: server.description || '',
    transport: transports[0] || 'http',
    url: firstRemote.url || null,
    iconUrl: server.icons?.[0]?.src || null,
    registryMetadata: entry,
  };
}

export const handleDiscoverTools = async (c: Context<{ Variables: Variables }>) => {
  const raw = await c.req.json();
  const parsed = DiscoverToolsBody.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.format() }, 400);
  }
  const { serverId, serverUrl: serverUrlOverride, auth } = parsed.data;
  const userId = c.get('user')?.id;

  log.info({ serverId }, 'MCP tool discovery requested');

  // Build auth headers from request body using shared helper
  const headers: Record<string, string> | undefined = auth
    ? buildHeadersFromAuthConfig(auth)
    : undefined;

  let mcpUrl: string | null = serverUrlOverride || null;

  if (!mcpUrl) {
    const provider = getQueryProvider();
    const userServers = await provider.getMcpServers(userId);
    const server = userServers.find((s: any) => s.id === serverId || s.registryId === serverId);

    if (!server) {
      log.warn({ serverId, userId }, 'MCP server not found or unauthorized for discovery');
      return c.json({ error: 'MCP server not found' }, 404);
    }

    if (!server.url) {
      log.warn({ serverId }, 'MCP server has no URL configured');
      return c.json({ error: 'MCP server has no URL configured' }, 400);
    }

    mcpUrl = server.url;
  }

  const tempNode = {
    id: 'discovery',
    type: 'mcp_tool' as const,
    position: { x: 0, y: 0 },
    data: { mcpServerUrl: mcpUrl },
  };

  try {
    const tools = await discoverMCPTools(tempNode, headers);
    return c.json({ tools, count: tools.length }, 200);
  } catch (err) {
    const msg = (err as Error).message;
    log.error({ serverId, mcpUrl, error: msg }, 'MCP tool discovery failed');
    return c.json({ error: msg }, 502);
  }
};

export const handleSaveServer = async (c: Context<{ Variables: Variables }>) => {
  const raw = await c.req.json();
  const parsed = SaveServerBody.safeParse(raw);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.format() }, 400);
  }

  const body = parsed.data;
  const id = crypto.randomUUID();
  const userId = c.get('user')?.id;

  const provider = getQueryProvider();
  const server = await provider.saveMcpServer(id, userId, {
    name: body.name,
    description: body.description,
    transport: body.transport,
    url: body.url,
    command: body.command,
    args: body.args,
  });

  log.info({ id, name: body.name, transport: body.transport }, 'MCP server saved');

  return c.json(server, 201);
};

export const handleListServers = async (c: Context<{ Variables: Variables }>) => {
  const userId = c.get('user')?.id;
  const provider = getQueryProvider();
  const servers = await provider.getMcpServers(userId);
  return c.json({ servers, count: servers.length }, 200);
};

export const handleDeleteServer = async (c: Context<{ Variables: Variables }>) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing server id parameter' }, 400);
  }
  const userId = c.get('user')?.id;

  const provider = getQueryProvider();
  const deleted = await provider.deleteMcpServer(id, userId);

  if (!deleted) {
    return c.json({ error: 'MCP server not found or unauthorized' }, 404);
  }

  log.info({ id }, 'MCP server deleted');

  return c.json({ deleted: true }, 200);
};

export const handleRegistryAdopt = async (c: Context<{ Variables: Variables }>) => {
  const raw = await c.req.json();
  const parsed = AdoptRegistryBody.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.format() }, 400);
  }
  const { registryId, authConfig } = parsed.data;
  const userId = c.get('user')?.id;

  // Fetch the server from the live registry API
  let cursor: string | undefined;
  let found: any;
  for (let page = 0; page < 10; page++) {
    const data = await fetchRegistryPage(cursor);
    const match = data.servers?.find((entry: any) => entry.server?.name === registryId);
    if (match) {
      found = match;
      break;
    }
    cursor = data.metadata?.nextCursor;
    if (!cursor) break;
  }

  if (!found) {
    log.warn({ registryId }, 'Registry server not found in live API');
    return c.json({ error: 'Registry server not found' }, 404);
  }

  const norm = normalizeRegistryEntry(found);
  const provider = getQueryProvider();
  const id = crypto.randomUUID();
  const server = await provider.saveMcpServer(id, userId, {
    name: norm.name,
    description: norm.description,
    transport: norm.transport as 'http' | 'stdio' | 'sse',
    url: norm.url || undefined,
    command: undefined,
    args: undefined,
    iconUrl: norm.iconUrl || undefined,
    authConfig: authConfig as any,
    registryOrigin: 'manual',
    registryId: norm.registryId,
    registryMetadata: null,
  });

  log.info({ registryId, userId, serverId: id }, 'Registry server adopted');
  return c.json({ server, registryId }, 201);
};

export const handleUpdateServerAuth = async (c: Context<{ Variables: Variables }>) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Missing server id' }, 400);
  const raw = await c.req.json();
  const parsed = UpdateServerAuthBody.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.format() }, 400);
  }
  const { authConfig } = parsed.data;
  const userId = c.get('user')?.id;
  const provider = getQueryProvider();
  try {
    const server = await provider.updateMcpServerAuth(id, userId, authConfig as any);
    log.info({ id, userId }, 'MCP server auth updated');
    return c.json({ server }, 200);
  } catch (err) {
    log.warn({ id, error: (err as Error).message }, 'Failed to update MCP server auth');
    return c.json({ error: (err as Error).message }, 404);
  }
};

export const handleToggleFavorite = async (c: Context<{ Variables: Variables }>) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Missing server id' }, 400);
  const userId = c.get('user')?.id;
  const provider = getQueryProvider();
  try {
    const server = await provider.toggleFavoriteMcpServer(id, userId);
    log.info({ id, userId, isFavorite: server.isFavorite }, 'MCP server favorite toggled');
    return c.json({ server }, 200);
  } catch (err) {
    log.warn({ id, error: (err as Error).message }, 'Failed to toggle MCP server favorite');
    return c.json({ error: (err as Error).message }, 404);
  }
};

/**
 * Parse registry metadata to detect which auth types a server supports.
 * Examines required headers on remotes and environment variables on packages.
 */
function deriveAuthTypes(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const raw = metadata as Record<string, unknown>;
  const server = raw.server as Record<string, unknown> | undefined;
  if (!server) return [];

  const types = new Set<string>();

  // Check remotes for required HTTP headers
  const remotes = (server.remotes as Array<Record<string, unknown>>) || [];
  for (const remote of remotes) {
    const headers = (remote.headers as Array<Record<string, unknown>>) || [];
    for (const h of headers) {
      if (h.isRequired && typeof h.name === 'string') {
        const name = h.name.toLowerCase();
        if (name === 'authorization') {
          // Check if the description hints at basic vs bearer
          const desc = ((h.description as string) || '').toLowerCase();
          if (desc.includes('basic')) {
            types.add('basic');
          } else {
            types.add('bearer');
          }
        } else if (name.includes('api') && name.includes('key')) {
          types.add('api_key');
        }
      }
    }
  }

  // Check packages for required environment variables
  const packages = (server.packages as Array<Record<string, unknown>>) || [];
  for (const pkg of packages) {
    const envVars = (pkg.environmentVariables as Array<Record<string, unknown>>) || [];
    let hasUser = false,
      hasPass = false;
    for (const env of envVars) {
      if (!env.isRequired || typeof env.name !== 'string') continue;
      const name = env.name.toLowerCase();
      if (name.includes('api_key') || name.includes('apikey') || name.includes('api-key')) {
        types.add('api_key');
      } else if (name.includes('token')) {
        types.add('bearer');
      } else if (name.includes('username') || name.includes('user')) {
        hasUser = true;
      } else if (name.includes('password') || name.includes('pass')) {
        hasPass = true;
      }
    }
    if (hasUser && hasPass) types.add('basic');
  }

  return Array.from(types);
}

export const handleRegistrySearch = async (c: Context<{ Variables: Variables }>) => {
  const q = (c.req.query('q') || '').toLowerCase();
  const transport = c.req.query('transport');
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
  const cursor = c.req.query('cursor') || undefined;

  // Fetch pages from the live registry, filtering in-memory for q and transport,
  // until we have `limit` matching results (max 10 pages).
  let regCursor: string | undefined = cursor;
  const matches: any[] = [];
  let nextCursor: string | undefined;
  let pageCount = 0;

  while (matches.length < limit && pageCount < 10) {
    const data = await fetchRegistryPage(regCursor);
    if (!data.servers?.length) break;
    nextCursor = data.metadata?.nextCursor;
    pageCount++;

    for (const entry of data.servers) {
      const s = entry.server || {};
      const name = s.name;
      if (!name) continue;

      // Apply text filter
      if (q) {
        const haystack = ((s.title || '') + ' ' + name + ' ' + (s.description || '')).toLowerCase();
        if (!haystack.includes(q)) continue;
      }

      // Apply transport filter
      if (transport) {
        const norm = normalizeRegistryEntry(entry);
        if (norm.transport !== transport) continue;
      }

      matches.push(entry);
      if (matches.length >= limit) break;
    }

    regCursor = nextCursor;
    if (!regCursor) break;
  }

  const servers = matches.map((entry: any) => {
    const n = normalizeRegistryEntry(entry);
    const supportedAuthTypes = deriveAuthTypes(n.registryMetadata);
    return {
      ...n,
      id: n.registryId,
      supportedAuthTypes,
      authRequired: supportedAuthTypes.length > 0,
    };
  });

  return c.json(
    {
      servers,
      cursor: nextCursor || null,
      hasMore: !!nextCursor,
      limit,
      count: servers.length,
    },
    200,
  );
};
