import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import { handleUpload } from './handlers.js';

export const fileRoutes = new Hono<{ Variables: Variables }>().post('/upload', handleUpload);
