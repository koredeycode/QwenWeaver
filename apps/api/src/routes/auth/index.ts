import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { handleLogin, handleRegister, handleRefreshToken } from './handlers.js';
import type { Variables } from '../../index.js';
import { authSchema, userResponseSchema, errorResponseSchema } from './schema.js';



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

export const refreshRoute = createRoute({
  method: 'post',
  path: '/refresh',
  tags: ['Auth'],
  summary: 'Refresh access token',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({ refreshToken: z.string() }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ token: z.string() }) } },
      description: 'OK',
    },
    400: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Bad Request' },
    401: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Unauthorized' },
  },
});export const authRoutes = new OpenAPIHono<{ Variables: Variables }>()
  .openapi(registerRoute, handleRegister)
  .openapi(loginRoute, handleLogin)
  .openapi(refreshRoute, handleRefreshToken);
