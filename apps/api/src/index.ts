import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { serve } from '@hono/node-server';
import { HTTPException } from 'hono/http-exception';
import { logger, requestLogger } from './logger.js';
import { serveStatic } from '@hono/node-server/serve-static';
import { workflowRoutes } from './routes/workflow/index.js';
import { executionRoutes } from './routes/execution/index.js';
import { copilotRoutes } from './routes/copilot/index.js';
import { mcpRoutes, registryRoutes } from './routes/mcp/index.js';
import { analyticsRoutes } from './routes/analytics/index.js';
import { creditsRoutes } from './routes/credits/index.js';
import { credentialsRoutes } from './routes/credentials/index.js';
import { templateRoutes } from './routes/templates/index.js';

import { register } from './metrics.js';
import { getQueryProvider } from '@qwenweaver/database';
import { rateLimiter } from './middleware/rate-limiter.js';
import { CORS_ORIGINS, RATE_LIMIT, METRICS_TOKEN } from './config.js';
import { auth } from './auth.js';

export type Variables = {
  requestId: string;
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
  } | null;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  } | null;
};

const app = new Hono<{ Variables: Variables }>();

// Lock down CORS to configured origins instead of wildcard
app.use(
  '/api/*',
  cors({
    origin: CORS_ORIGINS,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 600,
  }),
);
app.use('/public/*', serveStatic({ root: './' }));
app.use('*', requestLogger());

// Security headers
app.use('*', async (c, next) => {
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  await next();
});

app.use(
  '/api/*',
  bodyLimit({
    maxSize: 5 * 1024 * 1024, // 5MB
    onError: (c) => {
      return c.json({ error: 'Payload too large' }, 413);
    },
  }),
);

// Better Auth handler — forwards to Better Auth's internal router.
// Better Auth endpoints are registered at /get-session, /sign-in/email, etc.
// With basePath=/api (from BETTER_AUTH_URL=http://localhost:3001/api), actual paths
// are /api/get-session, /api/sign-in/email, /api/sign-up/email, /api/sign-out, etc.
// If Better Auth returns 404 (unknown path), we fall through to app routes.
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  if (
    path.startsWith('/api/health') ||
    path.startsWith('/api/docs') ||
    path.startsWith('/api/openapi.json') ||
    path.startsWith('/api/mcp/registry') ||
    path.startsWith('/api/metrics')
  ) {
    return next();
  }
  const response = await auth.handler(c.req.raw);
  if (response.status === 404) {
    return next();
  }
  return response;
});

// Rate limiting on copilot endpoint (expensive LLM calls)
app.use('/api/copilot/*', rateLimiter('copilot', RATE_LIMIT.copilot));

// General API rate limiting
app.use('/api/*', rateLimiter('api', RATE_LIMIT.api));

// Session middleware — resolves session for all /api/* routes
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  const skipPaths = [
    '/api/health',
    '/api/docs',
    '/api/openapi.json',
    '/api/mcp/registry',
    '/api/metrics',
    '/api/get-session',
    '/api/sign-in',
    '/api/sign-up',
    '/api/sign-out',
    '/api/callback',
    '/api/error',
    '/api/ok',
    '/api/verify-email',
    '/api/forget-password',
    '/api/reset-password',
    '/api/change-password',
    '/api/update-user',
  ];
  for (const skip of skipPaths) {
    if (path.startsWith(skip)) {
      c.set('user', null);
      c.set('session', null);
      return next();
    }
  }

  try {
    const reqHeaders = new Headers(c.req.raw.headers);
    const queryToken = c.req.query('token');
    if (queryToken && !reqHeaders.has('authorization')) {
      reqHeaders.set('authorization', `Bearer ${queryToken}`);
    }
    const sessionData = await auth.api.getSession({ headers: reqHeaders });
    if (sessionData?.user) {
      c.set('user', sessionData.user as Variables['user']);
      c.set('session', sessionData.session as Variables['session']);
    } else {
      c.set('user', null);
      c.set('session', null);
    }
  } catch {
    c.set('user', null);
    c.set('session', null);
  }
  return next();
});

// Auth enforcement — returns 401 if no user for protected routes
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  const skipPaths = [
    '/api/health',
    '/api/docs',
    '/api/openapi.json',
    '/api/mcp/registry',
    '/api/metrics',
    '/api/get-session',
    '/api/sign-in',
    '/api/sign-up',
    '/api/sign-out',
    '/api/callback',
    '/api/error',
    '/api/ok',
    '/api/verify-email',
    '/api/forget-password',
    '/api/reset-password',
    '/api/change-password',
    '/api/update-user',
  ];
  for (const skip of skipPaths) {
    if (path.startsWith(skip)) {
      return next();
    }
  }
  if (!c.get('user')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return next();
});

// ─── Mount route modules ──────────────────────────────────────────────────

app
  .route('/api/templates', templateRoutes)
  .route('/api/workflow', workflowRoutes)
  .route('/api/execution', executionRoutes)
  .route('/api/copilot', copilotRoutes)
  .route('/api/mcp', mcpRoutes)
  .route('/api/mcp/registry', registryRoutes)
  .route('/api/analytics', analyticsRoutes)
  .route('/api/credits', creditsRoutes)
  .route('/api/credentials', credentialsRoutes);

export type AppType = typeof app;

// Expose metrics endpoint only in development/test environments, authenticated via METRICS_TOKEN
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/metrics', async (c) => {
    const token = c.req.query('token') || c.req.header('Authorization')?.replace('Bearer ', '');
    if (!METRICS_TOKEN || token !== METRICS_TOKEN) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    c.header('content-type', register.contentType);
    return c.text(await register.metrics());
  });
}

// ─── Error handling ─────────────────────────────────────────────────────────
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    logger.warn({ err }, 'HTTP exception');
    return err.getResponse();
  }
  logger.error({ err }, 'Unhandled exception');
  return c.json({ error: 'Internal Server Error' }, 500);
});

// ─── Root routes ────────────────────────────────────────────────────────────
app.get('/', (c) => c.text('QwenWeaver API', 200));

app.get('/api/health', async (c) => {
  try {
    const provider = getQueryProvider();
    await provider.healthCheck();
    return c.json({ status: 'ok', service: 'qwenweaver-api', database: 'connected' }, 200);
  } catch (err) {
    logger.error({ error: (err as Error).message }, 'Health check failed');
    return c.json({ status: 'error', service: 'qwenweaver-api', database: 'disconnected' }, 503);
  }
});

// ─── Start server ───────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 3001;

  const server = serve({ fetch: app.fetch, port }, async (info) => {
    logger.info({ port: info.port }, 'API started');
  });

  const gracefulShutdown = () => {
    logger.info('Shutting down server...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force close after 10s
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

export default app;
