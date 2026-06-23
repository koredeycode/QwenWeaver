import { StateCreator } from 'zustand';
import type { 
  NodeTiming,
} from '@qwenweaver/types';
import { StoreState, ExecutionSlice } from './types.js';
import { toast } from 'sonner';

let mockTimer: ReturnType<typeof setTimeout> | null = null;
let mockAborted = false;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    const id = setTimeout(() => {
      if (!mockAborted) resolve();
    }, ms);
    mockTimer = id;
  });
}

export const createExecutionSlice: StateCreator<StoreState, [], [], ExecutionSlice> = (set, get) => ({
  activeExecutionId: null,
  executionStatus: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  activeEdges: new Set(),
  metrics: null,

  runWorkflow: async () => {
    mockAborted = false;

    // Reset previous execution state
    set({
      executionStatus: 'pending',
      nodeStatuses: {},
      nodeOutputs: {},
      activeEdges: new Set(),
      metrics: null,
    });

    const { nodes, edges } = get();
    if (nodes.length === 0) {
      set({ executionStatus: 'idle' });
      return;
    }

    set({ executionStatus: 'running' });

    // Build adjacency and in-degree for Kahn's algorithm
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    for (const n of nodes) {
      inDegree[n.id] = 0;
      adj[n.id] = [];
    }
    for (const e of edges) {
      adj[e.source]?.push(e.target);
      if (inDegree[e.target] !== undefined) inDegree[e.target]++;
    }

    // Topological batches
    const batches: string[][] = [];
    const tempDegree = { ...inDegree };
    let queue = Object.keys(tempDegree).filter((id) => tempDegree[id] === 0);
    while (queue.length > 0) {
      batches.push(queue);
      const next: string[] = [];
      for (const id of queue) {
        for (const t of adj[id] || []) {
          tempDegree[t]--;
          if (tempDegree[t] === 0) next.push(t);
        }
      }
      queue = next;
    }

    // Mock metrics tracking
    const allNodeTimings: NodeTiming[] = [];
    const startTime = Date.now();

    // Simulate batch-by-batch execution
    for (let b = 0; b < batches.length; b++) {
      if (mockAborted) break;

      // Activate incoming edges for this batch
      for (const nodeId of batches[b]) {
        const incomingEdge = edges.find((e) => e.target === nodeId);
        if (incomingEdge) {
          set((s) => {
            const a = new Set(s.activeEdges);
            a.add(incomingEdge.id);
            return { activeEdges: a };
          });
          setTimeout(() => {
            set((s) => {
              const a = new Set(s.activeEdges);
              a.delete(incomingEdge.id);
              return { activeEdges: a };
            });
          }, 1200);
        }
      }

      // Run all nodes in this batch in parallel (simulated)
      await Promise.all(
        batches[b].map(async (nodeId) => {
          if (mockAborted) return;
          const node = nodes.find((n) => n.id === nodeId);
          const nodeStart = Date.now();

          // status: running
          set((s) => ({
            nodeStatuses: { ...s.nodeStatuses, [nodeId]: 'running' },
          }));

          // Simulate thinking time per node (1.5-3s)
          const thinkTime = 1500 + Math.random() * 1500;
          const tokenCount = Math.floor(50 + Math.random() * 200);

          // Stream tokens gradually
          const tokens = `[${node?.type || 'node'} output for "${node?.data?.label || nodeId}"]\n${' '.repeat(20)}Processing...\n${' '.repeat(20)}Analyzing inputs...\n`;
          const chunkSize = Math.max(1, Math.floor(tokens.length / 5));
          for (let i = 0; i < tokens.length; i += chunkSize) {
            if (mockAborted) return;
            await delay(Math.max(1, Math.floor(thinkTime / (tokens.length / chunkSize))));
            set((s) => ({
              nodeOutputs: {
                ...s.nodeOutputs,
                [nodeId]: (s.nodeOutputs[nodeId] || '') + tokens.slice(i, i + chunkSize),
              },
            }));
          }

          if (mockAborted) return;

          // status: completed
          set((s) => ({
            nodeStatuses: { ...s.nodeStatuses, [nodeId]: 'completed' },
          }));

          allNodeTimings.push({
            nodeId,
            status: 'completed',
            durationMs: Date.now() - nodeStart,
            tokensUsed: tokenCount,
          });
        })
      );
    }

    if (mockAborted) return;

    const totalLatency = Date.now() - startTime;
    const totalTokens = allNodeTimings.reduce((s, t) => s + (t.tokensUsed || 0), 0);
    const sequentialTime = allNodeTimings.reduce((s, t) => s + t.durationMs, 0);
    const speedupS = totalLatency > 0 ? Math.round((sequentialTime / totalLatency) * 100) / 100 : 1;

    set({
      executionStatus: 'completed',
      metrics: {
        speedupS,
        totalTokens,
        totalLatencyMs: totalLatency,
        nodeTimings: allNodeTimings,
      },
    });

    toast.success(`Workflow completed! Tokens used: ${totalTokens}`);
  },

  stopWorkflow: () => {
    mockAborted = true;
    if (mockTimer) {
      clearTimeout(mockTimer);
      mockTimer = null;
    }
    set({ executionStatus: 'idle', activeExecutionId: null });
  },
});
