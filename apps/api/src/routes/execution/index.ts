import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import { handleGetExecution, handleGetExecutionLogs } from './handlers.js';

export const executionRoutes = new Hono<{ Variables: Variables }>()
  .get('/:executionId', handleGetExecution)
  .get('/:executionId/logs', handleGetExecutionLogs);
