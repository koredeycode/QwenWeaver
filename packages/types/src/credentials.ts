import { z } from 'zod';

export const CredentialType = z.enum([
  'dashscope_api_key',
  'mcp_bearer_token',
  'mcp_api_key',
  'mcp_basic_auth',
  'custom',
]);

export type CredentialType = z.infer<typeof CredentialType>;

export const Credential = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  type: CredentialType,
  description: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Credential = z.infer<typeof Credential>;

export const CredentialInput = z.object({
  name: z.string().min(1).max(100),
  type: CredentialType,
  value: z.string().min(1),
  description: z.string().max(500).optional(),
});

export type CredentialInput = z.infer<typeof CredentialInput>;

export const CredentialUpdate = z.object({
  name: z.string().min(1).max(100).optional(),
  value: z.string().min(1).optional(),
  description: z.string().max(500).optional(),
});

export type CredentialUpdate = z.infer<typeof CredentialUpdate>;

export const CredentialResponse = Credential.extend({
  value: z.string().optional(),
});

export type CredentialResponse = z.infer<typeof CredentialResponse>;
