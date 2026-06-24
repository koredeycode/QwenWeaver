import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Variables } from '../../index.js';
import { UpdateInfoSchema, UpdateTriggerResponseSchema, SystemHealthSchema } from './schema.js';
import { handleGetUpdateInfo, handleTriggerUpdate, handleSystemHealth, handleUpdateStream } from './handlers.js';

export const getUpdateInfoRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['System'],
  summary: 'Check for available updates',
  responses: {
    200: {
      content: { 'application/json': { schema: UpdateInfoSchema } },
      description: 'Update info',
    },
  },
});

export const triggerUpdateRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['System'],
  summary: 'Trigger update',
  responses: {
    200: {
      content: { 'application/json': { schema: UpdateTriggerResponseSchema } },
      description: 'Update triggered',
    },
    409: {
      content: { 'application/json': { schema: z.object({ error: z.string(), logs: z.array(z.string()) }) } },
      description: 'Update already running',
    },
  },
});

export const systemHealthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'System health check (authenticated)',
  responses: {
    200: {
      content: { 'application/json': { schema: SystemHealthSchema } },
      description: 'System health',
    },
  },
});

export const updateStreamRoute = createRoute({
  method: 'get',
  path: '/stream',
  tags: ['System'],
  summary: 'SSE stream of update logs',
  responses: {
    200: {
      description: 'SSE event stream',
    },
  },
});

export const updateRoutes = new OpenAPIHono<{ Variables: Variables }>()
  .openapi(getUpdateInfoRoute, handleGetUpdateInfo)
  .openapi(triggerUpdateRoute, handleTriggerUpdate)
  .openapi(systemHealthRoute, handleSystemHealth)
  .openapi(updateStreamRoute, handleUpdateStream);
