import type { Context } from 'hono';
import { sign } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { getQueryProvider } from '@qwenweaver/database';
import { createModuleLogger } from '../../logger.js';
import type { Variables } from '../../index.js';
import { authSchema } from './schema.js';

const log = createModuleLogger('routes/auth.handlers');
const JWT_SECRET = process.env.API_SECRET || 'fallback-secret-for-dev';

export async function handleRegister(c: Context<{ Variables: Variables }>) {
  try {
    const body = await c.req.json();
    const result = authSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({ error: 'Invalid input', details: result.error.format() }, 400);
    }
    
    const { email, password } = result.data;
    const provider = getQueryProvider();
    
    const existing = await provider.getUserByEmail(email);
    if (existing) {
      return c.json({ error: 'User already exists' }, 409);
    }
    
    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    
    await provider.createUser(id, email, passwordHash);
    
    log.info({ userId: id, email }, 'User registered successfully');
    
    // Generate token
    const token = await sign({ sub: id, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }, JWT_SECRET);
    
    return c.json({ token, user: { id, email } }, 201);
  } catch (err) {
    log.error({ error: (err as Error).message }, 'Registration failed');
    return c.json({ error: 'Internal Server Error' }, 500);
  }
}

export async function handleLogin(c: Context<{ Variables: Variables }>) {
  try {
    const body = await c.req.json();
    const result = authSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({ error: 'Invalid input' }, 400);
    }
    
    const { email, password } = result.data;
    const provider = getQueryProvider();
    
    const user = await provider.getUserByEmail(email);
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    log.info({ userId: user.id }, 'User logged in');
    
    // Generate token
    const token = await sign({ sub: user.id, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }, JWT_SECRET);
    
    return c.json({ token, user: { id: user.id, email: user.email } }, 200);
  } catch (err) {
    log.error({ error: (err as Error).message }, 'Login failed');
    return c.json({ error: 'Internal Server Error' }, 500);
  }
}
