import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Variables } from '../../index.js';
import { WorkflowPayload } from '@qwenweaver/types';
import { handleExecute, handleStream, handleGetStatus } from './handlers.js';



const errorResponseSchema = z.object({
  error: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const executeRoute = createRoute({
  method: 'post',
  path: '/execute',
  tags: ['Workflow'],
  summary: 'Execute a workflow',
  request: {
    body: {
      content: { 'application/json': { schema: WorkflowPayload } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: z.object({ executionId: z.string(), status: z.string() }) } },
      description: 'Created',
    },
    400: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Bad Request' },
    500: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Internal Server Error' },
  },
});

export const streamRoute = createRoute({
  method: 'get',
  path: '/{executionId}/stream',
  tags: ['Workflow'],
  summary: 'Stream workflow execution events',
  request: {
    params: z.object({ executionId: z.string() }),
  },
  responses: {
    200: {
      description: 'SSE Stream',
    },
    404: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Not Found or Unauthorized' },
  },
});

export const getStatusRoute = createRoute({
  method: 'get',
  path: '/{executionId}',
  tags: ['Workflow'],
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
          }),
        },
      },
      description: 'OK',
    },
    403: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Unauthorized' },
    404: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Not Found' },
  },
});
export const workflowRoutes = new OpenAPIHono<{ Variables: Variables }>()
  .openapi(executeRoute, handleExecute)
  .openapi(streamRoute, handleStream)
  .openapi(getStatusRoute, handleGetStatus);

export type { ActiveExecution } from './handlers.js';
export { activeExecutions } from './handlers.js';
