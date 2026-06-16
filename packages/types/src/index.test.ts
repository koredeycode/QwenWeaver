import { describe, it, expect } from 'vitest';
import {
  NodePayload,
  WorkflowPayload,
  SSEEvent,
  ExecutionStatus,
  NodeType,
} from './graph.js';
import { MCPToolDefinition, MCPConnectionConfig } from './mcp.js';

describe('graph schemas', () => {
  it('validates a trigger node', () => {
    const result = NodePayload.safeParse({
      id: 'n1',
      type: 'trigger',
      position: { x: 0, y: 0 },
      data: {},
    });
    expect(result.success).toBe(true);
  });

  it('validates a complete workflow', () => {
    const result = WorkflowPayload.safeParse({
      id: 'wf-1',
      name: 'Test Workflow',
      nodes: [
        { id: 'n1', type: 'supervisor', position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid SSE event type', () => {
    const result = SSEEvent.safeParse({ event: 'unknown', data: {} });
    expect(result.success).toBe(false);
  });

  it('validates a complete SSE event', () => {
    const result = SSEEvent.safeParse({
      event: 'status_update',
      data: { nodeId: 'n1', status: 'running', timestamp: Date.now() },
    });
    expect(result.success).toBe(true);
  });

  it('validates execution status enum', () => {
    expect(ExecutionStatus.safeParse('running').success).toBe(true);
    expect(ExecutionStatus.safeParse('pending').success).toBe(true);
    expect(ExecutionStatus.safeParse('completed').success).toBe(true);
    expect(ExecutionStatus.safeParse('failed').success).toBe(true);
    expect(ExecutionStatus.safeParse('unknown').success).toBe(false);
  });

  it('validates node type enum', () => {
    expect(NodeType.safeParse('supervisor').success).toBe(true);
    expect(NodeType.safeParse('mcp_tool').success).toBe(true);
    expect(NodeType.safeParse('start').success).toBe(false);
  });
});

describe('mcp schemas', () => {
  it('validates a tool definition', () => {
    const result = MCPToolDefinition.safeParse({
      name: 'get_weather',
      description: 'Get weather for a city',
      inputSchema: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
      },
    });
    expect(result.success).toBe(true);
  });

  it('validates http connection config', () => {
    const result = MCPConnectionConfig.safeParse({
      transport: 'http',
      url: 'http://localhost:3000/mcp',
    });
    expect(result.success).toBe(true);
  });

  it('validates stdio connection config', () => {
    const result = MCPConnectionConfig.safeParse({
      transport: 'stdio',
      command: 'node',
      args: ['server.js'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty object', () => {
    const result = MCPConnectionConfig.safeParse({});
    expect(result.success).toBe(false);
  });
});
