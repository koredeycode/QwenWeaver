import { z } from 'zod';

export const MCPToolDefinition = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.unknown(),
});
export type MCPToolDefinition = z.infer<typeof MCPToolDefinition>;

export const MCPIcon = z.object({
  src: z.string().url(),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']).optional(),
  sizes: z.array(z.string()).optional(),
  theme: z.enum(['light', 'dark']).optional(),
});
export type MCPIcon = z.infer<typeof MCPIcon>;

export const MCPConnectionConfig = z.object({
  transport: z.enum(['http', 'stdio', 'sse']),
  url: z.string().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
});
export type MCPConnectionConfig = z.infer<typeof MCPConnectionConfig>;

export const MCPAuthConfig = z.object({
  type: z.enum(['none', 'api_key', 'bearer', 'basic']).optional(),
  apiKey: z.string().optional(),
  token: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});
export type MCPAuthConfig = z.infer<typeof MCPAuthConfig>;

export const MCPToolCall = z.object({
  toolName: z.string(),
  arguments: z.record(z.unknown()),
});
export type MCPToolCall = z.infer<typeof MCPToolCall>;

export const MCPToolResult = z.object({
  toolName: z.string(),
  result: z.unknown(),
  isError: z.boolean().optional(),
});
export type MCPToolResult = z.infer<typeof MCPToolResult>;

export const RegistryServer = z.object({
  registryId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  iconUrl: z.string().optional(),
  icons: z.array(MCPIcon).optional(),
  transports: z.array(z.string()),
  homepage: z.string().optional(),
  authRequired: z.boolean().default(false),
});
export type RegistryServer = z.infer<typeof RegistryServer>;
