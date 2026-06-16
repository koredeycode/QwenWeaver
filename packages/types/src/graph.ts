import { z } from 'zod';

export const NodeType = z.enum(['trigger', 'agent', 'supervisor', 'mcp_tool', 'logic']);
export type NodeType = z.infer<typeof NodeType>;

export const NodeData = z.object({
  label: z.string().optional(),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  thinkingBudget: z.number().optional(),
  mcpServerUrl: z.string().optional(),
  mcpServerId: z.string().optional(),
  enableThinking: z.boolean().optional(),
});
export type NodeData = z.infer<typeof NodeData>;

export const Position = z.object({
  x: z.number(),
  y: z.number(),
});

export const NodePayload = z.object({
  id: z.string(),
  type: NodeType,
  position: Position,
  data: NodeData,
});
export type NodePayload = z.infer<typeof NodePayload>;

export const EdgePayload = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});
export type EdgePayload = z.infer<typeof EdgePayload>;

export const WorkflowPayload = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  nodes: z.array(NodePayload),
  edges: z.array(EdgePayload),
});
export type WorkflowPayload = z.infer<typeof WorkflowPayload>;

export const ExecutionStatus = z.enum(['pending', 'running', 'completed', 'failed']);
export type ExecutionStatus = z.infer<typeof ExecutionStatus>;

export const NodeTiming = z.object({
  nodeId: z.string(),
  status: z.string(),
  durationMs: z.number(),
  tokensUsed: z.number().optional(),
});
export type NodeTiming = z.infer<typeof NodeTiming>;

export const ExecutionMetrics = z.object({
  speedupS: z.number().optional(),
  totalTokens: z.number().optional(),
  totalLatencyMs: z.number().optional(),
  parallelEfficiency: z.number().optional(),
  nodeTimings: z.array(NodeTiming).optional(),
});
export type ExecutionMetrics = z.infer<typeof ExecutionMetrics>;

export const ExecutionPayload = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: ExecutionStatus,
  metrics: ExecutionMetrics.optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export const AgentLogInput = z.object({
  prompt: z.string().optional(),
  systemPrompt: z.string().optional(),
  tools: z.array(z.unknown()).optional(),
  upstreamOutputs: z.record(z.unknown()).optional(),
  context: z.unknown().optional(),
});
export type AgentLogInput = z.infer<typeof AgentLogInput>;

export const AgentLogOutput = z.object({
  text: z.string().optional(),
  toolCalls: z.array(z.unknown()).optional(),
  toolResults: z.array(z.unknown()).optional(),
  reasoning: z.string().optional(),
  finalOutput: z.unknown().optional(),
});
export type AgentLogOutput = z.infer<typeof AgentLogOutput>;

export const SSEEventType = z.enum(['token', 'status_update', 'edge_active', 'complete', 'error']);
export type SSEEventType = z.infer<typeof SSEEventType>;

export const SSEEvent = z.object({
  event: SSEEventType,
  data: z.unknown(),
});
export type SSEEvent = z.infer<typeof SSEEvent>;
