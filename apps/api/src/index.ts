import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { bodyLimit } from 'hono/body-limit';
import { serve } from '@hono/node-server';
import { HTTPException } from 'hono/http-exception';
import { swaggerUI } from '@hono/swagger-ui';
import { logger, requestLogger } from './logger.js';
import { serveStatic } from '@hono/node-server/serve-static';
import { workflowRoutes } from './routes/workflow/index.js';
import { executionRoutes } from './routes/execution/index.js';
import { copilotRoutes } from './routes/copilot/index.js';
import { mcpRoutes } from './routes/mcp/index.js';
import { authRoutes } from './routes/auth/index.js';
import { analyticsRoutes } from './routes/analytics/index.js';
import { register } from './metrics.js';
import { getQueryProvider } from '@qwenweaver/database';
import { rateLimiter } from './middleware/rate-limiter.js';
import { JWT_SECRET, CORS_ORIGINS, METRICS_TOKEN, RATE_LIMIT } from './config.js';

export type Variables = {
  requestId: string;
  jwtPayload: {
    sub: string;
    email: string;
    exp: number;
  };
};

const app = new OpenAPIHono<{ Variables: Variables }>();

// Lock down CORS to configured origins instead of wildcard
app.use('/api/*', cors({
  origin: CORS_ORIGINS,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 600,
}));
app.use('/public/*', serveStatic({ root: './' }));
app.use('*', requestLogger());

app.use(
  '/api/*',
  bodyLimit({
    maxSize: 5 * 1024 * 1024, // 5MB
    onError: (c) => {
      return c.json({ error: 'Payload too large' }, 413);
    },
  })
);

// Rate limiting on auth endpoints (brute-force protection)
app.use('/api/auth/*', rateLimiter('auth', RATE_LIMIT.auth));

// Rate limiting on copilot endpoint (expensive LLM calls)
app.use('/api/copilot/*', rateLimiter('copilot', RATE_LIMIT.copilot));

// General API rate limiting
app.use('/api/*', rateLimiter('api', RATE_LIMIT.api));

// Auth middleware using centralized JWT_SECRET from config
app.use(
  '/api/*',
  (c, next) => {
    // Exclude health, docs, and auth from JWT validation
    const path = c.req.path;
    if (
      path.startsWith('/api/health') ||
      path.startsWith('/api/docs') ||
      path.startsWith('/api/openapi.json') ||
      path.startsWith('/api/auth') ||
      path.startsWith('/api/metrics')
    ) {
      return next();
    }
    const jwtMiddleware = jwt({
      secret: JWT_SECRET,
      alg: 'HS256',
    });
    return jwtMiddleware(c, next);
  }
);

// ─── Mount route modules ────────────────────────────────────────────────────

app.route('/api/auth', authRoutes);
app.route('/api/workflow', workflowRoutes);
app.route('/api/execution', executionRoutes);
app.route('/api/copilot', copilotRoutes);
app.route('/api/mcp', mcpRoutes);
app.route('/api/analytics', analyticsRoutes);

// Expose metrics endpoint only in development/test environments
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/metrics', async (c) => {
    c.header('content-type', register.contentType);
    return c.text(await register.metrics());
  });
}

// ─── OpenAPI spec ───────────────────────────────────────────────────────────
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    logger.warn({ err }, 'HTTP exception');
    return err.getResponse();
  }
  logger.error({ err }, 'Unhandled exception');
  return c.json({ error: 'Internal Server Error', details: err.message }, 500);
});

app.doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'QwenWeaver API',
    version: '0.1.0',
    description: 'Visual multi-agent orchestration platform — backend API',
  },
  servers: [{ url: 'http://localhost:3001' }],
});

app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }));

// ─── Root routes ────────────────────────────────────────────────────────────

const rootRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['System'],
  summary: 'Root',
  responses: {
    200: { content: { 'text/plain': { schema: z.string() } }, description: 'OK' }
  }
});

app.openapi(rootRoute, (c) => c.text('QwenWeaver API', 200));

// Use QueryProvider.healthCheck() instead of unsafe (db as any) casts
const healthRoute = createRoute({
  method: 'get',
  path: '/api/health',
  tags: ['System'],
  summary: 'Health check',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            status: z.string(),
            service: z.string(),
            database: z.string()
          })
        }
      },
      description: 'OK'
    },
    503: {
      content: {
        'application/json': {
          schema: z.object({
            status: z.string(),
            service: z.string(),
            database: z.string()
          })
        }
      },
      description: 'Service Unavailable'
    }
  }
});

app.openapi(healthRoute, async (c) => {
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

  const server = serve({ fetch: app.fetch, port }, (info) => {
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
export type AppType = typeof app;
