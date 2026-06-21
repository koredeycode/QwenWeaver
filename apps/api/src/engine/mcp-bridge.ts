import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { NodePayload } from '@qwenweaver/types';
import { createMCPClient } from '@qwenweaver/mcp-client';
import { createModuleLogger } from '../logger.js';

const log = createModuleLogger('engine/mcp-bridge');

export interface DiscoveredTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// ─── Connection Pooling ─────────────────────────────────────────────────────

const clientPool = new Map<string, { client: Client; lastUsed: number }>();

async function getClient(mcpUrl: string): Promise<Client> {
  const pooled = clientPool.get(mcpUrl);
  if (pooled) {
    pooled.lastUsed = Date.now();
    return pooled.client;
  }

  const client = await createMCPClient(mcpUrl, { name: 'qwenweaver-engine' });
  clientPool.set(mcpUrl, { client, lastUsed: Date.now() });
  
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
}, 60 * 1000).unref();

// ─── Bridge Functions ───────────────────────────────────────────────────────

export async function discoverMCPTools(node: NodePayload): Promise<DiscoveredTool[]> {
  const mcpUrl = node.data.mcpServerUrl;

  if (!mcpUrl) {
    log.warn({ nodeId: node.id }, 'No MCP server URL configured on node, skipping tool discovery');
    return [];
  }

  try {
    const client = await getClient(mcpUrl);

    log.info({ nodeId: node.id, mcpUrl }, 'Connected to MCP server (from pool)');

    // Discover available tools with a 60s timeout
    const { tools } = await Promise.race([
      client.listTools(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('MCP listTools timed out')), 60000))
    ]);

    const discoveredTools: DiscoveredTool[] = tools.map((tool: { name: string; description?: string; inputSchema?: unknown }) => ({
      name: tool.name,
      description: tool.description ?? '',
      inputSchema: (tool.inputSchema as Record<string, unknown>) ?? {},
    }));

    log.info(
      { nodeId: node.id, toolCount: discoveredTools.length },
      'MCP tools discovered',
    );

    return discoveredTools;
  } catch (error) {
    log.error(
      { nodeId: node.id, mcpUrl, error: (error as Error).message },
      'Failed to discover MCP tools',
    );
    return [];
  }
}

export async function callMCPTool(
  mcpUrl: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  try {
    const client = await getClient(mcpUrl);

    // Call tool with a 60s timeout
    const result = await Promise.race([
      client.callTool({ name: toolName, arguments: args }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('MCP callTool timed out')), 60000))
    ]);

    log.info({ mcpUrl, toolName }, 'MCP tool called successfully');

    return result;
  } catch (error) {
    log.error(
      { mcpUrl, toolName, error: (error as Error).message },
      'Failed to call MCP tool',
    );
    throw error;
  }
}
