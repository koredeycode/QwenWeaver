import { describe, it, expect, vi } from 'vitest';
import { executeWorkflow } from '../engine/executor.js';
import type { WorkflowPayload } from '@qwenweaver/types';
import type { StreamEmitter, SSEPayloadMap } from '../engine/types.js';
import type { SSEEventType } from '@qwenweaver/types';

// Mock the agent runner so we don't make real AI calls
vi.mock('../engine/agent-runner.js', () => ({
  runAgent: vi.fn(async (node: any) => {
    const text = `Output from ${node.id}`;
    return {
      nodeId: node.id,
      outputs: [
        {
          type: 'text' as const,
          contentType: 'text/plain',
          value: text,
        },
      ],
      text,
      tokensUsed: 100,
      durationMs: 50,
      status: 'completed' as const,
    };
  }),
}));

function createMockEmitter(): StreamEmitter & { events: Array<{ event: string; data: unknown }> } {
  const events: Array<{ event: string; data: unknown }> = [];
  return {
    events,
    emit: async (event: SSEEventType, data: SSEPayloadMap[typeof event]) => {
      events.push({ event, data });
    },
    isClosed: () => false,
  };
}

function createWorkflow(
  nodes: Array<{ id: string; type?: string }>,
  edges: Array<{ source: string; target: string }>,
): WorkflowPayload {
  return {
    name: 'Test Workflow',
    nodes: nodes.map((n) => ({
      id: n.id,
      type: (n.type ?? 'agent') as any,
      position: { x: 0, y: 0 },
      data: {},
    })),
    edges: edges.map((e) => ({
      id: `${e.source}->${e.target}`,
      source: e.source,
      target: e.target,
    })),
  };
}

describe('executor', () => {
  it('executes a linear chain in correct order', async () => {
    const workflow = createWorkflow(
      [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
      ],
    );

    const emitter = createMockEmitter();
    const result = await executeWorkflow(workflow, 'exec-1', emitter, {
      maxNegotiationRounds: 3,
      persistLogs: false,
    });

    expect(result.status).toBe('completed');
    expect(result.outputs.size).toBe(3);

    // Check that status_update events were emitted for all nodes
    const statusEvents = emitter.events.filter((e) => e.event === 'status_update');
    expect(statusEvents.length).toBeGreaterThanOrEqual(6); // running + completed for each

    // Check that complete event was emitted
    const completeEvents = emitter.events.filter((e) => e.event === 'complete');
    expect(completeEvents).toHaveLength(1);
  });

  it('executes a diamond graph with parallel middle layer', async () => {
    const workflow = createWorkflow(
      [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }],
      [
        { source: 'A', target: 'B' },
        { source: 'A', target: 'C' },
        { source: 'B', target: 'D' },
        { source: 'C', target: 'D' },
      ],
    );

    const emitter = createMockEmitter();
    const result = await executeWorkflow(workflow, 'exec-2', emitter, {
      maxNegotiationRounds: 3,
      persistLogs: false,
    });

    expect(result.status).toBe('completed');
    expect(result.outputs.size).toBe(4);
  });

  it('fails on cyclic graph', async () => {
    const workflow = createWorkflow(
      [{ id: 'A' }, { id: 'B' }],
      [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'A' },
      ],
    );

    const emitter = createMockEmitter();
    const result = await executeWorkflow(workflow, 'exec-3', emitter, {
      maxNegotiationRounds: 3,
      persistLogs: false,
    });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('Cycle detected');

    // Check that error event was emitted
    const errorEvents = emitter.events.filter((e) => e.event === 'error');
    expect(errorEvents).toHaveLength(1);
  });

  it('computes speedup metrics', async () => {
    const workflow = createWorkflow(
      [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      [
        { source: 'A', target: 'B' },
        { source: 'A', target: 'C' },
      ],
    );

    const emitter = createMockEmitter();
    const result = await executeWorkflow(workflow, 'exec-4', emitter, {
      maxNegotiationRounds: 3,
      persistLogs: false,
    });

    expect(result.metrics).toBeDefined();
    expect(result.metrics.speedupS).toBeDefined();
    expect(typeof result.metrics.speedupS).toBe('number');
    expect(result.metrics.totalTokens).toBeGreaterThan(0);
    expect(result.metrics.totalLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.metrics.parallelEfficiency).toBeDefined();
    expect(result.metrics.nodeTimings).toHaveLength(3);
  });

  it('emits edge_active events when data flows between nodes', async () => {
    const workflow = createWorkflow([{ id: 'A' }, { id: 'B' }], [{ source: 'A', target: 'B' }]);

    const emitter = createMockEmitter();
    await executeWorkflow(workflow, 'exec-5', emitter, {
      maxNegotiationRounds: 3,
      persistLogs: false,
    });

    const edgeEvents = emitter.events.filter((e) => e.event === 'edge_active');
    expect(edgeEvents.length).toBeGreaterThanOrEqual(1);
    expect((edgeEvents[0].data as any).sourceId).toBe('A');
    expect((edgeEvents[0].data as any).targetId).toBe('B');
  });

  it('handles an empty workflow', async () => {
    const workflow = createWorkflow([], []);

    const emitter = createMockEmitter();
    const result = await executeWorkflow(workflow, 'exec-6', emitter, {
      maxNegotiationRounds: 3,
      persistLogs: false,
    });

    expect(result.status).toBe('completed');
    expect(result.outputs.size).toBe(0);
  });

  it('supports supervisor rejection and negotiation backtrack loops', async () => {
    const { runAgent } = await import('../engine/agent-runner.js');

    let roundCount = 0;
    vi.mocked(runAgent).mockImplementation(async (node: any) => {
      if (node.type === 'supervisor') {
        if (roundCount === 0) {
          roundCount++;
          const text = '[REJECT] The worker output is incomplete. Please add more details.';
          return {
            nodeId: node.id,
            outputs: [
              {
                type: 'text' as const,
                contentType: 'text/plain',
                value: text,
              },
            ],
            text,
            tokensUsed: 150,
            durationMs: 60,
            status: 'completed' as const,
          };
        } else {
          const text = 'The worker revised output looks perfect. Accepted.';
          return {
            nodeId: node.id,
            outputs: [
              {
                type: 'text' as const,
                contentType: 'text/plain',
                value: text,
              },
            ],
            text,
            tokensUsed: 150,
            durationMs: 60,
            status: 'completed' as const,
          };
        }
      }
      const revisionFeedback = node.data?._revisionFeedback ?? '';
      const text = revisionFeedback.includes('[REVISION REQUESTED BY SUPERVISOR]')
        ? `Revised output from ${node.id}`
        : `Initial output from ${node.id}`;
      return {
        nodeId: node.id,
        outputs: [
          {
            type: 'text' as const,
            contentType: 'text/plain',
            value: text,
          },
        ],
        text,
        tokensUsed: 100,
        durationMs: 50,
        status: 'completed' as const,
      };
    });

    const workflow = createWorkflow(
      [
        { id: 'W', type: 'agent' },
        { id: 'S', type: 'supervisor' },
      ],
      [{ source: 'W', target: 'S' }],
    );

    const emitter = createMockEmitter();
    const result = await executeWorkflow(workflow, 'exec-negotiate', emitter, {
      maxNegotiationRounds: 3,
      persistLogs: false,
    });

    expect(result.status).toBe('completed');
    expect(result.outputs.get('W')?.text).toBe('Revised output from W');
    expect(result.outputs.get('S')?.text).toBe(
      'The worker revised output looks perfect. Accepted.',
    );

    const pendingEvents = emitter.events.filter(
      (e) => e.event === 'status_update' && (e.data as any).status === 'pending',
    );
    expect(pendingEvents.length).toBeGreaterThanOrEqual(2);

    vi.mocked(runAgent).mockImplementation(async (node: any) => {
      const text = `Output from ${node.id}`;
      return {
        nodeId: node.id,
        outputs: [
          {
            type: 'text' as const,
            contentType: 'text/plain',
            value: text,
          },
        ],
        text,
        tokensUsed: 100,
        durationMs: 50,
        status: 'completed' as const,
      };
    });
  });

  it('passes outputFormat node data options during execution', async () => {
    const { runAgent } = await import('../engine/agent-runner.js');
    const runAgentSpy = vi.mocked(runAgent);

    const workflow: WorkflowPayload = {
      name: 'Format Workflow',
      nodes: [
        {
          id: 'F',
          type: 'agent',
          position: { x: 0, y: 0 },
          data: {
            label: 'Generate details',
            outputFormat: 'json',
          },
        },
      ],
      edges: [],
    };

    const emitter = createMockEmitter();
    await executeWorkflow(workflow, 'exec-format', emitter, {
      maxNegotiationRounds: 1,
      persistLogs: false,
    });

    expect(runAgentSpy).toHaveBeenCalled();
    const calls = runAgentSpy.mock.calls;
    const lastCallNodeArg = calls[calls.length - 1][0];
    expect(lastCallNodeArg.data.outputFormat).toBe('json');
  });

  it('excludes conversation-mode edges from data-flow map', async () => {
    const { runAgent } = await import('../engine/agent-runner.js');
    const runAgentSpy = vi.mocked(runAgent);

    const workflow: WorkflowPayload = {
      name: 'Channel Test',
      nodes: [
        { id: 'A', type: 'agent', position: { x: 0, y: 0 }, data: {} },
        { id: 'B', type: 'agent', position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'A', target: 'B' },
        {
          id: 'e2',
          source: 'B',
          target: 'A',
          data: { subscription: { conversationMode: true, maxRounds: 5 } },
        },
      ],
    };

    const emitter = createMockEmitter();
    await executeWorkflow(workflow, 'exec-channel-filter', emitter, {
      maxNegotiationRounds: 1,
      persistLogs: false,
    });

    const calls = runAgentSpy.mock.calls;
    const agentACall = calls.find((c: any) => c[0].id === 'A');
    const agentBCall = calls.find((c: any) => c[0].id === 'B');
    // A should have no upstream bus messages (conversation edge excluded)
    if (agentACall) {
      expect(agentACall[1].length).toBe(0);
    }
    // B should have A as an upstream (data-flow edge included)
    if (agentBCall) {
      expect(agentBCall[1].some((m: any) => m.sourceNodeId === 'A')).toBe(true);
    }
  });
});
