import { StateCreator } from 'zustand';
import type {
  NodeTiming,
  OutputPart,
  WorkspaceEntry,
  BusMessage,
  NodeData,
} from '@qwenweaver/types';
import { StoreState, ExecutionSlice } from './types.js';
import { toast } from 'sonner';
import { getAccessToken, client } from '../lib/api-client.js';

export const createExecutionSlice: StateCreator<StoreState, [], [], ExecutionSlice> = (
  set,
  get,
) => ({
  activeExecutionId: null,
  executionStatus: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  nodeThinking: {},
  nodeOutputUrls: {},
  nodeOutputParts: {},
  activeEdges: new Set(),
  metrics: null,
  abortController: null,
  executionHistory: [],
  historyLoading: false,
  workspaceEntries: [],
  workspaceLoading: false,
  busMessages: [],
  channelMessages: [],
  debateRounds: [],
  debateVerdicts: [],
  canvasStatus: 'idle',
  loadedExecutionId: null,
  loadedExecutionDate: null,
  outputDialogOpen: false,
  selectedOutputNodeId: null,

  fetchExecutionHistory: async (limit = 20, offset = 0) => {
    const workflowId = get().workflowId;
    if (!workflowId) {
      set({ executionHistory: [], historyLoading: false });
      return;
    }
    set({ historyLoading: true });
    try {
      const res = await client.api.execution.$get({
        query: {
          limit: String(limit),
          offset: String(offset),
          workflowId,
        },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        set({ executionHistory: data.executions || [] });
      }
    } catch (err) {
      console.error('Failed to fetch execution history:', err);
    } finally {
      set({ historyLoading: false });
    }
  },

  fetchWorkspaceEntries: async (executionId: string) => {
    set({ workspaceLoading: true });
    try {
      const res = await client.api.workspace[':executionId'].list.$get({
        param: { executionId },
      });
      if (res.ok) {
        const data = (await res.json()) as { entries: WorkspaceEntry[] };
        set({ workspaceEntries: data.entries || [], workspaceLoading: false });
      }
    } catch (err) {
      console.error('Failed to fetch workspace entries:', err);
      set({ workspaceLoading: false });
    }
  },

  runWorkflow: async () => {
    set({
      executionStatus: 'pending',
      nodeStatuses: {},
      nodeOutputs: {},
      nodeThinking: {},
      nodeOutputUrls: {},
      nodeOutputParts: {},
      workspaceEntries: [],
      busMessages: [],
      channelMessages: [],
      debateRounds: [],
      debateVerdicts: [],
      activeEdges: new Set(),
      metrics: null,
      activeExecutionId: null,
      canvasStatus: 'running',
      loadedExecutionId: null,
      loadedExecutionDate: null,
      outputDialogOpen: false,
      selectedOutputNodeId: null,
    });

    const { nodes, edges, workflowName, workflowDescription, workflowId } = get();
    if (nodes.length === 0) {
      set({ executionStatus: 'idle' });
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      toast.error('Please log in to run workflows');
      set({ executionStatus: 'idle' });
      return;
    }

    set({ executionStatus: 'running' });

    try {
      const workflowPayload = {
        workflowId: workflowId || undefined,
        id: workflowId || undefined,
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
          data: e.data || undefined,
        })),
      };

      const execRes = await client.api.workflow.execute.$post({
        json: workflowPayload,
      });
      if (!execRes.ok) {
        const errBody = (await execRes.json().catch(() => ({}))) as any;
        toast.error(errBody.error || 'Failed to execute workflow');
        set({ executionStatus: 'idle' });
        return;
      }

      const execData = (await execRes.json()) as any;
      const executionId = execData.executionId;
      const returnedWorkflowId = execData.workflowId;
      if (!executionId) {
        toast.error('No execution ID returned');
        set({ executionStatus: 'idle' });
        return;
      }

      if (returnedWorkflowId && !get().workflowId) {
        set({ workflowId: returnedWorkflowId, isDirty: false });
        window.history.replaceState(null, '', `/workflows/${returnedWorkflowId}`);
      }

      set({ activeExecutionId: executionId });

      const abortController = new AbortController();
      set({ abortController });
      const tokenParam = token ? `?token=${token}` : '';
      const eventSourceUrl = `/api/workflow/${executionId}/stream${tokenParam}`;

      const nodeTimings: NodeTiming[] = [];
      const edgeActiveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

      // Batched token/thinking accumulators to avoid re-render storms
      const pendingTokenChunks = new Map<string, string>();
      const pendingThinkingChunks = new Map<string, string>();
      const flushAccumulators = () => {
        if (pendingTokenChunks.size > 0) {
          const snapshot = new Map(pendingTokenChunks);
          pendingTokenChunks.clear();
          set((s) => {
            const next = { ...s.nodeOutputs };
            for (const [nodeId, chunk] of snapshot) {
              next[nodeId] = (next[nodeId] || '') + chunk;
            }
            return { nodeOutputs: next };
          });
        }
        if (pendingThinkingChunks.size > 0) {
          const snapshot = new Map(pendingThinkingChunks);
          pendingThinkingChunks.clear();
          set((s) => {
            const next = { ...s.nodeThinking };
            for (const [nodeId, chunk] of snapshot) {
              next[nodeId] = (next[nodeId] || '') + chunk;
            }
            return { nodeThinking: next };
          });
        }
      };
      const flushInterval = setInterval(flushAccumulators, 100);

      const eventSource = new EventSource(eventSourceUrl);

      console.log('[execution] EventSource connecting to', eventSourceUrl);

      eventSource.onopen = () => {
        console.log('[execution] EventSource connected');
      };

      eventSource.onerror = (err) => {
        console.error('[execution] EventSource error', err);
        // Do not close immediately on error, EventSource auto-reconnects.
      };

      // Add signal abort handling
      abortController.signal.addEventListener('abort', () => {
        clearInterval(flushInterval);
        flushAccumulators();
        console.log('[execution] Aborting EventSource');
        eventSource.close();
      });

      // Instead of an infinite while loop with TextDecoder, we listen to specific events

      const handleEvent = (currentEvent: string, currentData: string) => {
        if (!currentEvent || !currentData) return;
        try {
          const payload = JSON.parse(currentData);

          switch (currentEvent) {
            case 'token': {
              const { nodeId, chunk } = payload as { nodeId: string; chunk: string };
              pendingTokenChunks.set(nodeId, (pendingTokenChunks.get(nodeId) || '') + chunk);
              break;
            }

            case 'thinking': {
              const { nodeId, chunk } = payload as { nodeId: string; chunk: string };
              pendingThinkingChunks.set(nodeId, (pendingThinkingChunks.get(nodeId) || '') + chunk);
              break;
            }

            case 'status_update': {
              const { nodeId, status, outputUrl, outputParts } = payload as {
                nodeId: string;
                status: string;
                outputUrl?: string;
                outputParts?: OutputPart[];
              };
              set((s) => ({
                nodeStatuses: {
                  ...s.nodeStatuses,
                  [nodeId]: status as 'pending' | 'running' | 'completed' | 'failed',
                },
                ...(outputUrl
                  ? {
                      nodeOutputUrls: {
                        ...s.nodeOutputUrls,
                        [nodeId]: outputUrl,
                      },
                    }
                  : {}),
                ...(outputParts
                  ? {
                      nodeOutputParts: {
                        ...s.nodeOutputParts,
                        [nodeId]: outputParts,
                      },
                    }
                  : {}),
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
              const edgeId = edges.find((e) => e.source === sourceId && e.target === targetId)?.id;
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

            case 'bus_message': {
              const busMsg = payload as {
                message: BusMessage;
              };
              if (busMsg.message) {
                set((s) => ({
                  busMessages: [...s.busMessages, busMsg.message],
                }));
              }
              break;
            }

            case 'workspace_write': {
              const activeExecutionId = get().activeExecutionId;
              if (activeExecutionId) {
                get().fetchWorkspaceEntries(activeExecutionId);
              }
              break;
            }

            case 'message': {
              const msg = payload as {
                fromNodeId: string;
                toNodeId: string;
                content: string;
                round: number;
                channelId: string;
                timestamp: number;
              };
              set((s) => ({
                channelMessages: [...s.channelMessages, msg],
              }));
              break;
            }

            case 'debate_round': {
              const round = payload as {
                arenaId: string;
                round: number;
                statements: Array<{ participantId: string; content: string }>;
                timestamp: number;
              };
              set((s) => ({
                debateRounds: [...s.debateRounds, round],
              }));
              break;
            }

            case 'debate_verdict': {
              const verdict = payload as {
                arenaId: string;
                verdict: string;
                scores?: Record<string, number>;
                rationale?: string;
                timestamp: number;
              };
              set((s) => ({
                debateVerdicts: [...s.debateVerdicts, verdict],
              }));
              break;
            }
          }
        } catch (err) {
          // skip malformed payloads
        }
      };

      let hadError = false;

      const eventTypes = [
        'token',
        'thinking',
        'status_update',
        'edge_active',
        'complete',
        'error',
        'workspace_write',
        'bus_message',
        'message',
        'debate_round',
        'debate_verdict',
      ];
      for (const eventType of eventTypes) {
        eventSource.addEventListener(eventType, (e) => {
          handleEvent(eventType, e.data);

          if (eventType === 'error') {
            hadError = true;
          }

          if (eventType === 'complete') {
            clearInterval(flushInterval);
            flushAccumulators();
            eventSource.close();

            for (const timer of edgeActiveTimers.values()) {
              clearTimeout(timer);
            }
            edgeActiveTimers.clear();

            const finalStatus = hadError ? 'failed' : 'completed';
            set({
              executionStatus: finalStatus,
              canvasStatus: 'runned',
              outputDialogOpen: true,
            });
            get().fetchCredits();
          }
        });
      }
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
      canvasStatus: 'idle',
    });
  },

  openOutputDialog: () => set({ outputDialogOpen: true }),

  closeOutputDialog: () => set({ outputDialogOpen: false, selectedOutputNodeId: null }),

  setSelectedOutputNode: (nodeId) => set({ selectedOutputNodeId: nodeId }),

  resetCanvasState: () => {
    const state = get();
    set({
      executionStatus: 'idle',
      activeExecutionId: null,
      canvasStatus: 'idle',
      loadedExecutionId: null,
      loadedExecutionDate: null,
      nodeStatuses: {},
      nodeOutputs: {},
      nodeThinking: {},
      nodeOutputUrls: {},
      nodeOutputParts: {},
      activeEdges: new Set(),
      metrics: null,
      busMessages: [],
      channelMessages: [],
      debateRounds: [],
      debateVerdicts: [],
      workspaceEntries: [],
      outputDialogOpen: false,
      selectedOutputNodeId: null,
    });
  },

  loadExecutionIntoCanvas: async (executionId: string) => {
    set({ historyLoading: true });
    try {
      const res = await client.api.execution[':executionId'].$get({
        param: { executionId },
      });
      if (!res.ok) {
        toast.error('Failed to load execution');
        set({ historyLoading: false });
        return;
      }
      const execution = (await res.json()) as any;

      const logsRes = await client.api.execution[':executionId'].logs.$get({
        param: { executionId },
      });
      if (!logsRes.ok) {
        toast.error('Failed to load execution logs');
        set({ historyLoading: false });
        return;
      }
      const logsData = (await logsRes.json()) as any;
      const logs: Array<{
        nodeId: string;
        status: string;
        output?: { text?: string; outputs?: OutputPart[]; reasoning?: string };
        input?: any;
      }> = logsData.logs || [];

      const nodeStatuses: Record<string, 'pending' | 'running' | 'completed' | 'failed'> = {};
      const nodeOutputs: Record<string, string> = {};
      const nodeOutputParts: Record<string, OutputPart[]> = {};
      const nodeThinking: Record<string, string> = {};

      for (const log of logs) {
        nodeStatuses[log.nodeId] =
          (log.status as 'pending' | 'running' | 'completed' | 'failed') || 'completed';
        if (log.output?.text) {
          nodeOutputs[log.nodeId] = log.output.text;
        }
        if (log.output?.outputs) {
          nodeOutputParts[log.nodeId] = log.output.outputs;
        }
        if (log.output?.reasoning) {
          nodeThinking[log.nodeId] = log.output.reasoning;
        }
      }

      const graphSnapshot = execution.graphSnapshot;
      const loadedDate = execution.completedAt || execution.startedAt;

      if (graphSnapshot) {
        const { nodes: currentNodes } = get();
        const snapshotNodes = graphSnapshot.nodes || [];
        const snapshotEdges = graphSnapshot.edges || [];

        if (snapshotNodes.length !== currentNodes.length) {
          toast.warning(
            `Execution used ${snapshotNodes.length} nodes (current canvas has ${currentNodes.length}). Canvas updated to match execution snapshot.`,
          );
        }

        // Load the execution's graph state
        const { loadUnsavedWorkflow } = get();
        loadUnsavedWorkflow(
          snapshotNodes.map((n: any) => ({
            id: n.id,
            type: n.type || 'agent',
            position: n.position || { x: 0, y: 0 },
            data: n.data || {},
          })),
          snapshotEdges.map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || undefined,
            targetHandle: e.targetHandle || undefined,
            data: e.data || undefined,
          })),
          execution.workflowName || graphSnapshot.name || 'Untitled Workflow',
          graphSnapshot.description || '',
        );

        // Mark loaded nodes with their execution status
        for (const n of snapshotNodes) {
          if (nodeStatuses[n.id]) {
            get().updateNodeData(n.id, { _executionStatus: nodeStatuses[n.id] as any });
          }
        }
      }

      set({
        loadedExecutionId: executionId,
        loadedExecutionDate: loadedDate || null,
        nodeStatuses,
        nodeOutputs,
        nodeOutputParts,
        nodeThinking,
        metrics: execution.metrics || null,
        canvasStatus: 'runned',
        executionStatus: 'completed',
        activeExecutionId: executionId,
        historyLoading: false,
        outputDialogOpen: false,
        selectedOutputNodeId: null,
      });
    } catch (err) {
      console.error('Failed to load execution into canvas:', err);
      toast.error('Failed to load execution');
      set({ historyLoading: false });
    }
  },
});
