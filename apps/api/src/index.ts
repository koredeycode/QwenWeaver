import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { bodyLimit } from 'hono/body-limit';
import { serve } from '@hono/node-server';
import { HTTPException } from 'hono/http-exception';
import { logger, requestLogger } from './logger.js';
import { serveStatic } from '@hono/node-server/serve-static';
import { workflowRoutes } from './routes/workflow/index.js';
import { executionRoutes } from './routes/execution/index.js';
import { copilotRoutes } from './routes/copilot/index.js';
import { mcpRoutes, registryRoutes } from './routes/mcp/index.js';
import { authRoutes } from './routes/auth/index.js';
import { analyticsRoutes } from './routes/analytics/index.js';
import { creditsRoutes } from './routes/credits/index.js';
import { credentialsRoutes } from './routes/credentials/index.js';
import { templateRoutes } from './routes/templates/index.js';

import { register } from './metrics.js';
import { getQueryProvider } from '@qwenweaver/database';
import { rateLimiter } from './middleware/rate-limiter.js';
import { JWT_SECRET, CORS_ORIGINS, RATE_LIMIT, METRICS_TOKEN } from './config.js';

export type Variables = {
  requestId: string;
  jwtPayload: {
    sub: string;
    email: string;
    exp: number;
  };
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
    maxAge: 600,
  }),
);
app.use('/public/*', serveStatic({ root: './public' }));
app.use('*', requestLogger());

app.use(
  '/api/*',
  bodyLimit({
    maxSize: 5 * 1024 * 1024, // 5MB
    onError: (c) => {
      return c.json({ error: 'Payload too large' }, 413);
    },
  }),
);

// Rate limiting on auth endpoints (brute-force protection)
app.use('/api/auth/*', rateLimiter('auth', RATE_LIMIT.auth));

// Rate limiting on copilot endpoint (expensive LLM calls)
app.use('/api/copilot/*', rateLimiter('copilot', RATE_LIMIT.copilot));

// General API rate limiting
app.use('/api/*', rateLimiter('api', RATE_LIMIT.api));

// Public template routes — mounted before JWT middleware (removed; now in routes chain below)

// Auth middleware using centralized JWT_SECRET from config
app.use('/api/*', (c, next) => {
  // Exclude health, docs, and auth from JWT validation
  const path = c.req.path;
  if (
    path.startsWith('/api/health') ||
    path.startsWith('/api/docs') ||
    path.startsWith('/api/openapi.json') ||
    path.startsWith('/api/auth') ||
    path === '/api/mcp/registry/search' ||
    path.startsWith('/api/metrics')
  ) {
    return next();
  }

  // For SSE streams, EventSource doesn't support Authorization headers, so we allow tokens in the query string
  if (path.endsWith('/stream')) {
    const queryToken = c.req.query('token');
    if (queryToken) {
      c.req.raw.headers.set('Authorization', `Bearer ${queryToken}`);
    }
  }

  const jwtMiddleware = jwt({
    secret: JWT_SECRET,
    alg: 'HS256',
  });
  return jwtMiddleware(c, async () => {
    await next();
  });
});

// ─── Mount route modules ───
// Split into two chains to avoid TS depth limit with 11 MergeSchemaPath entries.
// Both chains are plain Hono, so types preserve properly in each.

const routes = app
  .route('/api/templates', templateRoutes)
  .route('/api/auth', authRoutes)
  .route('/api/workflow', workflowRoutes)
  .route('/api/execution', executionRoutes)
  .route('/api/copilot', copilotRoutes)
  .route('/api/mcp', mcpRoutes);

// Also mount remaining routes on app for runtime
app
  .route('/api/mcp/registry', registryRoutes)
  .route('/api/analytics', analyticsRoutes)
  .route('/api/credits', creditsRoutes)
  .route('/api/credentials', credentialsRoutes);

// Separate chain for type export — plain Hono preserves route types
const altRoutes = new Hono<{ Variables: Variables }>()
  .route('/api/mcp/registry', registryRoutes)
  .route('/api/analytics', analyticsRoutes)
  .route('/api/credits', creditsRoutes)
  .route('/api/credentials', credentialsRoutes);

export type AppType = typeof routes;
export type AppType2 = typeof altRoutes;

// Expose metrics endpoint only in development/test environments, authenticated via METRICS_TOKEN
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/metrics', async (c) => {
    const token = c.req.query('token') || c.req.header('Authorization')?.replace('Bearer ', '');
    if (METRICS_TOKEN && token !== METRICS_TOKEN) {
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
  return c.json({ error: 'Internal Server Error', details: err.message }, 500);
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
