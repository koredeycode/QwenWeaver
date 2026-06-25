import { getQueryProvider } from './provider.js';

import type { MCPAuthConfig } from '@qwenweaver/types';

export interface SavedMCPServerInput {
  name: string;
  description?: string | null;
  transport: 'http' | 'stdio' | 'sse';
  url?: string | null;
  command?: string | null;
  args?: string[] | null;
  iconUrl?: string | null;
  authConfig?: MCPAuthConfig | null;
  registryOrigin?: string | null;
  registryId?: string | null;
  registryMetadata?: unknown | null;
}

export interface SavedMCPServer {
  id: string;
  name: string;
  description?: string;
  transport: string;
  url?: string;
  command?: string;
  args?: string[];
  iconUrl?: string;
  authConfig?: MCPAuthConfig;
  registryOrigin?: string;
  registryId?: string;
  registryMetadata?: unknown;
  createdAt: string;
}

export async function saveMcpServer(
  id: string,
  userId: string,
  input: SavedMCPServerInput,
): Promise<SavedMCPServer> {
  return getQueryProvider().saveMcpServer(id, userId, input);
}

export async function getMcpServers(userId: string): Promise<SavedMCPServer[]> {
  return getQueryProvider().getMcpServers(userId);
}

export async function deleteMcpServer(id: string, userId: string): Promise<boolean> {
  return getQueryProvider().deleteMcpServer(id, userId);
}
