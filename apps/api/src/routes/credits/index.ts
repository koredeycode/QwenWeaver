import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Variables } from '../../index.js';
import { handleGetCredits, handleListTransactions } from './handlers.js';

const errorResponseSchema = z.object({
  error: z.string(),
});

const CreditInfoSchema = z.object({
  balance: z.number(),
  lifetimeEarned: z.number(),
  lifetimeSpent: z.number(),
  lowBalance: z.boolean(),
});

const TransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  amount: z.number(),
  type: z.string(),
  description: z.string().nullable(),
  executionId: z.string().nullable(),
  createdAt: z.string(),
});

export const getCreditsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Credits'],
  summary: 'Get current user credit balance',
  responses: {
    200: {
      content: { 'application/json': { schema: CreditInfoSchema } },
      description: 'OK',
    },
    500: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Internal Server Error' },
  },
});

export const listTransactionsRoute = createRoute({
  method: 'get',
  path: '/transactions',
  tags: ['Credits'],
  summary: 'List credit transactions',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ transactions: z.array(TransactionSchema) }),
        },
      },
      description: 'OK',
    },
    500: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Internal Server Error' },
  },
});

export const creditsRoutes = new OpenAPIHono<{ Variables: Variables }>()
  .openapi(getCreditsRoute, handleGetCredits)
  .openapi(listTransactionsRoute, handleListTransactions);
