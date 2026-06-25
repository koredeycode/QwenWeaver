import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { URL } from 'node:url';

export const MCP_CLIENT_VERSION = '0.1.0';

export interface MCPClientOptions {
  name?: string;
  version?: string;
  commandArgs?: string[];
  headers?: Record<string, string>;
}

/**
 * Creates and connects a new MCP client based on the provided URL or Command.
 * If urlOrCommand starts with http:// or https://, HTTP Streamable transport is used.
 * Otherwise, Stdio transport is used with command args from options.
 */
export async function createMCPClient(
  urlOrCommand: string,
  options: MCPClientOptions = {},
): Promise<Client> {
  const client = new Client({
    name: options.name || 'qwenweaver-mcp-client',
    version: options.version || '0.1.0',
  });

  if (urlOrCommand.startsWith('http://') || urlOrCommand.startsWith('https://')) {
    const { StreamableHTTPClientTransport } =
      await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const transportOpts: Record<string, unknown> = {};
    if (options.headers) {
      transportOpts.requestInit = { headers: options.headers };
    }
    const transport = new StreamableHTTPClientTransport(new URL(urlOrCommand), transportOpts);
    await client.connect(transport);
  } else {
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
    const transport = new StdioClientTransport({
      command: urlOrCommand,
      args: options.commandArgs || [],
    });
    await client.connect(transport);
  }

  return client;
}
