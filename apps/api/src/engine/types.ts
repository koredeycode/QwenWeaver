import type { NodePayload, ExecutionMetrics, SSEEventType, OutputPart } from '@qwenweaver/types';

// ─── Agent execution result ────────────────────────────────────────────────────

export interface AgentResult {
  nodeId: string;
  outputs: OutputPart[];
  text?: string;
  reasoning?: string;
  toolCalls?: unknown[];
  toolResults?: unknown[];
  tokensUsed: number;
  durationMs: number;
  status: 'completed' | 'failed';
  error?: string;
}

// ─── Upstream context passed to each agent ──────────────────────────────────────

export type UpstreamOutputs = Map<string, AgentResult>;

// ─── SSE stream emitter interface ───────────────────────────────────────────────

export interface SSEPayloadMap {
  token: { nodeId: string; chunk: string };
  status_update: { nodeId: string; status: string; timestamp: number };
  edge_active: { sourceId: string; targetId: string; timestamp: number };
  complete: { executionId: string; metrics: ExecutionMetrics; timestamp: number };
  error: { message: string; nodeId?: string; timestamp: number };
}

export interface StreamEmitter {
  emit<K extends SSEEventType>(event: K, data: SSEPayloadMap[K]): Promise<void>;
  isClosed(): boolean;
}

// ─── Executor options ───────────────────────────────────────────────────────────

export interface ExecutionOptions {
  /** Max negotiation rounds before supervisor escalation (default: 3) */
  maxNegotiationRounds: number;
  /** Whether to persist agent logs to DB during execution */
  persistLogs: boolean;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export const DEFAULT_EXECUTION_OPTIONS: ExecutionOptions = {
  maxNegotiationRounds: 3,
  persistLogs: true,
};

// ─── Execution result ───────────────────────────────────────────────────────────

export interface ExecutionResult {
  executionId: string;
  status: 'completed' | 'failed';
  metrics: ExecutionMetrics;
  outputs: UpstreamOutputs;
  error?: string;
}

// ─── DAG compilation result ─────────────────────────────────────────────────────

export interface DagCompilationResult {
  /** Ordered batches of nodes for parallel execution */
  batches: NodePayload[][];
  /** Whether a cycle was detected in the graph */
  hasCycle: boolean;
  /** Node IDs involved in the cycle (only present when hasCycle is true) */
  cycleNodeIds?: string[];
}
