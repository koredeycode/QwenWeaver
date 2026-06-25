import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import { handleListWorkflows, handleGetWorkflow, handleDeleteWorkflow, handleSaveWorkflow, handleExecute, handleStream, handleGetStatus } from './handlers.js';

export const workflowRoutes = new Hono<{ Variables: Variables }>()
  .get('/', handleListWorkflows)
  .get('/detail/:workflowId', handleGetWorkflow)
  .delete('/detail/:workflowId', handleDeleteWorkflow)
  .post('/', handleSaveWorkflow)
  .post('/execute', handleExecute)
  .get('/:executionId/stream', handleStream)
  .get('/:executionId', handleGetStatus);

export type { ActiveExecution } from './handlers.js';
export { activeExecutions } from './handlers.js';
