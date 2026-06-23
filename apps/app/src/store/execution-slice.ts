import { StateCreator } from 'zustand';
import type { 
  NodeType, 
  NodeData, 
  NodeTiming,
} from '@qwenweaver/types';
import { StoreState, ExecutionSlice } from './types.js';
import { toast } from 'sonner';

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

    // Group nodes into layers (zero in-degree → process → reduce degrees → repeat)
    const layers: string[][] = [];
    const remainingInDegrees = { ...inDegrees };
    const queued = new Set<string>();
    const startTime = performance.now();
    const nodeTimings: Record<string, NodeTiming> = {};

    while (true) {
      const zeroDegree = Object.entries(remainingInDegrees)
        .filter(([id, deg]) => deg === 0 && !queued.has(id))
        .map(([id]) => id);

      if (zeroDegree.length === 0) break;
      layers.push(zeroDegree);
      zeroDegree.forEach((id) => queued.add(id));

      // Reduce in-degree of downstream nodes
      for (const id of zeroDegree) {
        for (const neighbor of adj[id] || []) {
          if (remainingInDegrees[neighbor] !== undefined) {
            remainingInDegrees[neighbor]--;
          }
        }
      }
    }

    // Fallback: if there are unprocessed nodes (cycle or disconnected), add them as last layer
    const unprocessed = nodes
      .filter((n) => !queued.has(n.id))
      .map((n) => n.id);
    if (unprocessed.length > 0) {
      layers.push(unprocessed);
    }

    set({ executionStatus: 'running' });

    // Helper: simulate node execution with character-by-character streaming
    const simulateNode = async (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const nodeType = node.type as NodeType;
      const nodeLabel = (node.data as NodeData)?.label || nodeId;

      // Mark node as running
      set((state) => ({
        nodeStatuses: { ...state.nodeStatuses, [nodeId]: 'running' }
      }));

      // Simulate thinking / processing time based on node type
      const baseDelay = nodeType === 'supervisor' ? 1500 : nodeType === 'agent' ? 800 : 400;
      const processingTime = baseDelay + Math.random() * 600;

      // For supervisor nodes, simulate thinking ticks
      if (nodeType === 'supervisor') {
        const thinkSteps = [2, 3, 4, 5];
        for (const tick of thinkSteps) {
          await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
          set((state) => ({
            nodeOutputs: {
              ...state.nodeOutputs,
              [nodeId]: (state.nodeOutputs[nodeId] || '') + `[THINK] supervisor reasoning step ${tick}/5...\n`
            }
          }));
        }
        // Simulate backtracking for plausible agentic behavior
        await new Promise((r) => setTimeout(r, 200));
        set((state) => ({
          nodeOutputs: {
            ...state.nodeOutputs,
            [nodeId]: (state.nodeOutputs[nodeId] || '') + '[BACKTRACK] re-evaluating contradiction in input signals...\n'
          }
        }));
        await new Promise((r) => setTimeout(r, 300));
      }

      // Build mock output paragraphs
      const mockParagraphs: Record<string, string[]> = {
        trigger: [
          `[INIT] Trigger "${nodeLabel}" activated.`,
          `[SIGNAL] Broadcasting wake-up call to downstream agents.`,
        ],
        input_trigger: [
          `[INPUT] Received user prompt: "${nodeLabel}".`,
          `[PARSE] Extracted intent and context signatures.`,
        ],
        agent: [
          `[AGENT] "${nodeLabel}" is processing context window...`,
          `[INFERENCE] Running Qwen model inferences on task parameters.`,
          `[MEMORY] Retrieved 3 relevant context snippets from local store.`,
          `[OUTPUT] Task execution summary prepared.`,
        ],
        supervisor: [
          `[SUPERVISOR] "${nodeLabel}" reviewing aggregate outputs from agents.`,
          `[CONSENSUS] Cross-checking factual consistency across 2 reports.`,
          `[RESOLVE] No contradictions detected; synthesizing final verdict.`,
          `[JUDGEMENT] Accepting all agent conclusions. Ready for next stage.`,
        ],
        mcp_tool: [
          `[MCP] Connecting to external tool "${nodeLabel}"...`,
          `[MCP] Sending structured payload to MCP server.`,
          `[MCP] Response received. Formatting results.`,
        ],
      };

      const paragraphs = mockParagraphs[nodeType] || [
        `[NODE] "${nodeLabel}" executed.`,
      ];

      // Write paragraphs with streaming effect
      for (const paragraph of paragraphs) {
        // Simulate character-by-character streaming
        for (let i = 0; i < paragraph.length; i++) {
          const char = paragraph[i];
          await new Promise((r) => setTimeout(r, 10 + Math.random() * 5));
          set((state) => ({
            nodeOutputs: {
              ...state.nodeOutputs,
              [nodeId]: (state.nodeOutputs[nodeId] || '') + char
            }
          }));
        }
        set((state) => ({
          nodeOutputs: {
            ...state.nodeOutputs,
            [nodeId]: state.nodeOutputs[nodeId] + '\n'
          }
        }));
      }

      // Mark node as completed
      const durationMs = performance.now() - startTime;
      nodeTimings[nodeId] = {
        nodeId,
        status: 'completed',
        durationMs,
        tokensUsed: Math.floor(100 + Math.random() * 400),
      };

      set((state) => ({
        nodeStatuses: { ...state.nodeStatuses, [nodeId]: 'completed' }
      }));

      // Activate outgoing edges for a brief flash
      const outgoingEdges = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoingEdges) {
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
    };

    // Execute layers sequentially, but nodes within each layer in parallel
    const runMockQueue = async () => {
      for (const layer of layers) {
        const promises = layer.map((nodeId) => simulateNode(nodeId));
        await Promise.all(promises);
        // mark layer as "activated" on graph for visual cue
        set((state) => {
          const newActive = new Set(state.activeEdges);
          state.edges.forEach((e) => {
            if (layer.includes(e.source) && layer.includes(e.target)) {
              newActive.add(e.id);
            }
          });
          return { activeEdges: newActive };
        });
      }

      // Calculate final metrics
      const totalTime = performance.now() - startTime;
      const totalTokens = Object.values(nodeTimings).reduce(
        (sum, t) => sum + (t.tokensUsed || 0),
        0
      );
      const parallelLayers = layers.filter((l) => l.length > 1).length;
      const maxParallel = layers.reduce((max, l) => Math.max(max, l.length), 1);
      const speedup = maxParallel > 1 ? maxParallel : 1;

      set({
        executionStatus: 'completed',
        metrics: {
          totalLatencyMs: Math.round(totalTime),
          totalTokens,
          nodeTimings: Object.values(nodeTimings),
          parallelEfficiency: Math.round((speedup / layers.length) * 100),
          speedupS: speedup,
        }
      });

      toast.success(`Workflow completed in ${Math.round(totalTime)}ms`);
    };

    runMockQueue();
  },

  stopWorkflow: () => {
    set({ executionStatus: 'idle', activeExecutionId: null });
  }
});
