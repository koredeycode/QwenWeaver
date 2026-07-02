import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { URL } from 'node:url';

export type { Client };

export const MCP_CLIENT_VERSION = '0.1.0';

export interface MCPClientOptions {
  name?: string;
  version?: string;
  headers?: Record<string, string>;
}

export class MCPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MCPError';
  }
}

/**
 * Creates and connects a new MCP client using the Streamable HTTP transport.
 * Only http:// and https:// URLs are supported.
 */
export async function createMCPClient(
  url: string,
  options: MCPClientOptions = {},
): Promise<Client> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new MCPError(
      `Unsupported MCP transport. Only HTTP(S) Streamable HTTP is supported. Received: ${url}`,
    );
  }

  const { StreamableHTTPClientTransport } =
    await import('@modelcontextprotocol/sdk/client/streamableHttp.js');

  const client = new Client({
    name: options.name || 'qwenweaver-mcp-client',
    version: options.version || '0.1.0',
  });

  const transportOpts: Record<string, unknown> = {};
  if (options.headers) {
    transportOpts.requestInit = { headers: options.headers };
  }
  const transport = new StreamableHTTPClientTransport(new URL(url), transportOpts);
  await client.connect(transport);

  return client;
}
