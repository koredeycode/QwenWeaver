import type {
  ExecutionMetrics,
  AgentLogInput,
  AgentLogOutput,
} from '@qwenweaver/types';
import { getQueryProvider } from './provider.js';

export async function createExecution(executionId: string, workflowId: string, userId: string): Promise<void> {
  return getQueryProvider().createExecution(executionId, workflowId, userId);
}

export async function updateExecution(
  executionId: string,
  status: string,
  metrics?: ExecutionMetrics
): Promise<void> {
  return getQueryProvider().updateExecution(executionId, status, metrics);
}

export async function saveAgentLog(
  executionId: string,
  nodeId: string,
  status: string,
  input: AgentLogInput | null,
  output: AgentLogOutput | null,
  tokensUsed?: number,
  error?: string | null
): Promise<void> {
  return getQueryProvider().saveAgentLog(executionId, nodeId, status, input, output, tokensUsed, error);
}

export async function getExecution(executionId: string) {
  return getQueryProvider().getExecution(executionId);
}

export async function getAgentLogs(executionId: string) {
  return getQueryProvider().getAgentLogs(executionId);
}
