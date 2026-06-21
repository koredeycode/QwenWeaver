import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Variables } from '../../index.js';
import { CopilotGenerateBody } from './schema.js';
import { handleCopilot } from './handlers.js';

const copilotRoutes = new Hono<{ Variables: Variables }>();

// ─── POST / — AI Copilot interaction (generate, modify, explain) ─────────────
copilotRoutes.post(
  '/',
  zValidator('json', CopilotGenerateBody),
  handleCopilot
);

export { copilotRoutes };
