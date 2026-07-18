import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import {
  handleGetExecution,
  handleGetExecutionLogs,
  handleGetExecutionMessages,
  handleListExecutions,
} from './handlers.js';

export const executionRoutes = new Hono<{ Variables: Variables }>()
  .get('/', handleListExecutions)
  .get('/:executionId', handleGetExecution)
  .get('/:executionId/logs', handleGetExecutionLogs)
  .get('/:executionId/messages', handleGetExecutionMessages);
