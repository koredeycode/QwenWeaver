import { z } from 'zod';

export const NodeType = z.enum([
  'trigger',
  'agent',
  'supervisor',
  'mcp_tool',
  'logic',
  'input_trigger',
  'file_trigger',
  'debate_arena',
]);

export const BusMessageType = z.enum([
  'output',
  'error',
  'status',
  'tool_call',
  'tool_result',
  'conversation',
]);
export type BusMessageType = z.infer<typeof BusMessageType>;

export const BusMessage = z.object({
  id: z.string(),
  executionId: z.string(),
  topic: z.string(),
  sourceNodeId: z.string(),
  messageType: BusMessageType,
  payload: z.unknown(),
  contentType: z.string().optional(),
  round: z.number().int().optional(),
  timestamp: z.number(),
});
export type BusMessage = z.infer<typeof BusMessage>;
export type NodeType = z.infer<typeof NodeType>;

export const OutputFormat = z.enum([
  'markdown',
  'html',
  'json',
  'csv',
  'xml',
  'yaml',
  'text',
  'code',
  'image',
  'audio',
  'video',
]);
export type OutputFormat = z.infer<typeof OutputFormat>;

export const OutputPartType = z.enum(['text', 'image', 'audio', 'video', 'file']);
export type OutputPartType = z.infer<typeof OutputPartType>;

export const OutputPart = z.object({
  type: OutputPartType,
  contentType: z.string(),
  value: z.string(),
});
export type OutputPart = z.infer<typeof OutputPart>;

export const DebateArenaMode = z.enum(['debate', 'negotiation', 'consensus']);
export type DebateArenaMode = z.infer<typeof DebateArenaMode>;

export const DebateArenaOutputFormat = z.enum(['verdict', 'transcript', 'score']);
export type DebateArenaOutputFormat = z.infer<typeof DebateArenaOutputFormat>;

export const DebateArenaConfig = z.object({
  mode: DebateArenaMode.optional().default('debate'),
  maxRounds: z.number().int().min(1).max(20).optional().default(3),
  hasArbitrator: z.boolean().optional().default(false),
  arbitratorModel: z.string().optional(),
  scoringCriteria: z.string().optional(),
  outputFormat: DebateArenaOutputFormat.optional().default('verdict'),
});
export type DebateArenaConfig = z.infer<typeof DebateArenaConfig>;

export const NodeData = z.object({
  label: z.string().optional(),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  thinkingBudget: z.number().optional(),
  mcpServerUrl: z.string().optional(),
  mcpServerId: z.string().optional(),
  mcpUserServerId: z.string().optional(),
  mcpSupportedAuthTypes: z.array(z.string()).optional(),
  iconUrl: z.string().optional(),
  mcpAuthConfig: z
    .object({
      type: z.enum(['none', 'api_key', 'bearer', 'basic']).optional(),
      credentialId: z.string().optional(),
      apiKey: z.string().optional(),
      token: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
  enableThinking: z.boolean().optional(),
  outputFormat: OutputFormat.optional(),
  workerType: z.string().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  imageUrl: z.string().optional(),
  _executionStatus: z.string().optional(),
  _output: z.string().optional(),
  _outputUrl: z.string().optional(),
  _edgeActive: z.boolean().optional(),
  _revisionFeedback: z.string().optional(),
  debateArenaConfig: DebateArenaConfig.optional(),
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

export const EdgeSubscription = z.object({
  conversationMode: z.boolean().optional(),
  maxRounds: z.number().int().min(1).max(50).optional(),
});
export type EdgeSubscription = z.infer<typeof EdgeSubscription>;

export const EdgePayload = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string().optional(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  data: z
    .object({
      subscription: EdgeSubscription.optional(),
    })
    .optional(),
});
export type EdgePayload = z.infer<typeof EdgePayload>;

export const CopilotHistoryEntrySchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  thinking: z.string().optional(),
  textAfterProposal: z.string().optional(),
  proposal: z
    .object({
      id: z.string(),
      actions: z.array(z.any()),
      status: z.enum(['pending', 'approved', 'rejected']).optional(),
    })
    .optional(),
});

export const WorkflowPayloadBase = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  nodes: z.array(NodePayload),
  edges: z.array(EdgePayload),
  copilotHistory: z.array(CopilotHistoryEntrySchema).optional(),
});

export const WorkflowPayload = WorkflowPayloadBase.refine(
  (data) => {
    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));
    const incomingToolEdges = new Map<string, number>();
    for (const edge of data.edges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      if (!sourceNode || !targetNode) continue;

      if (sourceNode.type === 'mcp_tool' && targetNode.type === 'mcp_tool') {
        return false;
      }

      if (
        targetNode.type === 'mcp_tool' &&
        sourceNode.type !== 'agent' &&
        sourceNode.type !== 'supervisor'
      ) {
        return false;
      }

      if (
        sourceNode.type === 'mcp_tool' &&
        targetNode.type !== 'agent' &&
        targetNode.type !== 'supervisor'
      ) {
        return false;
      }

      if (targetNode.type === 'mcp_tool') {
        incomingToolEdges.set(edge.target, (incomingToolEdges.get(edge.target) || 0) + 1);
      }
    }

    for (const [toolId, count] of incomingToolEdges) {
      if (count > 1) return false;
    }

    return true;
  },
  {
    message:
      'Invalid connections: tools must connect to/from agents/supervisors only, and each tool can have at most one incoming connection',
    path: ['edges'],
  },
);
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
  outputs: z.array(OutputPart).optional(),
  toolCalls: z.array(z.unknown()).optional(),
  toolResults: z.array(z.unknown()).optional(),
  reasoning: z.string().optional(),
  finalOutput: z.unknown().optional(),
});
export type AgentLogOutput = z.infer<typeof AgentLogOutput>;

export const SSEEventType = z.enum([
  'token',
  'thinking',
  'status_update',
  'edge_active',
  'complete',
  'error',
  'ping',
  'workspace_write',
  'bus_message',
  'message',
  'debate_round',
  'debate_verdict',
]);
export type SSEEventType = z.infer<typeof SSEEventType>;

export const SSEEvent = z.object({
  event: SSEEventType,
  data: z.unknown(),
});
export type SSEEvent = z.infer<typeof SSEEvent>;

export type GraphAction =
  | {
      type: 'add_node';
      payload: {
        type: string;
        id?: string;
        position?: { x: number; y: number };
        data?: any;
      };
    }
  | {
      type: 'add_nodes';
      payload: Array<{
        type: string;
        id?: string;
        position?: { x: number; y: number };
        data?: any;
      }>;
    }
  | {
      type: 'delete_node';
      payload: { id: string };
    }
  | {
      type: 'delete_nodes';
      payload: string[];
    }
  | {
      type: 'update_node';
      payload: {
        id: string;
        data: any;
      };
    }
  | {
      type: 'update_nodes';
      payload: Array<{
        id: string;
        data: any;
      }>;
    }
  | {
      type: 'add_edge';
      payload: {
        id?: string;
        source: string;
        target: string;
        sourceHandle?: string;
        targetHandle?: string;
      };
    }
  | {
      type: 'add_edges';
      payload: Array<{
        id?: string;
        source: string;
        target: string;
        sourceHandle?: string;
        targetHandle?: string;
      }>;
    }
  | {
      type: 'delete_edge';
      payload: { id: string };
    }
  | {
      type: 'delete_edges';
      payload: string[];
    };

export interface CopilotHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  proposal?: {
    id: string;
    actions: GraphAction[];
    status?: 'pending' | 'approved' | 'rejected';
  };
}
