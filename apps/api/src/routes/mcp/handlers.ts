import type { Context } from 'hono';
import { saveMcpServer, getMcpServers, deleteMcpServer } from '@qwenweaver/database';
import { discoverMCPTools } from '../../engine/mcp-bridge.js';
import { createModuleLogger } from '../../logger.js';
import type { Variables } from '../../index.js';

const log = createModuleLogger('routes/mcp.handlers');

export async function handleDiscoverTools(c: Context<{ Variables: Variables }>) {
  const { url } = c.req.valid('query' as never) as any;

  log.info({ url }, 'MCP tool discovery requested');

  // Create a temporary node with the MCP URL for discovery
  const tempNode = {
    id: 'discovery',
    type: 'mcp_tool' as const,
    position: { x: 0, y: 0 },
    data: { mcpServerUrl: url },
  };

  const tools = await discoverMCPTools(tempNode);

  return c.json({ tools, count: tools.length });
}

export async function handleSaveServer(c: Context<{ Variables: Variables }>) {
  const body = c.req.valid('json' as never) as any;
  const id = crypto.randomUUID();

  const server = await saveMcpServer(id, {
    name: body.name,
    description: body.description,
    transport: body.transport,
    url: body.url,
    command: body.command,
    args: body.args,
  });

  log.info({ id, name: body.name, transport: body.transport }, 'MCP server saved');

  return c.json(server, 201);
}

export async function handleListServers(c: Context<{ Variables: Variables }>) {
  const servers = await getMcpServers();
  return c.json({ servers, count: servers.length });
}

export async function handleDeleteServer(c: Context<{ Variables: Variables }>) {
  const id = c.req.param('id')!;
  const deleted = await deleteMcpServer(id);

  if (!deleted) {
    return c.json({ error: 'MCP server not found' }, 404);
  }

  log.info({ id }, 'MCP server deleted');

  return c.json({ deleted: true });
}
