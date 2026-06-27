import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import { handleCopilot, handleUpdateProposal } from './handlers.js';

export const copilotRoutes = new Hono<{ Variables: Variables }>()
  .post('/', handleCopilot)
  .put('/proposal', handleUpdateProposal);
