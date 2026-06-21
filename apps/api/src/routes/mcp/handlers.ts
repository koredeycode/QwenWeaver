import type { Context } from 'hono';
import { getQueryProvider } from '@qwenweaver/database';
import { discoverMCPTools } from '../../engine/mcp-bridge.js';
import { createModuleLogger } from '../../logger.js';
import type { Variables } from '../../index.js';
import { SaveServerBody } from './schema.js';

const log = createModuleLogger('routes/mcp.handlers');

export async function handleDiscoverTools(c: Context<{ Variables: Variables }>) {
  const serverId = c.req.query('serverId');
  const userId = c.get('jwtPayload').sub;

  log.info({ serverId }, 'MCP tool discovery requested');

  const provider = getQueryProvider();
  const servers = await provider.getMcpServers(userId);
  const server = servers.find((s: any) => s.id === serverId);

  if (!server) {
    log.warn({ serverId, userId }, 'MCP server not found or unauthorized for discovery');
    return c.json({ error: 'MCP server not found' }, 404);
  }

  const tempNode = {
    id: 'discovery',
    type: 'mcp_tool' as const,
    position: { x: 0, y: 0 },
    data: { mcpServerUrl: server.url },
  };

  const tools = await discoverMCPTools(tempNode);

  return c.json({ tools, count: tools.length }, 200);
}

export async function handleSaveServer(c: Context<{ Variables: Variables }>) {
  // Validate body through Zod instead of blind cast
  const raw = await c.req.json();
  const parsed = SaveServerBody.safeParse(raw);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.format() }, 400);
  }

  const body = parsed.data;
  const id = crypto.randomUUID();
  const userId = c.get('jwtPayload').sub;

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
}

export async function handleListServers(c: Context<{ Variables: Variables }>) {
  const userId = c.get('jwtPayload').sub;
  const provider = getQueryProvider();
  const servers = await provider.getMcpServers(userId);
  return c.json({ servers, count: servers.length }, 200);
}

export async function handleDeleteServer(c: Context<{ Variables: Variables }>) {
  const id = c.req.param('id')!;
  const userId = c.get('jwtPayload').sub;
  
  const provider = getQueryProvider();
  const deleted = await provider.deleteMcpServer(id, userId);

  if (!deleted) {
    return c.json({ error: 'MCP server not found or unauthorized' }, 404);
  }

  log.info({ id }, 'MCP server deleted');

  return c.json({ deleted: true }, 200);
}
