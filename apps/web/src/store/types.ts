import { 
  Node, 
  Edge, 
  OnNodesChange, 
  OnEdgesChange, 
  OnConnect 
} from '@xyflow/react';
import type { 
  NodeType, 
  NodeData, 
  ExecutionMetrics
} from '@qwenweaver/types';

export interface CopilotMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface AuthSlice {
  token: string | null;
  user: { id: string; email: string } | null;
  mockMode: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setMockMode: (mock: boolean) => void;
}

export interface GraphSlice {
  nodes: Node<any>[];
  edges: Edge<any>[];
  selectedNodeId: string | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: NodeType, position?: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  selectNode: (id: string | null) => void;
  clearGraph: () => void;
  loadTemplate: (templateName: string) => void;
  rearrangeGraph: () => void;
}

export interface ExecutionSlice {
  activeExecutionId: string | null;
  executionStatus: 'idle' | 'pending' | 'running' | 'completed' | 'failed';
  nodeStatuses: Record<string, 'pending' | 'running' | 'completed' | 'failed'>;
  nodeOutputs: Record<string, string>;
  activeEdges: Set<string>;
  metrics: ExecutionMetrics | null;
  runWorkflow: () => Promise<void>;
  stopWorkflow: () => void;
}

export interface CopilotSlice {
  copilotMessages: CopilotMessage[];
  isCopilotTyping: boolean;
  sendCopilotMessage: (message: string) => Promise<void>;
}

// Combined Global Zustand State type
export type StoreState = AuthSlice & GraphSlice & ExecutionSlice & CopilotSlice;
