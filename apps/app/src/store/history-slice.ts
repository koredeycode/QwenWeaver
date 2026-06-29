import { StateCreator } from 'zustand';
import { Node, Edge } from '@xyflow/react';
import type { NodeData } from '@qwenweaver/types';
import { StoreState, HistorySlice, CanvasSnapshot } from './types.js';

export function serializeSnapshot(
  nodes: Node<NodeData>[],
  edges: Edge[],
  name: string,
  description: string,
): CanvasSnapshot {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { ...n.position },
      data: {
        label: n.data.label,
        systemPrompt: n.data.systemPrompt,
        model: n.data.model,
        thinkingBudget: n.data.thinkingBudget,
        mcpServerUrl: n.data.mcpServerUrl,
        mcpServerId: n.data.mcpServerId,
        mcpAuthConfig: n.data.mcpAuthConfig ? { ...n.data.mcpAuthConfig } : undefined,
        enableThinking: n.data.enableThinking,
        outputFormat: n.data.outputFormat,
        workerType: n.data.workerType,
      },
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: e.type,
    })),
    workflowName: name,
    workflowDescription: description,
    timestamp: Date.now(),
  };
}

const MAX_HISTORY = 50;

export const createHistorySlice: StateCreator<StoreState, [], [], HistorySlice> = (set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  pushHistory: () => {
    const { nodes, edges, workflowName, workflowDescription, executionStatus } = get();
    if (executionStatus === 'running') return;
    const snapshot = serializeSnapshot(nodes, edges, workflowName, workflowDescription);
    set((state) => {
      const next = [...state.past, snapshot].slice(-MAX_HISTORY);
      return { past: next, future: [], canUndo: true, canRedo: false };
    });
  },

  undo: () => {
    const { past, nodes, edges, workflowName, workflowDescription, executionStatus } = get();
    if (executionStatus === 'running') return;
    if (past.length === 0) return;

    const current = serializeSnapshot(nodes, edges, workflowName, workflowDescription);
    const previous = past[past.length - 1];

    set({
      past: past.slice(0, -1),
      future: [...get().future, current],
      canUndo: past.length > 1,
      canRedo: true,
      nodes: previous.nodes as Node<NodeData>[],
      edges: previous.edges as Edge[],
      workflowName: previous.workflowName,
      workflowDescription: previous.workflowDescription,
      selectedNodeId: null,
    });
  },

  redo: () => {
    const { future, nodes, edges, workflowName, workflowDescription, executionStatus } = get();
    if (executionStatus === 'running') return;
    if (future.length === 0) return;

    const current = serializeSnapshot(nodes, edges, workflowName, workflowDescription);
    const next = future[future.length - 1];

    set({
      future: future.slice(0, -1),
      past: [...get().past, current],
      canUndo: true,
      canRedo: future.length > 1,
      nodes: next.nodes as Node<NodeData>[],
      edges: next.edges as Edge[],
      workflowName: next.workflowName,
      workflowDescription: next.workflowDescription,
      selectedNodeId: null,
    });
  },

  clearHistory: () => set({ past: [], future: [], canUndo: false, canRedo: false }),
});
