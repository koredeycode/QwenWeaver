import { Hono } from 'hono';
import { handleLogin, handleRegister, handleRefreshToken } from './handlers.js';
import type { Variables } from '../../index.js';

export const authRoutes = new Hono<{ Variables: Variables }>()
  .post('/register', handleRegister)
  .post('/login', handleLogin)
  .post('/refresh', handleRefreshToken);
