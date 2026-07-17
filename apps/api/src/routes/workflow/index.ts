import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { WorkflowPayload, WorkflowPayloadBase } from '@qwenweaver/types';
import type { Variables } from '../../index.js';
import {
  handleListWorkflows,
  handleGetWorkflow,
  handleDeleteWorkflow,
  handleSaveWorkflow,
  handleUpdateWorkflow,
  handleExecute,
  handleStream,
  handleGetStatus,
  handleBulkDeleteWorkflows,
} from './handlers.js';

export const workflowRoutes = new Hono<{ Variables: Variables }>()
  .get('/', handleListWorkflows)
  .get('/detail/:workflowId', handleGetWorkflow)
  .delete('/detail/:workflowId', handleDeleteWorkflow)
  .put('/detail/:workflowId', zValidator('json', WorkflowPayload), handleUpdateWorkflow)
  .post('/', zValidator('json', WorkflowPayload), handleSaveWorkflow)
  .post('/bulk-delete', handleBulkDeleteWorkflows)
  .post(
    '/execute',
    zValidator('json', WorkflowPayloadBase.extend({ workflowId: z.string().optional() })),
    handleExecute,
  )
  .get('/:executionId/stream', handleStream)
  .get('/:executionId', handleGetStatus);

export type { ActiveExecution } from './handlers.js';
export { activeExecutions } from './handlers.js';
