import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { swaggerUI } from '@hono/swagger-ui';
import { logger, requestLogger } from './logger.js';

export type Variables = {
  requestId: string;
};

const app = new Hono<{ Variables: Variables }>();

app.use('/api/*', cors());
app.use('*', requestLogger());

const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'QwenWeaver API',
    version: '0.1.0',
    description: 'Visual multi-agent orchestration platform — backend API',
  },
  servers: [{ url: 'http://localhost:3001' }],
  paths: {
    '/': {
      get: {
        summary: 'Root',
        description: 'Returns a plain-text greeting.',
        responses: { 200: { description: 'OK', content: { 'text/plain': { schema: { type: 'string' } } } } },
      },
    },
    '/api/health': {
      get: {
        summary: 'Health check',
        description: 'Returns the API health status.',
        responses: {
          200: {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, service: { type: 'string' } } } } },
          },
        },
      },
    },
  },
};

app.get('/api/openapi.json', (c) => c.json(openApiSpec));
app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }));

app.get('/', (c) => c.text('QwenWeaver API'));
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'qwenweaver-api' }));

const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, (info) => {
  logger.info({ port: info.port }, 'API started');
});

export default app;
