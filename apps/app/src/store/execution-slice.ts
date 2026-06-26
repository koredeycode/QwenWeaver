import { StateCreator } from 'zustand';
import type { NodeTiming } from '@qwenweaver/types';
import { StoreState, ExecutionSlice } from './types.js';
import { toast } from 'sonner';
import { getAccessToken, fetchApi } from '../lib/api-client.js';

export const createExecutionSlice: StateCreator<StoreState, [], [], ExecutionSlice> = (
  set,
  get,
) => ({
  activeExecutionId: null,
  executionStatus: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  activeEdges: new Set(),
  metrics: null,
  abortController: null,

  runWorkflow: async () => {
    set({
      executionStatus: 'pending',
      nodeStatuses: {},
      nodeOutputs: {},
      activeEdges: new Set(),
      metrics: null,
      activeExecutionId: null,
    });

    const { nodes, edges, workflowName, workflowDescription } = get();
    if (nodes.length === 0) {
      set({ executionStatus: 'idle' });
      return;
    }

    const token = getAccessToken();
    if (!token) {
      toast.error('Please log in to run workflows');
      set({ executionStatus: 'idle' });
      return;
    }

    set({ executionStatus: 'running' });

    try {
      const workflowPayload = {
        name: workflowName || 'Untitled Workflow',
        description: workflowDescription || '',
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type || 'agent',
          position: { x: n.position?.x ?? 0, y: n.position?.y ?? 0 },
          data: n.data || {},
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || undefined,
          targetHandle: e.targetHandle || undefined,
        })),
      };

      const execRes = await fetchApi('/api/workflow/execute', {
        method: 'POST',
        body: JSON.stringify(workflowPayload),
      });
      if (!execRes.ok) {
        const errBody = await execRes.json().catch(() => ({}));
        toast.error(errBody.error || 'Failed to execute workflow');
        set({ executionStatus: 'idle' });
        return;
      }

      const execData = await execRes.json();
      const executionId = execData.executionId;
      if (!executionId) {
        toast.error('No execution ID returned');
        set({ executionStatus: 'idle' });
        return;
      }

      set({ activeExecutionId: executionId });

      const abortController = new AbortController();
      set({ abortController });
      const streamRes = await fetchApi(`/api/workflow/${executionId}/stream`, {
        signal: abortController.signal,
      });

      if (!streamRes.ok) {
        toast.error('Failed to connect to execution stream');
        set({ executionStatus: 'idle' });
        return;
      }

      let buffer = '';
      const nodeTimings: NodeTiming[] = [];
      const edgeActiveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
      const reader = streamRes.body?.getReader();
      if (!reader) {
        toast.error('Stream not available');
        set({ executionStatus: 'idle' });
        return;
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.slice(5).trim();
          } else if (line.startsWith('id:')) {
            continue;
          } else if (line === '' && currentEvent && currentData) {
            try {
              const payload = JSON.parse(currentData);

              switch (currentEvent) {
                case 'token': {
                  const { nodeId, chunk } = payload as { nodeId: string; chunk: string };
                  set((s) => ({
                    nodeOutputs: {
                      ...s.nodeOutputs,
                      [nodeId]: (s.nodeOutputs[nodeId] || '') + chunk,
                    },
                  }));
                  break;
                }

                case 'status_update': {
                  const { nodeId, status } = payload as {
                    nodeId: string;
                    status: string;
                  };
                  set((s) => ({
                    nodeStatuses: {
                      ...s.nodeStatuses,
                      [nodeId]: status as 'pending' | 'running' | 'completed' | 'failed',
                    },
                  }));
                  if (status === 'completed' || status === 'failed') {
                    set((s) => {
                      const edgesToActivate = get().edges.filter((e) => e.source === nodeId);
                      const a = new Set(s.activeEdges);
                      for (const edge of edgesToActivate) {
                        a.add(edge.id);
                      }
                      return { activeEdges: a };
                    });
                    edges
                      .filter((e) => e.source === nodeId)
                      .forEach((edge) => {
                        const existing = edgeActiveTimers.get(edge.id);
                        if (existing) clearTimeout(existing);
                        const timer = setTimeout(() => {
                          set((s) => {
                            const a = new Set(s.activeEdges);
                            a.delete(edge.id);
                            edgeActiveTimers.delete(edge.id);
                            return { activeEdges: a };
                          });
                        }, 1200);
                        edgeActiveTimers.set(edge.id, timer);
                      });
                  }
                  break;
                }

                case 'edge_active': {
                  const { sourceId, targetId } = payload as {
                    sourceId: string;
                    targetId: string;
                  };
                  const edgeId = edges.find(
                    (e) => e.source === sourceId && e.target === targetId,
                  )?.id;
                  if (edgeId) {
                    set((s) => {
                      const a = new Set(s.activeEdges);
                      a.add(edgeId);
                      return { activeEdges: a };
                    });
                    const existing = edgeActiveTimers.get(edgeId);
                    if (existing) clearTimeout(existing);
                    const timer = setTimeout(() => {
                      set((s) => {
                        const a = new Set(s.activeEdges);
                        a.delete(edgeId);
                        edgeActiveTimers.delete(edgeId);
                        return { activeEdges: a };
                      });
                    }, 1200);
                    edgeActiveTimers.set(edgeId, timer);
                  }
                  break;
                }

                case 'complete': {
                  const { metrics } = payload as {
                    metrics: {
                      speedupS: number;
                      totalTokens: number;
                      totalLatencyMs: number;
                      parallelEfficiency: number;
                      nodeTimings: NodeTiming[];
                    };
                  };
                  if (metrics?.nodeTimings) {
                    nodeTimings.push(...metrics.nodeTimings);
                  }
                  const finalMetrics = {
                    speedupS: metrics?.speedupS ?? 1,
                    totalTokens: metrics?.totalTokens ?? 0,
                    totalLatencyMs: metrics?.totalLatencyMs ?? 0,
                    nodeTimings,
                  };
                  set({ metrics: finalMetrics });
                  toast.success(`Workflow completed! Tokens used: ${finalMetrics.totalTokens}`);
                  break;
                }

                case 'error': {
                  const { message, nodeId } = payload as {
                    message: string;
                    nodeId?: string;
                  };
                  if (nodeId) {
                    set((s) => ({
                      nodeStatuses: { ...s.nodeStatuses, [nodeId]: 'failed' },
                    }));
                  }
                  toast.error(message || 'Workflow execution error');
                  break;
                }
              }
            } catch {
              // skip malformed payloads
            }
            currentEvent = '';
            currentData = '';
          }
        }
      }

      for (const timer of edgeActiveTimers.values()) {
        clearTimeout(timer);
      }
      edgeActiveTimers.clear();

      toast.success('Workflow completed');
      set({ executionStatus: 'completed' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Execution failed';
      toast.error(msg);
      set({ executionStatus: 'failed' });
    }
  },

  stopWorkflow: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({
      executionStatus: 'idle',
      activeExecutionId: null,
      abortController: null,
    });
  },
});
