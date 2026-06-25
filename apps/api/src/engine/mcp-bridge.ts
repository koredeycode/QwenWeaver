import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { NodePayload } from '@qwenweaver/types';
import { createMCPClient } from '@qwenweaver/mcp-client';
import { createModuleLogger } from '../logger.js';
import { mcp_pool_connections } from '../metrics.js';

const log = createModuleLogger('engine/mcp-bridge');

export interface DiscoveredTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// ─── Connection Pooling with Liveness Checks ─────────────────────────

interface PoolEntry {
  client: Client;
  lastUsed: number;
}

const clientPool = new Map<string, PoolEntry>();

async function getClient(mcpUrl: string, headers?: Record<string, string>): Promise<Client> {
  const poolKey = headers ? `${mcpUrl}|${JSON.stringify(headers)}` : mcpUrl;
  const pooled = clientPool.get(poolKey);
  if (pooled) {
    try {
      await Promise.race([
        pooled.client.listTools(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('MCP liveness check timed out')), 5000),
        ),
      ]);
      pooled.lastUsed = Date.now();
      return pooled.client;
    } catch (err) {
      log.warn(
        { mcpUrl, error: (err as Error).message },
        'Pooled MCP connection is stale, reconnecting',
      );
      pooled.client.close().catch(() => {});
      clientPool.delete(poolKey);
    }
  }

  const client = await createMCPClient(mcpUrl, { name: 'qwenweaver-engine', headers });
  clientPool.set(poolKey, { client, lastUsed: Date.now() });
  mcp_pool_connections.set(clientPool.size);

  return client;
}

// Cleanup idle connections every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [url, entry] of clientPool.entries()) {
    if (now - entry.lastUsed > 5 * 60 * 1000) {
      entry.client.close().catch(() => {});
      clientPool.delete(url);
      log.info({ mcpUrl: url }, 'Closed idle MCP connection');
    }
  }
  mcp_pool_connections.set(clientPool.size);
}, 60 * 1000).unref();

// ─── Helpers ─────────────────────────────────────────────────────────────

function buildHeadersFromAuthConfig(authConfig: unknown): Record<string, string> | undefined {
  if (!authConfig) return undefined;
  const cfg = authConfig as Record<string, string>;
  if (cfg.type === 'bearer' && cfg.token) {
    return { Authorization: `Bearer ${cfg.token}` };
  }
  if (cfg.type === 'api_key' && cfg.apiKey) {
    return { Authorization: `Bearer ${cfg.apiKey}` };
  }
  if (cfg.type === 'basic' && cfg.username && cfg.password) {
    const encoded = Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }
  return undefined;
}

// ─── Bridge Functions ───────────────────────────────────────────────────────

export async function discoverMCPTools(
  node: NodePayload,
  headers?: Record<string, string>,
): Promise<DiscoveredTool[]> {
  const mcpUrl = node.data.mcpServerUrl;

  if (!mcpUrl) {
    throw new Error('No MCP server URL configured on node');
  }

  const client = await getClient(mcpUrl, headers);

  log.info({ nodeId: node.id, mcpUrl }, 'Connected to MCP server (from pool)');

  const { tools } = await Promise.race([
    client.listTools(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('MCP listTools timed out')), 60000),
    ),
  ]);

  const discoveredTools: DiscoveredTool[] = tools.map(
    (tool: { name: string; description?: string; inputSchema?: unknown }) => ({
      name: tool.name,
      description: tool.description ?? '',
      inputSchema: (tool.inputSchema as Record<string, unknown>) ?? {},
    }),
  );

  log.info({ nodeId: node.id, toolCount: discoveredTools.length }, 'MCP tools discovered');

  return discoveredTools;
}

export async function callMCPTool(
  mcpUrl: string,
  toolName: string,
  args: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<unknown> {
  try {
    const client = await getClient(mcpUrl, headers);

    const result = await Promise.race([
      client.callTool({ name: toolName, arguments: args }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('MCP callTool timed out')), 60000),
      ),
    ]);

    log.info({ mcpUrl, toolName }, 'MCP tool called successfully');

    return result;
  } catch (error) {
    log.error({ mcpUrl, toolName, error: (error as Error).message }, 'Failed to call MCP tool');
    throw error;
  }
}

export { buildHeadersFromAuthConfig };
