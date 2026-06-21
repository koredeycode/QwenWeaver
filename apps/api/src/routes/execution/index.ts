import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import { handleGetExecution, handleGetExecutionLogs } from './handlers.js';

const executionRoutes = new Hono<{ Variables: Variables }>();

// ─── GET /:executionId — Execution details ──────────────────────────────────
executionRoutes.get(
  '/:executionId',
  handleGetExecution
);

// ─── GET /:executionId/logs — Agent logs for an execution ───────────────────
executionRoutes.get(
  '/:executionId/logs',
  handleGetExecutionLogs
);

export { executionRoutes };
