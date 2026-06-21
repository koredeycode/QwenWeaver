import type { SavedMCPServerInput, SavedMCPServer } from './mcp.js';
import type { WorkflowPayload, ExecutionMetrics, AgentLogInput, AgentLogOutput } from '@qwenweaver/types';
import { getConnection } from '../index.js';
import { sqliteProvider } from './sqlite-provider.js';
import { pgProvider } from './pg-provider.js';
import { mysqlProvider } from './mysql-provider.js';

export interface QueryProvider {
  // Auth
  createUser(id: string, email: string, passwordHash: string): Promise<void>;
  getUserByEmail(email: string): Promise<{ id: string; email: string; passwordHash: string; createdAt: Date | string | number } | null>;
  getUserById(id: string): Promise<{ id: string; email: string; createdAt: Date | string | number } | null>;

  saveMcpServer(id: string, userId: string, input: SavedMCPServerInput): Promise<SavedMCPServer>;
  getMcpServers(userId: string): Promise<SavedMCPServer[]>;
  deleteMcpServer(id: string, userId: string): Promise<boolean>;

  saveWorkflow(userId: string, workflow: WorkflowPayload): Promise<string>;

  createExecution(executionId: string, workflowId: string, userId: string): Promise<void>;
  updateExecution(executionId: string, status: string, metrics?: ExecutionMetrics): Promise<void>;
  saveAgentLog(
    executionId: string,
    nodeId: string,
    status: string,
    input: AgentLogInput | null,
    output: AgentLogOutput | null,
    tokensUsed?: number,
    error?: string | null
  ): Promise<void>;
  getExecution(executionId: string): Promise<{
    id: string;
    workflowId: string;
    userId: string;
    status: string;
    metrics?: ExecutionMetrics;
    startedAt: string;
    completedAt?: string;
  } | null>;
  getAgentLogs(executionId: string): Promise<Array<{
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
  }>>;
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
