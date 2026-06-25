import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the MCP client module
vi.mock('@qwenweaver/mcp-client', () => ({
  createMCPClient: vi.fn(),
}));

// Must import after mocking
const { createMCPClient } = await import('@qwenweaver/mcp-client');
const { discoverMCPTools, callMCPTool } = await import('../engine/mcp-bridge.js');

function createMockClient(tools: Array<{ name: string; description?: string; inputSchema?: unknown }> = []) {
  return {
    listTools: vi.fn().mockResolvedValue({ tools }),
    callTool: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'result' }] }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe('mcp-bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when node has no mcpServerUrl', async () => {
    const node = {
      id: 'n1',
      type: 'mcp_tool' as const,
      position: { x: 0, y: 0 },
      data: {},
    };

    await expect(discoverMCPTools(node)).rejects.toThrow('No MCP server URL configured on node');
  });

  it('discovers tools from an MCP server', async () => {
    const mockTools = [
      { name: 'read_file', description: 'Read a file', inputSchema: { type: 'object' } },
      { name: 'write_file', description: 'Write a file', inputSchema: { type: 'object' } },
    ];
    const mockClient = createMockClient(mockTools);
    vi.mocked(createMCPClient).mockResolvedValue(mockClient as any);

    const node = {
      id: 'n1',
      type: 'mcp_tool' as const,
      position: { x: 0, y: 0 },
      data: { mcpServerUrl: 'http://localhost:8080' },
    };

    const tools = await discoverMCPTools(node);

    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('read_file');
    expect(tools[1].name).toBe('write_file');
  });

  it('throws on discovery failure', async () => {
    vi.mocked(createMCPClient).mockRejectedValue(new Error('Connection refused'));

    const node = {
      id: 'n1',
      type: 'mcp_tool' as const,
      position: { x: 0, y: 0 },
      data: { mcpServerUrl: 'http://unreachable:8080' },
    };

    await expect(discoverMCPTools(node)).rejects.toThrow('Connection refused');
  });

  it('calls an MCP tool successfully', async () => {
    const mockClient = createMockClient([{ name: 'test_tool' }]);
    vi.mocked(createMCPClient).mockResolvedValue(mockClient as any);

    // First discover to populate the pool
    const node = {
      id: 'n1',
      type: 'mcp_tool' as const,
      position: { x: 0, y: 0 },
      data: { mcpServerUrl: 'http://localhost:9090' },
    };
    await discoverMCPTools(node);

    const result = await callMCPTool('http://localhost:9090', 'test_tool', { key: 'value' });

    expect(mockClient.callTool).toHaveBeenCalledWith({
      name: 'test_tool',
      arguments: { key: 'value' },
    });
    expect(result).toBeDefined();
  });

  it('throws on callMCPTool failure', async () => {
    vi.mocked(createMCPClient).mockRejectedValue(new Error('Connection failed'));

    await expect(
      callMCPTool('http://unreachable:9090', 'test_tool', {}),
    ).rejects.toThrow();
  });

  it('handles tools with missing descriptions and schemas gracefully', async () => {
    const mockTools = [
      { name: 'bare_tool' },
    ];
    const mockClient = createMockClient(mockTools);
    vi.mocked(createMCPClient).mockResolvedValue(mockClient as any);

    const node = {
      id: 'n1',
      type: 'mcp_tool' as const,
      position: { x: 0, y: 0 },
      data: { mcpServerUrl: 'http://localhost:7070' },
    };

    const tools = await discoverMCPTools(node);

    expect(tools).toHaveLength(1);
    expect(tools[0].description).toBe('');
    expect(tools[0].inputSchema).toEqual({});
  });
});
