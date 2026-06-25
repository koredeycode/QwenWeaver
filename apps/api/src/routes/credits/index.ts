import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import { handleGetCredits, handleListTransactions } from './handlers.js';

export const creditsRoutes = new Hono<{ Variables: Variables }>()
  .get('/', handleGetCredits)
  .get('/transactions', handleListTransactions);
