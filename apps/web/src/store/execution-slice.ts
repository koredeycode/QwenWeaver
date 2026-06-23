import { StateCreator } from 'zustand';
import type { 
  NodeType, 
  NodeData, 
  WorkflowPayload, 
  NodeTiming
} from '@qwenweaver/types';
import { StoreState, ExecutionSlice } from './types.js';
import { toast } from 'sonner';
import { client } from '../lib/api-client.js';

let sseAbortController: AbortController | null = null;

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

    const { nodes, edges, mockMode, token } = get();

    if (mockMode) {
      // ──────────────── MOCK LOCAL SIMULATOR ────────────────
      const executionId = `mock-exec-${Date.now()}`;
      set({ activeExecutionId: executionId, executionStatus: 'running' });

      // Build dependency layers (simple Kahn's topo layers in-browser)
      const inDegrees: Record<string, number> = {};
      const adj: Record<string, string[]> = {};
      
      nodes.forEach((n) => {
        inDegrees[n.id] = 0;
        adj[n.id] = [];
      });

      edges.forEach((e) => {
        adj[e.source].push(e.target);
        inDegrees[e.target] = (inDegrees[e.target] || 0) + 1;
      });

      // Find initial nodes
      let queue = nodes.filter((n) => inDegrees[n.id] === 0).map((n) => n.id);
      
      if (queue.length === 0 && nodes.length > 0) {
        queue = [nodes[0].id];
      }

      const nodeTimings: NodeTiming[] = [];
      const startTime = Date.now();

      // Simulated outputs to type out
      const mockParagraphs: Record<string, string> = {
        'node-trigger': 'Webhook triggered. Received payload containing request metadata.\nTrigger Type: Cron Job Scheduler at 9:00 AM daily.\nStarting research swarm...',
        'node-agent-1': '### Academic Swarm Output\nFound 3 high-impact consensus publications:\n1. *Orchestration of Large Swarms* - Qwen Tech (2025)\n2. *Dynamic Backtracking in Multi-Agent Visual Frameworks* (2026)\n3. *Kahn-driven DAG compilers for edge endpoints* (2026)\nExtraction complete.',
        'node-agent-2': '### Patent Office Scan\nIdentified 2 active visual editor patents matching core node-based layout patterns:\n- US-2025-0129A: "Orthogonal flow rendering for agent hierarchies."\n- EP-99321A: "Interactive terminal streaming of model tokens in flow canvases."\nScan complete.',
        'node-supervisor': '{\n  "synthesis": "Consolidated consensus review: Both search databases confirm deep validity of visual DAG compilation. Consensual overlap found in US-2025-0129A.",\n  "status": "APPROVED",\n  "actions": ["Push report to GitHub"]\n}',
        'node-mcp-tool': 'Report written successfully. \n- Commited to branch: main\n- File: reports/ConsensusReview.md\n- Commit hash: a6b29f001cde9\nHTTP 201 OK from GitHub MCP tool endpoint.'
      };

      // Execution loop
      const runMockQueue = async () => {
        while (queue.length > 0) {
          const currentBatch = [...queue];
          queue = []; 

          const batchPromises = currentBatch.map(async (nodeId) => {
            set((state) => ({
              nodeStatuses: { ...state.nodeStatuses, [nodeId]: 'running' }
            }));

            // Active incoming edges animation
            set((state) => {
              const newActive = new Set(state.activeEdges);
              state.edges.forEach((e) => {
                if (e.target === nodeId) {
                  newActive.add(e.id);
                }
              });
              return { activeEdges: newActive };
            });

            // Simulate Qwen Supervisor Backtracking logic
            const isSupervisor = nodes.find((n) => n.id === nodeId)?.type === 'supervisor';
            if (isSupervisor) {
              let ticks = 0;
              await new Promise<void>((res) => {
                const interval = setInterval(() => {
                  ticks++;
                  set((state) => ({
                    nodeOutputs: { 
                      ...state.nodeOutputs, 
                      [nodeId]: `[Thinking Budget: 1024 tokens]\n<thinking>\nAnalysing consensus of academic searcher and patent scanner...\nThinking step ${ticks}...\nComparing dataset schemas...\nResolving node configurations...\n</thinking>\n` 
                    }
                  }));
                  if (ticks >= 4) {
                    clearInterval(interval);
                    res();
                  }
                }, 1200);
              });
            }

            const isInputTrigger = nodes.find((n) => n.id === nodeId)?.type === 'input_trigger';
            const targetText = isInputTrigger
              ? (nodes.find((n) => n.id === nodeId)?.data.label || 'No instruction text provided.')
              : (mockParagraphs[nodeId] || `Execution successfully completed for node ${nodeId}. All tasks completed.`);
            let currentText = isSupervisor ? get().nodeOutputs[nodeId] || '' : '';
            const chunkSize = 4;
            
            await new Promise<void>((res) => {
              let idx = 0;
              const interval = setInterval(() => {
                if (idx < targetText.length) {
                  currentText += targetText.slice(idx, idx + chunkSize);
                  idx += chunkSize;
                  set((state) => ({
                    nodeOutputs: { ...state.nodeOutputs, [nodeId]: currentText }
                  }));
                } else {
                  clearInterval(interval);
                  res();
                }
              }, 100);
            });

            // Supervisor backtracking logic trigger
            if (isSupervisor && !get().nodeStatuses['node-agent-1-backtracked']) {
              set((state) => ({
                nodeStatuses: { 
                  ...state.nodeStatuses, 
                  [nodeId]: 'pending', 
                  'node-agent-1': 'pending' 
                },
                'node-agent-1-backtracked': 'true' as any
              }));

              set((state) => ({
                nodeOutputs: { ...state.nodeOutputs, 'node-agent-1': '' }
              }));

              await new Promise((r) => setTimeout(r, 2500));

              set((state) => ({
                nodeStatuses: { ...state.nodeStatuses, 'node-agent-1': 'running' }
              }));

              const refinedText = '### Refined Academic Swarm Output\n[SUPERVISOR RE-VERIFICATION REQUESTED]\nConsensus consolidated. Found additional matching patents on orthogonal graphs.\nEverything matches EP-99321A.';
              let text1 = '';
              await new Promise<void>((res) => {
                let idx = 0;
                const interval = setInterval(() => {
                  if (idx < refinedText.length) {
                    text1 += refinedText.slice(idx, idx + chunkSize);
                    idx += chunkSize;
                    set((state) => ({
                      nodeOutputs: { ...state.nodeOutputs, 'node-agent-1': text1 }
                    }));
                  } else {
                    clearInterval(interval);
                    res();
                  }
                }, 100);
              });

              set((state) => ({
                nodeStatuses: { ...state.nodeStatuses, 'node-agent-1': 'completed' }
              }));

              set((state) => ({
                nodeStatuses: { ...state.nodeStatuses, [nodeId]: 'running' }
              }));
              await new Promise((r) => setTimeout(r, 1200));
            }

            // Node complete
            set((state) => ({
              nodeStatuses: { ...state.nodeStatuses, [nodeId]: 'completed' }
            }));

            // Stop edge glowing
            set((state) => {
              const newActive = new Set(state.activeEdges);
              state.edges.forEach((e) => {
                if (e.target === nodeId) {
                  newActive.delete(e.id);
                }
              });
              return { activeEdges: newActive };
            });

            const latency = Math.round(1000 + Math.random() * 2000);
            nodeTimings.push({
              nodeId,
              status: 'completed',
              durationMs: latency,
              tokensUsed: Math.floor(100 + Math.random() * 500)
            });

            adj[nodeId].forEach((target) => {
              inDegrees[target]--;
              if (inDegrees[target] === 0) {
                queue.push(target);
              }
            });
          });

          await Promise.all(batchPromises);
        }

        // Completion metrics
        const duration = (Date.now() - startTime) / 1000;
        const totalTokens = nodeTimings.reduce((acc, t) => acc + (t.tokensUsed || 0), 0);
        const seqSum = nodeTimings.reduce((acc, t) => acc + t.durationMs, 0) / 1000;
        const speedup = Number((seqSum / duration).toFixed(2));

        set({
          executionStatus: 'completed',
          metrics: {
            speedupS: speedup,
            totalTokens,
            totalLatencyMs: Math.round(duration * 1000),
            parallelEfficiency: Number((speedup / (nodes.length || 1)).toFixed(2)),
            nodeTimings
          }
        });
      };

      runMockQueue();

    } else {
      // ──────────────── REAL ENDPOINT EXECUTION ────────────────
      if (!token) {
        set({ executionStatus: 'failed' });
        toast.error('Please authenticate to execute real API workflows.');
        return;
      }

      try {
        const workflowPayload: WorkflowPayload = {
          name: 'Canvas Workflow',
          description: 'Executing from React Flow Visual Canvas',
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type as NodeType,
            position: n.position,
            data: n.data as NodeData
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || undefined,
            targetHandle: e.targetHandle || undefined
          }))
        };

        const res = await client.api.workflow.execute.$post(
          { json: workflowPayload },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!res.ok) {
          const err = await res.json();
          const errorMsg = err && typeof err === 'object' && 'error' in err ? String((err as any).error) : 'Server error';
          set({ executionStatus: 'failed' });
          toast.error(`Workflow failed: ${errorMsg}`);
          return;
        }

        const data = await res.json();
        if (!data || typeof data !== 'object' || !('executionId' in data)) {
          set({ executionStatus: 'failed' });
          toast.error('Workflow failed: Invalid server response');
          return;
        }
        const executionId = (data as any).executionId;
        set({ activeExecutionId: executionId, executionStatus: 'running' });

        sseAbortController = new AbortController();
        const sseRes = await client.api.workflow[':executionId'].stream.$get(
          {
            param: { executionId }
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            init: {
              signal: sseAbortController.signal
            }
          }
        );

        if (!sseRes.ok || !sseRes.body) {
          set({ executionStatus: 'failed' });
          return;
        }

        const reader = sseRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.replace('event:', '').trim();
            } else if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.replace('data:', '').trim();
              try {
                const data = JSON.parse(dataStr);
                
                if (currentEvent === 'token') {
                  set((state) => ({
                    nodeOutputs: {
                      ...state.nodeOutputs,
                      [data.nodeId]: (state.nodeOutputs[data.nodeId] || '') + data.chunk
                    }
                  }));
                } else if (currentEvent === 'status_update') {
                  set((state) => ({
                    nodeStatuses: {
                      ...state.nodeStatuses,
                      [data.nodeId]: data.status
                    }
                  }));
                } else if (currentEvent === 'edge_active') {
                  set((state) => {
                    const edgeId = `e-${data.sourceId}-${data.targetId}`;
                    const newActive = new Set(state.activeEdges);
                    newActive.add(edgeId);
                    return { activeEdges: newActive };
                  });
                  setTimeout(() => {
                    set((state) => {
                      const newActive = new Set(state.activeEdges);
                      newActive.delete(`e-${data.sourceId}-${data.targetId}`);
                      return { activeEdges: newActive };
                    });
                  }, 1500);
                } else if (currentEvent === 'complete') {
                  set({ 
                    executionStatus: 'completed',
                    metrics: data.metrics
                  });
                } else if (currentEvent === 'error') {
                  set({ executionStatus: 'failed' });
                  toast.error(`Execution error: ${data.message || 'Unknown error'}`);
                }
              } catch (err) {
                console.error('Failed to parse SSE payload', err);
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('SSE connection aborted by client');
        } else {
          console.error('SSE connection error', err);
          set({ executionStatus: 'failed' });
        }
      }
    }
  },

  stopWorkflow: () => {
    const { mockMode } = get();
    if (mockMode) {
      set({ executionStatus: 'idle', activeExecutionId: null });
    } else {
      if (sseAbortController) {
        sseAbortController.abort();
        sseAbortController = null;
      }
      set({ executionStatus: 'idle', activeExecutionId: null });
    }
  }
});
