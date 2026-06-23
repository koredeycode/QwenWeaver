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
import type { TemplateSummary, TemplateDetail, TemplateCategory, TemplateReview } from '../lib/templates-client.js';
import type { TourStep } from '../tour/types.js';

export interface CopilotMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface AuthSlice {
  token: string | null;
  refreshToken: string | null;
  user: { id: string; email: string } | null;
  credits: { balance: number; lifetimeEarned: number; lifetimeSpent: number; lowBalance: boolean } | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  refreshAccessToken: () => Promise<boolean>;
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
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: NodeType, position?: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  selectNode: (id: string | null) => void;
  setWorkflowMeta: (name: string, description: string) => void;
  maximizedNodeId: string | null;
  setMaximizedNodeId: (id: string | null) => void;
  clearGraph: () => void;
  loadTemplate: (templateName: string) => void;
  loadWorkflow: (workflowId: string) => void;
  loadUnsavedWorkflow: (nodes: Node<any>[], edges: Edge<any>[], name: string, description?: string) => void;
  rearrangeGraph: () => void;
  importWorkflow: (workflowData: { nodes: Node<any>[]; edges: Edge<any>[] }, merge: boolean) => boolean;
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

export interface TemplateSlice {
  templates: TemplateSummary[];
  templatesTotal: number;
  templatesLoading: boolean;
  selectedTemplate: TemplateDetail | null;
  selectedTemplateReviews: TemplateReview[];
  categories: TemplateCategory[];
  categoriesLoading: boolean;
  fetchTemplates: (params?: { categoryId?: string; featured?: boolean; search?: string; limit?: number; offset?: number }) => Promise<void>;
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

// Combined Global Zustand State type
export type StoreState = AuthSlice & GraphSlice & ExecutionSlice & CopilotSlice & TemplateSlice & TourSlice;
