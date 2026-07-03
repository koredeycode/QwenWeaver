import { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect } from '@xyflow/react';
import type {
  NodeType,
  NodeData,
  ExecutionMetrics,
  OutputPart,
  GraphAction,
  CopilotHistoryMessage,
  WorkspaceEntry,
  BusMessage,
} from '@qwenweaver/types';
import type {
  TemplateSummary,
  TemplateDetail,
  TemplateCategory,
  TemplateReview,
} from '../lib/templates-client.js';
import type { TourStep } from '../tour/types.js';

export interface CopilotMessage {
  role: 'user' | 'assistant';
  text?: string;
  thinking?: string;
  proposal?: {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    actions: GraphAction[];
  };
  textAfterProposal?: string;
}

export interface CanvasSnapshot {
  nodes: Node<NodeData>[];
  edges: Edge[];
  workflowName: string;
  workflowDescription: string;
  timestamp: number;
  workflowId?: string | null;
}

export interface AuthSlice {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
  } | null;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
  } | null;
  credits: {
    balance: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
    lowBalance: boolean;
  } | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  fetchCredits: () => Promise<void>;
  logout: () => void;
}

export interface GraphSlice {
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  workflowId: string | null;
  workflowName: string;
  workflowDescription: string;
  isDirty: boolean;
  markClean: () => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (
    type: NodeType,
    position?: { x: number; y: number },
    additionalData?: Record<string, unknown>,
  ) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  setNodeData: (id: string, data: Record<string, unknown>) => void;
  setEdgeData: (id: string, data: Record<string, unknown>) => void;
  selectNode: (id: string | null) => void;
  setWorkflowMeta: (name: string, description: string) => void;
  maximizedNodeId: string | null;
  setMaximizedNodeId: (id: string | null) => void;
  mcpConfigDialogNodeId: string | null;
  setMcpConfigDialogNodeId: (id: string | null) => void;
  clearGraph: () => void;
  loadTemplate: (templateName: string) => void;
  loadWorkflow: (workflowId: string) => void;
  loadUnsavedWorkflow: (
    nodes: Node<any>[],
    edges: Edge<any>[],
    name: string,
    description?: string,
  ) => void;
  rearrangeGraph: () => void;
  importWorkflow: (
    workflowData: { nodes: Node<any>[]; edges: Edge<any>[] },
    merge: boolean,
  ) => boolean;
  applyActions: (actions: GraphAction[]) => void;
}

export interface ExecutionSummary {
  id: string;
  workflowId: string;
  workflowName: string | null;
  status: string;
  metrics?: ExecutionMetrics | null;
  startedAt: string;
  completedAt?: string;
}

export interface ExecutionSlice {
  activeExecutionId: string | null;
  executionStatus: 'idle' | 'pending' | 'running' | 'completed' | 'failed';
  nodeStatuses: Record<string, 'pending' | 'running' | 'completed' | 'failed'>;
  nodeOutputs: Record<string, string>;
  nodeThinking: Record<string, string>;
  nodeOutputUrls: Record<string, string>;
  nodeOutputParts: Record<string, OutputPart[]>;
  activeEdges: Set<string>;
  metrics: ExecutionMetrics | null;
  abortController: AbortController | null;
  executionHistory: ExecutionSummary[];
  historyLoading: boolean;
  workspaceEntries: WorkspaceEntry[];
  workspaceLoading: boolean;
  busMessages: BusMessage[];
  channelMessages: Array<{
    fromNodeId: string;
    toNodeId: string;
    content: string;
    round: number;
    channelId: string;
    timestamp: number;
  }>;
  debateRounds: Array<{
    arenaId: string;
    round: number;
    statements: Array<{ participantId: string; content: string }>;
    timestamp: number;
  }>;
  debateVerdicts: Array<{
    arenaId: string;
    verdict: string;
    scores?: Record<string, number>;
    rationale?: string;
    timestamp: number;
  }>;
  runWorkflow: () => Promise<void>;
  stopWorkflow: () => void;
  fetchExecutionHistory: (limit?: number, offset?: number) => Promise<void>;
  fetchWorkspaceEntries: (executionId: string) => Promise<void>;
}

export interface CopilotSlice {
  copilotMessages: CopilotMessage[];
  isCopilotTyping: boolean;
  copilotModel: string;
  setCopilotModel: (model: string) => void;
  sendCopilotMessage: (message: string) => Promise<void>;
  updateProposalStatus: (messageIndex: number, status: 'approved' | 'rejected') => void;
  loadCopilotHistory: (history: CopilotHistoryMessage[]) => void;
}

export interface TemplateSlice {
  templates: TemplateSummary[];
  templatesTotal: number;
  templatesLoading: boolean;
  selectedTemplate: TemplateDetail | null;
  selectedTemplateReviews: TemplateReview[];
  categories: TemplateCategory[];
  categoriesLoading: boolean;
  fetchTemplates: (params?: {
    categoryId?: string;
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) => Promise<void>;
  fetchTemplate: (id: string) => Promise<void>;
  fetchReviews: (id: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  forkTemplate: (id: string) => Promise<boolean>;
}

export interface TourSlice {
  isTourActive: boolean;
  currentStepIndex: number;
  steps: TourStep[];
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
}

export interface HistorySlice {
  past: CanvasSnapshot[];
  future: CanvasSnapshot[];
  canUndo: boolean;
  canRedo: boolean;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

// Combined Global Zustand State type
export type StoreState = AuthSlice &
  GraphSlice &
  ExecutionSlice &
  CopilotSlice &
  TemplateSlice &
  TourSlice &
  HistorySlice;
