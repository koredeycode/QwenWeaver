import { z } from '@hono/zod-openapi';

export const SetupStatusSchema = z.object({
  complete: z.boolean(),
  ownerExists: z.boolean(),
  runtimeConfig: z.object({
    dbPath: z.string(),
  }).optional(),
});

export const OwnerSetupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RuntimeSetupSchema = z.object({
  dashscopeApiKey: z.string().optional(),
  databaseUrl: z.string().optional(),
});

export const SetupPayloadSchema = z.object({
  owner: OwnerSetupSchema.optional(),
  runtime: RuntimeSetupSchema.optional(),
});

export const ReconfigurePayloadSchema = z.object({
  dashscopeApiKey: z.string().optional(),
  databaseUrl: z.string().optional(),
  port: z.coerce.number().optional(),
  corsOrigins: z.string().optional(),
  publicUrl: z.string().optional(),
});

export const SetupResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
