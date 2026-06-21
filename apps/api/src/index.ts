import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { swaggerUI } from '@hono/swagger-ui';
import { logger, requestLogger } from './logger.js';
import { serveStatic } from '@hono/node-server/serve-static';
import { workflowRoutes } from './routes/workflow/index.js';
import { executionRoutes } from './routes/execution/index.js';
import { copilotRoutes } from './routes/copilot/index.js';
import { mcpRoutes } from './routes/mcp/index.js';

export type Variables = {
  requestId: string;
};

const app = new Hono<{ Variables: Variables }>();

app.use('/api/*', cors());
app.use('/public/*', serveStatic({ root: './' }));
app.use('*', requestLogger());

// ─── Mount route modules ────────────────────────────────────────────────────

app.route('/api/workflow', workflowRoutes);
app.route('/api/execution', executionRoutes);
app.route('/api/copilot', copilotRoutes);
app.route('/api/mcp', mcpRoutes);

// ─── OpenAPI spec ───────────────────────────────────────────────────────────

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
    '/api/workflow/execute': {
      post: {
        summary: 'Execute workflow',
        description: 'Submits a DAG workflow for parallel execution. Returns an execution ID for SSE streaming.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'nodes', 'edges'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  nodes: { type: 'array', items: { type: 'object' } },
                  edges: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Execution created', content: { 'application/json': { schema: { type: 'object', properties: { executionId: { type: 'string' }, status: { type: 'string' } } } } } },
        },
      },
    },
    '/api/workflow/{executionId}/stream': {
      get: {
        summary: 'Stream execution events',
        description: 'Opens an SSE connection to receive real-time execution telemetry (token, status_update, edge_active, complete, error).',
        parameters: [{ name: 'executionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'SSE stream', content: { 'text/event-stream': { schema: { type: 'string' } } } },
          404: { description: 'Execution not found' },
        },
      },
    },
    '/api/workflow/{executionId}': {
      get: {
        summary: 'Get execution status',
        description: 'Returns the current status and metrics of an execution.',
        parameters: [{ name: 'executionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Execution status', content: { 'application/json': { schema: { type: 'object' } } } },
          404: { description: 'Execution not found' },
        },
      },
    },
    '/api/copilot': {
      post: {
        summary: 'Interact with AI Copilot',
        description: 'Uses qwen-max to generate, modify, or explain a workflow graph.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['prompt'],
                properties: {
                  prompt: { type: 'string' },
                  canvasState: { type: 'object' },
                  mode: { type: 'string', enum: ['generate', 'modify'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Generated graph', content: { 'application/json': { schema: { type: 'object' } } } },
          500: { description: 'Generation failed' },
        },
      },
    },
    '/api/mcp/tools': {
      get: {
        summary: 'Discover MCP tools',
        description: 'Connects to an MCP server and returns the available tool definitions.',
        parameters: [{ name: 'url', in: 'query', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Discovered tools', content: { 'application/json': { schema: { type: 'object' } } } },
        },
      },
    },
    '/api/mcp/servers': {
      get: {
        summary: 'List MCP servers',
        description: 'Returns all saved MCP server configurations.',
        responses: { 200: { description: 'Server list' } },
      },
      post: {
        summary: 'Save MCP server',
        description: 'Saves an MCP server configuration.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'transport'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  transport: { type: 'string', enum: ['http', 'stdio'] },
                  url: { type: 'string' },
                  command: { type: 'string' },
                  args: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Server saved' } },
      },
    },
    '/api/execution/{executionId}': {
      get: {
        summary: 'Get execution details',
        description: 'Returns execution status and metadata.',
        parameters: [{ name: 'executionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Execution details' } },
      },
    },
    '/api/execution/{executionId}/logs': {
      get: {
        summary: 'Get agent logs',
        description: 'Returns agent-level logs for an execution run.',
        parameters: [{ name: 'executionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Agent logs' } },
      },
    },
  },
};

app.get('/api/openapi.json', (c) => c.json(openApiSpec));
app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }));

// ─── Root routes ────────────────────────────────────────────────────────────

app.get('/', (c) => c.text('QwenWeaver API'));
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'qwenweaver-api' }));

// ─── Start server ───────────────────────────────────────────────────────────

const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, (info) => {
  logger.info({ port: info.port }, 'API started');
});

export default app;
export type AppType = typeof app;
