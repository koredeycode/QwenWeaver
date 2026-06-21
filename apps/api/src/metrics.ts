import { Registry, collectDefaultMetrics, Histogram, Counter, Gauge } from 'prom-client';

export const register = new Registry();
collectDefaultMetrics({ register });

export const http_request_duration_ms = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

export const executions_total = new Counter({
  name: 'executions_total',
  help: 'Total number of executions',
  labelNames: ['status'],
  registers: [register],
});

export const llm_tokens_total = new Counter({
  name: 'llm_tokens_total',
  help: 'Total LLM tokens used',
  labelNames: ['model', 'node_type'],
  registers: [register],
});

export const active_sse_connections = new Gauge({
  name: 'active_sse_connections',
  help: 'Number of active SSE connections',
  registers: [register],
});

export const mcp_pool_connections = new Gauge({
  name: 'mcp_pool_connections',
  help: 'Number of active MCP pool connections',
  registers: [register],
});

export const agent_duration_ms = new Histogram({
  name: 'agent_duration_ms',
  help: 'Duration of agent executions in ms',
  labelNames: ['node_type'],
  registers: [register],
});
