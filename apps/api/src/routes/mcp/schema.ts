import { z } from 'zod';

export const DiscoverToolsBody = z.object({
  serverId: z.string().min(1),
  serverUrl: z.string().optional(),
  auth: z.object({
    type: z.enum(['none', 'api_key', 'bearer', 'basic']),
    token: z.string().optional(),
    apiKey: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  }).optional(),
});

export const SaveServerBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  transport: z.enum(['http', 'stdio', 'sse']),
  url: z.string().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
});

export const AdoptRegistryBody = z.object({
  registryId: z.string().min(1),
  authConfig: z.object({
    type: z.enum(['none', 'api_key', 'bearer', 'basic']).optional(),
    apiKey: z.string().optional(),
    token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  }).optional(),
});

export const UpdateServerAuthBody = z.object({
  authConfig: z.object({
    type: z.enum(['none', 'api_key', 'bearer', 'basic']),
    apiKey: z.string().optional(),
    token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  }),
});

export const RegistryServerResponse = z.object({
  registryId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  iconUrl: z.string().optional(),
  transports: z.array(z.string()),
  authRequired: z.boolean().default(false),
  homepage: z.string().optional(),
});
