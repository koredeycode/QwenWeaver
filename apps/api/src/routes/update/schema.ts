import { z } from '@hono/zod-openapi';

export const UpdateInfoSchema = z.object({
  installMode: z.enum(['npm', 'docker', 'git', 'image']),
  currentVersion: z.string().nullable(),
  remoteVersion: z.string().nullable(),
  status: z.enum(['current', 'available', 'unknown']),
  error: z.string().nullable(),
  updateLogs: z.array(z.string()),
  updateRunning: z.boolean(),
  updateFinishedAt: z.string().nullable(),
});

export const UpdateTriggerResponseSchema = z.object({
  status: z.string(),
  logs: z.array(z.string()),
});

export const SystemHealthSchema = z.object({
  node: z.string(),
  database: z.object({ type: z.string(), reachable: z.boolean() }),
  docker: z.object({ available: z.boolean(), version: z.string().nullable() }),
  installMode: z.string(),
  version: z.string().nullable(),
});
