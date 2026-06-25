import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import { handleGetSetupStatus, handleSetup, handleReconfigure } from './handlers.js';

export const setupRoutes = new Hono<{ Variables: Variables }>()
  .get('/status', handleGetSetupStatus)
  .post('/', handleSetup)
  .post('/reconfigure', handleReconfigure);
