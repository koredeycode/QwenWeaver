import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Variables } from '../../index.js';
import { handleGetAnalyticsSummary } from './handlers.js';
import { AnalyticsSummarySchema } from './schema.js';



const errorResponseSchema = z.object({
  error: z.string(),
});

export const getAnalyticsSummaryRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Analytics'],
  summary: 'Get user execution analytics summary',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AnalyticsSummarySchema,
        },
      },
      description: 'OK',
    },
    500: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Internal Server Error' },
  },
});export const analyticsRoutes = new OpenAPIHono<{ Variables: Variables }>()
  .openapi(getAnalyticsSummaryRoute, handleGetAnalyticsSummary);

