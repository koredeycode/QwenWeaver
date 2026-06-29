import { client, authHeaders, withRefresh } from '../lib/api-client.js';

export interface WorkflowPayload {
  name: string;
  description?: string;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    type?: string;
  }>;
}

export async function createWorkflow(
  payload: WorkflowPayload,
): Promise<{ workflowId: string } | null> {
  try {
    const res = await withRefresh(() =>
      client.api.workflow.$post({ json: payload as any }, { headers: authHeaders() }),
    );
    if (!res.ok) {
      if (res.status === 403) {
        const errBody: Record<string, unknown> = await res.json().catch(() => ({}));
        throw new Error(String(errBody.error || 'Workflow limit reached'));
      }
      throw new Error('Failed to save workflow');
    }
    return await res.json();
  } catch (err) {
    console.error('workflow-service: createWorkflow failed', err);
    return null;
  }
}

export async function updateWorkflow(
  workflowId: string,
  payload: WorkflowPayload & { id: string },
): Promise<boolean> {
  try {
    const res = await withRefresh(() =>
      (client.api.workflow.detail[':workflowId'] as any).$put(
        { param: { workflowId }, json: payload as any },
        { headers: authHeaders() },
      ),
    );
    return res.ok;
  } catch (err) {
    console.error('workflow-service: updateWorkflow failed', err);
    return false;
  }
}

export async function loadWorkflowFromApi(workflowId: string): Promise<{
  id: string;
  name: string;
  description: string | null;
  nodesEdges: {
    nodes: any[];
    edges: any[];
  };
  copilotHistory?: any[] | null;
} | null> {
  try {
    const res = await client.api.workflow.detail[':workflowId'].$get(
      { param: { workflowId } },
      { headers: authHeaders() },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
