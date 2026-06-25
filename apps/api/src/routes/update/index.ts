import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import { handleGetUpdateInfo, handleTriggerUpdate, handleSystemHealth, handleUpdateStream } from './handlers.js';

export const updateRoutes = new Hono<{ Variables: Variables }>()
  .get('/', handleGetUpdateInfo)
  .post('/', handleTriggerUpdate)
  .get('/health', handleSystemHealth)
  .get('/stream', handleUpdateStream);
