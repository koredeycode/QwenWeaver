import type { SavedMCPServerInput, SavedMCPServer } from './mcp.js';
import type {
  MCPAuthConfig,
  CredentialInput,
  CredentialUpdate,
  CredentialResponse,
} from '@qwenweaver/types';
import type { TemplateRow, TemplateReviewRow, TemplateCategoryRow } from './templates.js';
import type {
  WorkflowPayload,
  ExecutionMetrics,
  AgentLogInput,
  AgentLogOutput,
  CreditTransaction,
  CopilotHistoryMessage,
} from '@qwenweaver/types';
import { getConnection } from '../index.js';
import { sqliteProvider } from './sqlite-provider.js';
import { pgProvider } from './pg-provider.js';
import { mysqlProvider } from './mysql-provider.js';

export interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  createdAt: number | Date | string;
  nodeCounts?: Record<string, number>;
}

export interface WorkflowDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: number | Date | string;
  nodesEdges: WorkflowPayload;
  copilotHistory?: CopilotHistoryMessage[] | null;
}

export interface ExecutionSummaryRow {
  id: string;
  workflowId: string;
  workflowName: string | null;
  status: string;
  metrics?: ExecutionMetrics;
  startedAt: string;
  completedAt?: string;
}

export interface QueryProvider {
  // Auth
  createUser(id: string, email: string, passwordHash: string): Promise<void>;
  getUserByEmail(email: string): Promise<{
    id: string;
    email: string;
    passwordHash: string;
    createdAt: Date | string | number;
  } | null>;
  getUserById(
    id: string,
  ): Promise<{ id: string; email: string; createdAt: Date | string | number } | null>;

  saveMcpServer(id: string, userId: string, input: SavedMCPServerInput): Promise<SavedMCPServer>;
  getMcpServers(userId: string): Promise<SavedMCPServer[]>;
  deleteMcpServer(id: string, userId: string): Promise<boolean>;
  /** Update auth config for a user-owned server */
  updateMcpServerAuth(
    id: string,
    userId: string,
    authConfig: MCPAuthConfig,
  ): Promise<SavedMCPServer>;

  // Credentials
  listCredentials(userId: string): Promise<CredentialResponse[]>;
  getCredential(id: string, userId: string): Promise<CredentialResponse | null>;
  createCredential(userId: string, input: CredentialInput): Promise<CredentialResponse>;
  updateCredential(
    id: string,
    userId: string,
    input: CredentialUpdate,
  ): Promise<CredentialResponse>;
  deleteCredential(id: string, userId: string): Promise<boolean>;

  saveWorkflow(userId: string, workflow: WorkflowPayload): Promise<string>;
  updateWorkflow(workflowId: string, userId: string, workflow: WorkflowPayload): Promise<string>;
  listUserWorkflows(userId: string): Promise<WorkflowRow[]>;
  getWorkflow(id: string, userId: string): Promise<WorkflowDetail | null>;
  deleteWorkflow(id: string, userId: string): Promise<boolean>;
  updateCopilotHistory(
    workflowId: string,
    userId: string,
    history: CopilotHistoryMessage[],
  ): Promise<void>;

  createExecution(executionId: string, workflowId: string, userId: string): Promise<void>;
  updateExecution(executionId: string, status: string, metrics?: ExecutionMetrics): Promise<void>;
  saveAgentLog(
    executionId: string,
    nodeId: string,
    status: string,
    input: AgentLogInput | null,
    output: AgentLogOutput | null,
    tokensUsed?: number,
    error?: string | null,
  ): Promise<void>;
  listUserExecutions(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<ExecutionSummaryRow[]>;

  getExecution(executionId: string): Promise<{
    id: string;
    workflowId: string;
    userId: string;
    status: string;
    metrics?: ExecutionMetrics;
    startedAt: string;
    completedAt?: string;
  } | null>;
  getAgentLogs(executionId: string): Promise<
    Array<{
      id: string;
      executionId: string;
      nodeId: string;
      status: string;
      input?: any;
      output?: any;
      tokensUsed?: number;
      startedAt: string;
      completedAt?: string;
      error?: string;
    }>
  >;

  getAnalyticsSummary(
    userId: string,
    recentLimit?: number,
  ): Promise<{
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    avgSpeedup: number | null;
    totalTokens: number;
    avgLatencyMs: number | null;
    runsByModel: Record<string, number>;
    recentRuns: Array<{
      id: string;
      status: string;
      startedAt: string;
      totalTokens?: number;
    }>;
  }>;

  // Templates
  listTemplates(options?: {
    categoryId?: string;
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<TemplateRow[]>;
  countTemplates(options?: {
    categoryId?: string;
    featured?: boolean;
    search?: string;
  }): Promise<number>;
  getTemplate(id: string): Promise<TemplateRow | null>;
  createTemplate(
    id: string,
    data: {
      name: string;
      description?: string | null;
      workflowData: WorkflowPayload;
      categoryId?: string | null;
      tags?: string[] | null;
      authorId: string;
      thumbnail?: string | null;
    },
  ): Promise<void>;
  deleteTemplate(id: string): Promise<boolean>;
  incrementTemplateDownloads(id: string): Promise<void>;
  listTemplateReviews(templateId: string): Promise<TemplateReviewRow[]>;
  upsertTemplateReview(
    id: string,
    templateId: string,
    userId: string,
    rating: number,
    review?: string | null,
  ): Promise<void>;
  listTemplateCategories(): Promise<TemplateCategoryRow[]>;

  /** Runs a lightweight query to verify the database connection is alive. */
  healthCheck(): Promise<void>;

  // Credits
  getUserCredits(
    userId: string,
  ): Promise<{ balance: number; lifetimeEarned: number; lifetimeSpent: number }>;
  grantCredits(
    userId: string,
    amount: number,
    type: string,
    description?: string,
    executionId?: string,
  ): Promise<void>;
  deductCredits(
    userId: string,
    amount: number,
    description?: string,
    executionId?: string,
  ): Promise<void>;
  listCreditTransactions(userId: string, limit?: number): Promise<CreditTransaction[]>;

  // Workflow limits
  countUserWorkflows(userId: string): Promise<number>;
}

export function getQueryProvider(): QueryProvider {
  const { dialect } = getConnection();
  if (dialect === 'sqlite') {
    return sqliteProvider;
  }
  if (dialect === 'mysql') {
    return mysqlProvider;
  }
  return pgProvider;
}
