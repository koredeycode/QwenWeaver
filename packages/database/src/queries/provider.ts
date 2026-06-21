import type { SavedMCPServerInput, SavedMCPServer } from './mcp.js';
import type { WorkflowPayload, ExecutionMetrics, AgentLogInput, AgentLogOutput } from '@qwenweaver/types';
import { getConnection } from '../index.js';
import { sqliteProvider } from './sqlite-provider.js';
import { pgProvider } from './pg-provider.js';

export interface QueryProvider {
  saveMcpServer(id: string, input: SavedMCPServerInput): Promise<SavedMCPServer>;
  getMcpServers(): Promise<SavedMCPServer[]>;
  deleteMcpServer(id: string): Promise<boolean>;

  saveWorkflow(workflow: WorkflowPayload): Promise<string>;

  createExecution(executionId: string, workflowId: string): Promise<void>;
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
  return pgProvider;
}
