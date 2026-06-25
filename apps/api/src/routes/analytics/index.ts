import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import { handleGetAnalyticsSummary } from './handlers.js';

export const analyticsRoutes = new Hono<{ Variables: Variables }>()
  .get('/', handleGetAnalyticsSummary);

