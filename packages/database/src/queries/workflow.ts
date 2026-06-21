import type { WorkflowPayload } from '@qwenweaver/types';
import { getQueryProvider } from './provider.js';

export async function saveWorkflow(workflow: WorkflowPayload): Promise<string> {
  return getQueryProvider().saveWorkflow(workflow);
}
