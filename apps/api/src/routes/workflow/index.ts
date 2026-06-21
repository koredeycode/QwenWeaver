import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Variables } from '../../index.js';
import { ExecuteBody } from './schema.js';
import { handleExecute, handleStream, handleGetStatus } from './handlers.js';

const workflowRoutes = new Hono<{ Variables: Variables }>();

// ─── POST /execute — Start workflow execution ───────────────────────────────
workflowRoutes.post(
  '/execute',
  zValidator('json', ExecuteBody),
  handleExecute
);

// ─── GET /:executionId/stream — SSE event stream ────────────────────────────
workflowRoutes.get(
  '/:executionId/stream',
  handleStream
);

// ─── GET /:executionId — Get execution status ───────────────────────────────
workflowRoutes.get(
  '/:executionId',
  handleGetStatus
);

export { workflowRoutes };
export type { ActiveExecution } from './handlers.js';
export { activeExecutions } from './handlers.js';
