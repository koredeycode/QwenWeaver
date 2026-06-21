// This file previously contained an unused ExecuteBody schema.
// The route definition in index.ts uses WorkflowPayload directly,
// and the handler now validates via WorkflowPayload.safeParse.
// This file is kept as a placeholder for any future workflow-specific schemas.

import { z } from 'zod';

/** Zod schema for workflow execution status responses */
export const ExecutionStatusResponse = z.object({
  id: z.string(),
  status: z.string(),
  metrics: z.record(z.string(), z.unknown()).optional(),
});
