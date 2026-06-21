import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Variables } from '../../index.js';
import { DiscoverToolsQuery, SaveServerBody } from './schema.js';
import {
  handleDiscoverTools,
  handleSaveServer,
  handleListServers,
  handleDeleteServer,
} from './handlers.js';

const mcpRoutes = new Hono<{ Variables: Variables }>();

// ─── GET /tools — Discover tools from an MCP server ─────────────────────────
mcpRoutes.get(
  '/tools',
  zValidator('query', DiscoverToolsQuery),
  handleDiscoverTools
);

// ─── POST /servers — Save an MCP server configuration ───────────────────────
mcpRoutes.post(
  '/servers',
  zValidator('json', SaveServerBody),
  handleSaveServer
);

// ─── GET /servers — List saved MCP server configurations ────────────────────
mcpRoutes.get(
  '/servers',
  handleListServers
);

// ─── DELETE /servers/:id — Remove a saved MCP server ────────────────────────
mcpRoutes.delete(
  '/servers/:id',
  handleDeleteServer
);

export { mcpRoutes };
