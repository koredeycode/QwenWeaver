import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { handleLogin, handleRegister } from './handlers.js';
import type { Variables } from '../../index.js';

export const authRoutes = new OpenAPIHono<{ Variables: Variables }>();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const userResponseSchema = z.object({
  token: z.string(),
  user: z.object({ id: z.string(), email: z.string() }),
});

const errorResponseSchema = z.object({
  error: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Auth'],
  summary: 'Register new user',
  request: {
    body: {
      content: { 'application/json': { schema: authSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: userResponseSchema } },
      description: 'Created',
    },
    400: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Bad Request' },
    409: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Conflict' },
    500: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Internal Server Error' },
  },
});

export const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'Login user',
  request: {
    body: {
      content: { 'application/json': { schema: authSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: userResponseSchema } },
      description: 'OK',
    },
    400: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Bad Request' },
    401: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Unauthorized' },
    500: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Internal Server Error' },
  },
});

authRoutes.openapi(registerRoute, handleRegister);
authRoutes.openapi(loginRoute, handleLogin);
