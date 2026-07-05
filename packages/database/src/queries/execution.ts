import type {
  ExecutionMetrics,
  AgentLogInput,
  AgentLogOutput,
  WorkflowPayload,
} from '@qwenweaver/types';
import { getQueryProvider } from './provider.js';

export async function createExecution(
  executionId: string,
  workflowId: string,
  userId: string,
  graphSnapshot?: WorkflowPayload,
): Promise<void> {
  return getQueryProvider().createExecution(executionId, workflowId, userId, graphSnapshot);
}

export async function updateExecution(
  executionId: string,
  status: string,
  metrics?: ExecutionMetrics,
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
  error?: string | null,
): Promise<void> {
  return getQueryProvider().saveAgentLog(
    executionId,
    nodeId,
    status,
    input,
    output,
    tokensUsed,
    error,
  );
}

export async function getExecution(executionId: string) {
  return getQueryProvider().getExecution(executionId);
}

export async function getAgentLogs(executionId: string) {
  return getQueryProvider().getAgentLogs(executionId);
}

export async function writeExecutionMessage(data: {
  id: string;
  executionId: string;
  topic: string;
  sourceNodeId: string;
  messageType: string;
  payload: unknown;
  contentType?: string | null;
  round: number;
  createdAt: number;
}): Promise<void> {
  return getQueryProvider().writeExecutionMessage(data);
}

export async function listExecutionMessages(executionId: string, topic?: string) {
  return getQueryProvider().listExecutionMessages(executionId, topic);
}

export async function clearExecutionMessages(executionId: string): Promise<void> {
  return getQueryProvider().clearExecutionMessages(executionId);
}
