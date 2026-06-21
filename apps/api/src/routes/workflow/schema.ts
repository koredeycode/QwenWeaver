import { z } from 'zod';
import { WorkflowPayload } from '@qwenweaver/types';

export const ExecuteBody = z.object({
  name: z.string(),
  description: z.string().optional(),
  nodes: WorkflowPayload.shape.nodes,
  edges: WorkflowPayload.shape.edges,
});
