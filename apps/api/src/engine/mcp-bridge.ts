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

/**
 * Discovers MCP tools from a server connection configured on a node.
 *
 * Connects to the MCP server specified in `node.data.mcpServerUrl` (HTTP)
 * or via command/args (Stdio), lists the available tools, and returns them
 * as tool definitions ready for injection into AI SDK calls.
 *
 * The connection is lazily initialized per call and closed after discovery.
 */
export async function discoverMCPTools(node: NodePayload): Promise<DiscoveredTool[]> {
  const mcpUrl = node.data.mcpServerUrl;

  if (!mcpUrl) {
    log.warn({ nodeId: node.id }, 'No MCP server URL configured on node, skipping tool discovery');
    return [];
  }

  let client: Client | null = null;

  try {
    client = await createMCPClient(mcpUrl, { name: 'qwenweaver-engine' });

    log.info({ nodeId: node.id, mcpUrl }, 'Connected to MCP server');

    // Discover available tools
    const { tools } = await client.listTools();

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
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}

/**
 * Calls a specific tool on an MCP server.
 *
 * Used by the agent runner when the AI model decides to invoke an MCP tool.
 */
export async function callMCPTool(
  mcpUrl: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  let client: Client | null = null;

  try {
    client = await createMCPClient(mcpUrl, { name: 'qwenweaver-engine' });

    const result = await client.callTool({ name: toolName, arguments: args });

    log.info({ mcpUrl, toolName }, 'MCP tool called successfully');

    return result;
  } catch (error) {
    log.error(
      { mcpUrl, toolName, error: (error as Error).message },
      'Failed to call MCP tool',
    );
    throw error;
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}
