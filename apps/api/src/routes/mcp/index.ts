import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Variables } from '../../index.js';
import { DiscoverToolsQuery, SaveServerBody } from './schema.js';
import {
  handleDiscoverTools,
  handleSaveServer,
  handleListServers,
  handleDeleteServer,
} from './handlers.js';



const errorResponseSchema = z.object({
  error: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const discoverToolsRoute = createRoute({
  method: 'get',
  path: '/tools',
  tags: ['MCP'],
  summary: 'Discover tools from an MCP server',
  request: {
    query: DiscoverToolsQuery,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            tools: z.array(z.record(z.string(), z.unknown())),
            count: z.number(),
          }),
        },
      },
      description: 'OK',
    },
    404: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'MCP server not found' },
  },
});

export const saveServerRoute = createRoute({
  method: 'post',
  path: '/servers',
  tags: ['MCP'],
  summary: 'Save an MCP server configuration',
  request: {
    body: {
      content: { 'application/json': { schema: SaveServerBody } },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': { schema: z.record(z.string(), z.unknown()) },
      },
      description: 'Created',
    },
    400: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Bad Request' },
  },
});

export const listServersRoute = createRoute({
  method: 'get',
  path: '/servers',
  tags: ['MCP'],
  summary: 'List saved MCP server configurations',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            servers: z.array(z.record(z.string(), z.unknown())),
            count: z.number(),
          }),
        },
      },
      description: 'OK',
    },
  },
});

export const deleteServerRoute = createRoute({
  method: 'delete',
  path: '/servers/{id}',
  tags: ['MCP'],
  summary: 'Remove a saved MCP server',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ deleted: z.boolean() }),
        },
      },
      description: 'OK',
    },
    404: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Not found' },
  },
});
export const mcpRoutes = new OpenAPIHono<{ Variables: Variables }>()
  .openapi(discoverToolsRoute, handleDiscoverTools)
  .openapi(saveServerRoute, handleSaveServer)
  .openapi(listServersRoute, handleListServers)
  .openapi(deleteServerRoute, handleDeleteServer);

