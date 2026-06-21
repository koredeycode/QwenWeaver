import type { WorkflowPayload } from '@qwenweaver/types';
import { getQueryProvider } from './provider.js';

export async function saveWorkflow(userId: string, workflow: WorkflowPayload): Promise<string> {
  return getQueryProvider().saveWorkflow(userId, workflow);
}
