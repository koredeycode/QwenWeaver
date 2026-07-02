import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import { handleWrite, handleRead, handleList, handleClear } from './handlers.js';

export const workspaceRoutes = new Hono<{ Variables: Variables }>()
  .post('/:executionId/write', handleWrite)
  .get('/:executionId/read/:key', handleRead)
  .get('/:executionId/list', handleList)
  .delete('/:executionId/clear', handleClear);
