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

export async function saveMcpServer(id: string, input: SavedMCPServerInput): Promise<SavedMCPServer> {
  return getQueryProvider().saveMcpServer(id, input);
}

export async function getMcpServers(): Promise<SavedMCPServer[]> {
  return getQueryProvider().getMcpServers();
}

export async function deleteMcpServer(id: string): Promise<boolean> {
  return getQueryProvider().deleteMcpServer(id);
}
