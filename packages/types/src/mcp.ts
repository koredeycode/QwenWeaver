import { z } from 'zod';

export const MCPToolDefinition = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.unknown(),
});
export type MCPToolDefinition = z.infer<typeof MCPToolDefinition>;

export const MCPConnectionConfig = z.object({
  transport: z.enum(['http', 'stdio']),
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
