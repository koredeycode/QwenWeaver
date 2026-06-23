import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Variables } from '../../index.js';
import { handleGetExecution, handleGetExecutionLogs } from './handlers.js';



const errorResponseSchema = z.object({
  error: z.string(),
});

export const getExecutionRoute = createRoute({
  method: 'get',
  path: '/{executionId}',
  tags: ['Execution'],
  summary: 'Get execution status',
  request: {
    params: z.object({ executionId: z.string() }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            id: z.string(),
            status: z.string(),
            metrics: z.record(z.string(), z.unknown()).optional(),
            workflowId: z.string().optional(),
            userId: z.string().optional(),
            startedAt: z.string().optional(),
            completedAt: z.string().optional(),
          }),
        },
      },
      description: 'OK',
    },
    404: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Execution not found or unauthorized' },
  },
});

export const getExecutionLogsRoute = createRoute({
  method: 'get',
  path: '/{executionId}/logs',
  tags: ['Execution'],
  summary: 'Get execution agent logs',
  request: {
    params: z.object({ executionId: z.string() }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            executionId: z.string(),
            logs: z.array(z.record(z.string(), z.unknown())),
          }),
        },
      },
      description: 'OK',
    },
    404: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Execution not found or unauthorized' },
  },
});export const executionRoutes = new OpenAPIHono<{ Variables: Variables }>()
  .openapi(getExecutionRoute, handleGetExecution)
  .openapi(getExecutionLogsRoute, handleGetExecutionLogs);

