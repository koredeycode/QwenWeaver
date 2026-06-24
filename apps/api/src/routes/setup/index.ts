import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Variables } from '../../index.js';
import { SetupStatusSchema, SetupPayloadSchema, ReconfigurePayloadSchema, SetupResponseSchema } from './schema.js';
import { handleGetSetupStatus, handleSetup, handleReconfigure } from './handlers.js';

const errorResponseSchema = z.object({
  error: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const getSetupStatusRoute = createRoute({
  method: 'get',
  path: '/status',
  tags: ['Setup'],
  summary: 'Get setup status',
  responses: {
    200: {
      content: { 'application/json': { schema: SetupStatusSchema } },
      description: 'Setup status',
    },
  },
});

export const setupRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Setup'],
  summary: 'Complete or update setup',
  request: {
    body: {
      content: { 'application/json': { schema: SetupPayloadSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: SetupResponseSchema } },
      description: 'Setup completed',
    },
    400: {
      content: { 'application/json': { schema: errorResponseSchema } },
      description: 'Bad Request',
    },
  },
});

export const reconfigureRoute = createRoute({
  method: 'post',
  path: '/reconfigure',
  tags: ['Setup'],
  summary: 'Reconfigure runtime settings (authenticated)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: ReconfigurePayloadSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: SetupResponseSchema } },
      description: 'Configuration updated',
    },
    400: {
      content: { 'application/json': { schema: errorResponseSchema } },
      description: 'Bad Request',
    },
  },
});

export const setupRoutes = new OpenAPIHono<{ Variables: Variables }>()
  .openapi(getSetupStatusRoute, handleGetSetupStatus)
  .openapi(setupRoute, handleSetup)
  .openapi(reconfigureRoute, handleReconfigure);
