import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Variables } from '../../index.js';
import { CopilotGenerateBody } from './schema.js';
import { handleCopilot } from './handlers.js';
import { NodePayload, EdgePayload } from '@qwenweaver/types';



const errorResponseSchema = z.object({
  error: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const copilotRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Copilot'],
  summary: 'Send a message to Copilot',
  request: {
    body: {
      content: { 'application/json': { schema: CopilotGenerateBody } },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            explanation: z.string().optional(),
            graph: z.object({
              nodes: z.array(NodePayload),
              edges: z.array(EdgePayload),
            }).optional(),
          }),
        },
      },
      description: 'OK',
    },
    400: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Bad Request' },
    500: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Internal Server Error' },
  },
});

export const copilotRoutes = new OpenAPIHono<{ Variables: Variables }>()
  .openapi(copilotRoute, handleCopilot);
