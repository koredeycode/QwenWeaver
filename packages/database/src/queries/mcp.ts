import { getQueryProvider } from './provider.js';

export interface SavedMCPServerInput {
  name: string;
  description?: string | null;
  transport: 'http' | 'stdio';
  url?: string | null;
  command?: string | null;
  args?: string[] | null;
}

export interface SavedMCPServer {
  id: string;
  name: string;
  description?: string;
  transport: string;
  url?: string;
  command?: string;
  args?: string[];
  createdAt: string;
}

export async function saveMcpServer(id: string, userId: string, input: SavedMCPServerInput): Promise<SavedMCPServer> {
  return getQueryProvider().saveMcpServer(id, userId, input);
}

export async function getMcpServers(userId: string): Promise<SavedMCPServer[]> {
  return getQueryProvider().getMcpServers(userId);
}

export async function deleteMcpServer(id: string, userId: string): Promise<boolean> {
  return getQueryProvider().deleteMcpServer(id, userId);
}
