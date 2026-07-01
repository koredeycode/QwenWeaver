import { z } from 'zod';

export const WorkspaceEntryType = z.enum(['text', 'json', 'file_ref', 'image_ref', 'audio_ref']);
export type WorkspaceEntryType = z.infer<typeof WorkspaceEntryType>;

export const WorkspaceEntry = z.object({
  id: z.string(),
  executionId: z.string(),
  nodeId: z.string(),
  key: z.string(),
  value: z.unknown(),
  valueType: WorkspaceEntryType.default('text'),
  fileUrl: z.string().optional(),
  round: z.number().default(0),
  createdAt: z.string(),
});
export type WorkspaceEntry = z.infer<typeof WorkspaceEntry>;

export const WriteWorkspaceRequest = z.object({
  key: z.string().min(1).max(256),
  value: z.unknown(),
  valueType: WorkspaceEntryType.optional().default('text'),
  fileUrl: z.string().optional(),
});
export type WriteWorkspaceRequest = z.infer<typeof WriteWorkspaceRequest>;
