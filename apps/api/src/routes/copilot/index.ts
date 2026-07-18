import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import {
  handleCopilotInit,
  handleCopilotStream,
  handleUpdateProposal,
  handleCopilotTTS,
} from './handlers.js';

export const copilotRoutes = new Hono<{ Variables: Variables }>()
  .post('/init', handleCopilotInit)
  .get('/stream/:sessionId', handleCopilotStream)
  .put('/proposal', handleUpdateProposal)
  .post('/tts', handleCopilotTTS);
