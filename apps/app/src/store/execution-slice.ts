import { StateCreator } from 'zustand';
import type { 
  NodeTiming,
} from '@qwenweaver/types';
import { StoreState, ExecutionSlice } from './types.js';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api-client.js';

let eventSource: EventSource | null = null;

export const createExecutionSlice: StateCreator<StoreState, [], [], ExecutionSlice> = (set, get) => ({
  activeExecutionId: null,
  executionStatus: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  activeEdges: new Set(),
  metrics: null,

  runWorkflow: async () => {
    // Reset previous execution state
    set({
      executionStatus: 'pending',
      nodeStatuses: {},
      nodeOutputs: {},
      activeEdges: new Set(),
      metrics: null
    });

    const { nodes, edges } = get();

    const payload = {
      id: crypto.randomUUID(),
      name: get().workflowName || 'Untitled Workflow',
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    };

    const res = await apiFetch('/api/workflow/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 402) {
      const data = await res.json();
      toast.error(`Insufficient credits. Balance: ${data.balance}, Required: ${data.required}.`);
      set({ executionStatus: 'idle' });
      return;
    }

    if (!res.ok) {
      toast.error('Failed to start execution');
      set({ executionStatus: 'idle' });
      return;
    }

    const { executionId } = await res.json();
    set({ activeExecutionId: executionId, executionStatus: 'running' });

    // Open SSE stream
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const token = localStorage.getItem('qw_token');
    const url = `${baseUrl}/api/workflow/${executionId}/stream?token=${token}`;

    eventSource = new EventSource(url);

    eventSource.addEventListener('status_update', (e) => {
      try {
        const { nodeId, status } = JSON.parse(e.data);
        set((state) => ({
          nodeStatuses: { ...state.nodeStatuses, [nodeId]: status },
        }));
      } catch { /* ignore parse errors */ }
    });

    eventSource.addEventListener('token', (e) => {
      try {
        const { nodeId, chunk } = JSON.parse(e.data);
        set((state) => ({
          nodeOutputs: {
            ...state.nodeOutputs,
            [nodeId]: (state.nodeOutputs[nodeId] || '') + chunk,
          },
        }));
      } catch { /* ignore parse errors */ }
    });

    eventSource.addEventListener('edge_active', (e) => {
      try {
        const { sourceId, targetId } = JSON.parse(e.data);
        const { edges } = get();
        const edge = edges.find((ed) => ed.source === sourceId && ed.target === targetId);
        if (edge) {
          set((state) => {
            const newActive = new Set(state.activeEdges);
            newActive.add(edge.id);
            return { activeEdges: newActive };
          });
          setTimeout(() => {
            set((state) => {
              const newActive = new Set(state.activeEdges);
              newActive.delete(edge.id);
              return { activeEdges: newActive };
            });
          }, 1500);
        }
      } catch { /* ignore parse errors */ }
    });

    eventSource.addEventListener('complete', (e) => {
      try {
        const { metrics } = JSON.parse(e.data);
        set({ executionStatus: 'completed', metrics });
        toast.success(`Workflow completed! Tokens used: ${metrics?.totalTokens ?? 0}`);
      } catch { /* ignore parse errors */ }
      eventSource?.close();
      eventSource = null;
    });

    eventSource.addEventListener('error', () => {
      eventSource?.close();
      eventSource = null;
      set({ executionStatus: 'failed' });
      toast.error('Execution stream disconnected');
    });
  },

  stopWorkflow: () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    set({ executionStatus: 'idle', activeExecutionId: null });
  }
});
