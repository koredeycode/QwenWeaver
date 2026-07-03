import type {
  NodePayload,
  ExecutionMetrics,
  SSEEventType,
  OutputPart,
  BusMessage,
} from '@qwenweaver/types';

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

// ─── SSE stream emitter interface ───────────────────────────────────────────────

export interface SSEPayloadMap {
  token: { nodeId: string; chunk: string };
  thinking: { nodeId: string; chunk: string };
  status_update: {
    nodeId: string;
    status: string;
    timestamp: number;
    outputUrl?: string;
    outputParts?: OutputPart[];
  };
  edge_active: { sourceId: string; targetId: string; timestamp: number };
  complete: { executionId: string; metrics: ExecutionMetrics; timestamp: number };
  error: { message: string; nodeId?: string; timestamp: number };
  ping: { data: string };
  workspace_write: { nodeId: string; key: string; valueType: string; timestamp: number };
  bus_message: {
    message: BusMessage;
  };
  message: {
    fromNodeId: string;
    toNodeId: string;
    content: string;
    round: number;
    channelId: string;
    timestamp: number;
  };
  debate_round: {
    arenaId: string;
    round: number;
    statements: Array<{ participantId: string; content: string }>;
    timestamp: number;
  };
  debate_verdict: {
    arenaId: string;
    verdict: string;
    scores?: Record<string, number>;
    rationale?: string;
    timestamp: number;
  };
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
  outputs: Map<string, AgentResult>;
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
