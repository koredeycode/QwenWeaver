import { sign, verify } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { getQueryProvider } from '@qwenweaver/database';
import { createModuleLogger } from '../../logger.js';
import type { Variables } from '../../index.js';
import { authSchema } from './schema.js';
import {
  JWT_SECRET,
  ACCESS_TOKEN_EXPIRY_SECONDS,
  REFRESH_TOKEN_EXPIRY_SECONDS,
  SIGNUP_CREDITS,
} from '../../config.js';
import type { Context } from 'hono';

const log = createModuleLogger('routes/auth.handlers');

export const handleRegister = async (c: Context<{ Variables: Variables }>) => {
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
    await provider.grantCredits(id, SIGNUP_CREDITS, 'signup_bonus', 'Welcome credits');

    log.info({ userId: id, email }, 'User registered successfully');

    // Short-lived access token + long-lived refresh token
    const now = Math.floor(Date.now() / 1000);
    const accessToken = await sign(
      { sub: id, email, exp: now + ACCESS_TOKEN_EXPIRY_SECONDS, type: 'access' },
      JWT_SECRET,
    );
    const refreshToken = await sign(
      { sub: id, email, exp: now + REFRESH_TOKEN_EXPIRY_SECONDS, type: 'refresh' },
      JWT_SECRET,
    );

    return c.json({ token: accessToken, refreshToken, user: { id, email } }, 201);
  } catch (err) {
    log.error({ error: (err as Error).message }, 'Registration failed');
    return c.json({ error: 'Internal Server Error' }, 500);
  }
};

export const handleLogin = async (c: Context<{ Variables: Variables }>) => {
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

    // Short-lived access token + long-lived refresh token
    const now = Math.floor(Date.now() / 1000);
    const accessToken = await sign(
      { sub: user.id, email, exp: now + ACCESS_TOKEN_EXPIRY_SECONDS, type: 'access' },
      JWT_SECRET,
    );
    const refreshToken = await sign(
      { sub: user.id, email, exp: now + REFRESH_TOKEN_EXPIRY_SECONDS, type: 'refresh' },
      JWT_SECRET,
    );

    return c.json(
      { token: accessToken, refreshToken, user: { id: user.id, email: user.email } },
      200,
    );
  } catch (err) {
    log.error({ error: (err as Error).message }, 'Login failed');
    return c.json({ error: 'Internal Server Error' }, 500);
  }
};

// Refresh token endpoint
export const handleRefreshToken = async (c: Context<{ Variables: Variables }>) => {
  try {
    const body = await c.req.json();
    const { refreshToken } = body as { refreshToken?: string };

    if (!refreshToken) {
      return c.json({ error: 'refreshToken is required' }, 400);
    }

    const payload = await verify(refreshToken, JWT_SECRET, 'HS256');

    if (payload.type !== 'refresh') {
      return c.json({ error: 'Invalid token type' }, 401);
    }

    const provider = getQueryProvider();
    const user = await provider.getUserById(payload.sub as string);

    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }

    const now = Math.floor(Date.now() / 1000);
    const newAccessToken = await sign(
      { sub: user.id, email: user.email, exp: now + ACCESS_TOKEN_EXPIRY_SECONDS, type: 'access' },
      JWT_SECRET,
    );

    log.info({ userId: user.id }, 'Access token refreshed');

    return c.json({ token: newAccessToken }, 200);
  } catch (err) {
    log.warn({ error: (err as Error).message }, 'Token refresh failed');
    return c.json({ error: 'Invalid or expired refresh token' }, 401);
  }
};
