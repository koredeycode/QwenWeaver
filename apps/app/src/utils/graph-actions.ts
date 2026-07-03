import type { Node, Edge } from '@xyflow/react';
import type { GraphAction } from '@qwenweaver/types';
import { isAgent, isTrigger, autoDetectHandles } from './connection-validation.js';

export interface GraphActionResult {
  nodes: Node<any>[];
  edges: Edge<any>[];
  selectedNodeId: string | null;
  isDirty: boolean;
}

export function executeGraphActions(
  nodes: Node<any>[],
  edges: Edge<any>[],
  selectedNodeId: string | null,
  actions: GraphAction[],
): GraphActionResult {
  let currentNodes = [...nodes];
  let currentEdges = [...edges];
  let selectedId = selectedNodeId;

  for (const action of actions) {
    if (action.type === 'add_node') {
      const { type, id, position, data } = action.payload;
      const nodeType = type as any;
      const finalId =
        id ||
        `node-${nodeType}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).slice(-4)}`;
      const label =
        data?.label ||
        (nodeType === 'input_trigger'
          ? 'Initial workflow instruction'
          : nodeType === 'file_trigger'
            ? 'Upload an image'
            : `${nodeType.toUpperCase()} Node`);

      const newNode: Node<any> = {
        id: finalId,
        type: nodeType,
        position: position || { x: 150, y: 150 },
        data: {
          label,
          model:
            nodeType === 'supervisor'
              ? 'qwen3.7-max'
              : nodeType === 'agent'
                ? 'qwen3.7-plus'
                : undefined,
          systemPrompt:
            nodeType === 'agent' || nodeType === 'supervisor'
              ? 'You are a helpful assistant.'
              : undefined,
          outputFormat: 'text',
          ...data,
        },
      };
      currentNodes.push(newNode);
      selectedId = finalId;
    } else if (action.type === 'add_nodes') {
      const nodesList = action.payload || [];
      for (const n of nodesList) {
        const nodeType = n.type as any;
        const finalId =
          n.id ||
          `node-${nodeType}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).slice(-4)}`;
        const label =
          n.data?.label ||
          (nodeType === 'input_trigger'
            ? 'Initial workflow instruction'
            : nodeType === 'file_trigger'
              ? 'Upload an image'
              : `${nodeType.toUpperCase()} Node`);

        const newNode: Node<any> = {
          id: finalId,
          type: nodeType,
          position: n.position || { x: 150, y: 150 },
          data: {
            label,
            model:
              nodeType === 'supervisor'
                ? 'qwen3.7-max'
                : nodeType === 'agent'
                  ? 'qwen3.7-plus'
                  : undefined,
            systemPrompt:
              nodeType === 'agent' || nodeType === 'supervisor'
                ? 'You are a helpful assistant.'
                : undefined,
            outputFormat: 'text',
            ...n.data,
          },
        };
        currentNodes.push(newNode);
        selectedId = finalId;
      }
    } else if (action.type === 'delete_node') {
      const { id } = action.payload;
      currentNodes = currentNodes.filter((n) => n.id !== id);
      currentEdges = currentEdges.filter((e) => e.source !== id && e.target !== id);
      if (selectedId === id) selectedId = null;
    } else if (action.type === 'delete_nodes') {
      const ids = action.payload || [];
      currentNodes = currentNodes.filter((n) => !ids.includes(n.id));
      currentEdges = currentEdges.filter((e) => !ids.includes(e.source) && !ids.includes(e.target));
      if (selectedId && ids.includes(selectedId)) selectedId = null;
    } else if (action.type === 'update_node') {
      const { id, data } = action.payload;
      currentNodes = currentNodes.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      });
    } else if (action.type === 'update_nodes') {
      const updates = action.payload || [];
      for (const u of updates) {
        currentNodes = currentNodes.map((node) => {
          if (node.id === u.id) {
            return { ...node, data: { ...node.data, ...u.data } };
          }
          return node;
        });
      }
    } else if (action.type === 'add_edge') {
      const {
        id,
        source,
        target,
        sourceHandle: connSourceHandle,
        targetHandle: connTargetHandle,
      } = action.payload;
      const sourceNode = currentNodes.find((n) => n.id === source);
      const targetNode = currentNodes.find((n) => n.id === target);
      if (sourceNode && targetNode) {
        const detected = autoDetectHandles(sourceNode.type as string, targetNode.type as string);
        const sourceHandle = detected.sourceHandle || connSourceHandle;
        const targetHandle = detected.targetHandle || connTargetHandle;

        const newEdgeId = id || `e-${source}-${target}`;
        const exists = currentEdges.some((e) => e.id === newEdgeId);
        if (!exists) {
          currentEdges.push({
            id: newEdgeId,
            source,
            target,
            sourceHandle: sourceHandle || undefined,
            targetHandle: targetHandle || undefined,
            type: 'animated',
          });
        }
      }
    } else if (action.type === 'add_edges') {
      const edgesList = action.payload || [];
      for (const e of edgesList) {
        const {
          id,
          source,
          target,
          sourceHandle: connSourceHandle,
          targetHandle: connTargetHandle,
        } = e;
        const sourceNode = currentNodes.find((n) => n.id === source);
        const targetNode = currentNodes.find((n) => n.id === target);
        if (sourceNode && targetNode) {
          const detected = autoDetectHandles(sourceNode.type as string, targetNode.type as string);
          const sourceHandle = detected.sourceHandle || connSourceHandle;
          const targetHandle = detected.targetHandle || connTargetHandle;

          const newEdgeId = id || `e-${source}-${target}`;
          const exists = currentEdges.some((edge) => edge.id === newEdgeId);
          if (!exists) {
            currentEdges.push({
              id: newEdgeId,
              source,
              target,
              sourceHandle: sourceHandle || undefined,
              targetHandle: targetHandle || undefined,
              type: 'animated',
            });
          }
        }
      }
    } else if (action.type === 'delete_edge') {
      const { id } = action.payload;
      currentEdges = currentEdges.filter((e) => e.id !== id);
    } else if (action.type === 'delete_edges') {
      const ids = action.payload || [];
      currentEdges = currentEdges.filter((e) => !ids.includes(e.id));
    }
  }

  return {
    nodes: currentNodes,
    edges: currentEdges,
    selectedNodeId: selectedId,
    isDirty: true,
  };
}
