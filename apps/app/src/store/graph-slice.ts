import { StateCreator } from 'zustand';
import { Node, Edge, Connection, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { StoreState, GraphSlice } from './types.js';
import { toast } from 'sonner';
import { EXAMPLE_WORKFLOWS } from '../lib/example-workflows.js';
import { WorkflowPayload, NodeData, GraphAction } from '@qwenweaver/types';
import { RESEARCH_WORKFLOW_TEMPLATE } from '../data/workflow-templates.js';
import {
  isAgent,
  isTrigger,
  doesNotSupportTools,
  autoDetectHandles,
} from '../utils/connection-validation.js';
import { computeDagLayout } from '../utils/dag-layout.js';
import { executeGraphActions } from '../utils/graph-actions.js';

const _updateNodeDataTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const createGraphSlice: StateCreator<StoreState, [], [], GraphSlice> = (set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  workflowId: null,
  workflowName: '',
  workflowDescription: '',
  isDirty: false,
  markClean: () => set({ isDirty: false }),
  maximizedNodeId: null,
  setMaximizedNodeId: (id) => set({ maximizedNodeId: id }),
  mcpConfigDialogNodeId: null,
  setMcpConfigDialogNodeId: (id) => set({ mcpConfigDialogNodeId: id }),

  onNodesChange: (changes) => {
    const hasRemove = changes.some((c: any) => c.type === 'remove');
    if (hasRemove) get().pushHistory();
    set((state) => {
      const newNodes = applyNodeChanges(changes, state.nodes);
      return { nodes: newNodes, isDirty: true };
    });
  },
  onEdgesChange: (changes) => {
    const hasRemove = changes.some((c: any) => c.type === 'remove');
    if (hasRemove) get().pushHistory();
    set((state) => {
      const newEdges = applyEdgeChanges(changes, state.edges);
      return { edges: newEdges, isDirty: true };
    });
  },

  onConnect: (connection: Connection) => {
    get().pushHistory();
    set((state) => {
      const sourceNode = state.nodes.find((n) => n.id === connection.source);
      const targetNode = state.nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return {};

      // Tool→Tool blocked
      if (sourceNode.type === 'mcp_tool' && targetNode.type === 'mcp_tool') {
        toast.error('Error: MCP Tools cannot be directly connected to each other.');
        return {};
      }

      // Tool cannot connect to non-agent
      if (sourceNode.type === 'mcp_tool' && !isAgent(targetNode.type)) {
        toast.error('MCP Tools can only connect to Agent or Supervisor nodes.');
        return {};
      }

      // Trigger nodes can only connect to agents/supervisors
      if (isTrigger(sourceNode.type) && !isAgent(targetNode.type)) {
        toast.error('Trigger nodes can only connect to Agent or Supervisor nodes.');
        return {};
      }

      // Source to a tool must be agent or supervisor
      if (targetNode.type === 'mcp_tool' && !isAgent(sourceNode.type)) {
        toast.error(
          'Error: MCP Tools can only receive connections from Agent or Supervisor nodes.',
        );
        return {};
      }

      // One tool per agent constraint: a tool can only have one incoming connection
      if (targetNode.type === 'mcp_tool') {
        const existingEdge = state.edges.find((e) => e.target === connection.target);
        if (existingEdge) {
          toast.error(
            'This MCP Tool already has a connection from another agent. Duplicate the tool to attach it to a different agent.',
          );
          return {};
        }
      }

      // Block MCP connections to/from media agents that don't support tool calling
      if (
        sourceNode.type === 'mcp_tool' &&
        isAgent(targetNode.type) &&
        doesNotSupportTools(targetNode)
      ) {
        toast.error('Media agents do not support MCP tools.');
        return {};
      }
      if (
        isAgent(sourceNode.type) &&
        doesNotSupportTools(sourceNode) &&
        targetNode.type === 'mcp_tool'
      ) {
        toast.error('Media agents do not support MCP tools.');
        return {};
      }

      // Prevent connecting two MCP tools from the same server to the same agent (tool→agent)
      if (sourceNode.type === 'mcp_tool' && isAgent(targetNode.type)) {
        const sameServerExists = state.edges.some((e) => {
          if (e.target !== connection.target) return false;
          if (e.source === connection.source) return false;
          const src = state.nodes.find((n) => n.id === e.source);
          return (
            src?.type === 'mcp_tool' &&
            src?.data?.mcpServerId != null &&
            src?.data?.mcpServerId === sourceNode.data?.mcpServerId
          );
        });
        if (sameServerExists) {
          toast.error(
            `"${sourceNode.data?.label || 'MCP Tool'}" and another tool from the same server are both connected to this agent. Only one tool per server is allowed per agent.`,
          );
          return {};
        }
      }

      // Prevent connecting two MCP tools from the same server to the same agent (agent→tool)
      if (isAgent(sourceNode.type) && targetNode.type === 'mcp_tool') {
        const sameServerExists = state.edges.some((e) => {
          if (e.source !== connection.source) return false;
          const target = state.nodes.find((n) => n.id === e.target);
          return (
            target?.type === 'mcp_tool' &&
            target?.data?.mcpServerId != null &&
            target?.data?.mcpServerId === targetNode.data?.mcpServerId
          );
        });
        if (sameServerExists) {
          toast.error(
            `"${targetNode.data?.label || 'MCP Tool'}" and another tool from the same server are both connected to this agent. Only one tool per server is allowed per agent.`,
          );
          return {};
        }
      }

      // Block exact duplicate connections (same source, target, and handles)
      const srcHandle = connection.sourceHandle;
      const tgtHandle = connection.targetHandle;
      const hasDuplicate = state.edges.some(
        (e) =>
          e.source === connection.source &&
          e.target === connection.target &&
          (e.sourceHandle === srcHandle || (!e.sourceHandle && !srcHandle)) &&
          (e.targetHandle === tgtHandle || (!e.targetHandle && !tgtHandle)),
      );
      if (hasDuplicate) {
        toast.error('This exact connection already exists.');
        return {};
      }

      const detected = autoDetectHandles(sourceNode.type as string, targetNode.type as string);
      const finalSourceHandle = connection.sourceHandle || detected.sourceHandle;
      const finalTargetHandle = connection.targetHandle || detected.targetHandle;

      return {
        edges: addEdge(
          {
            ...connection,
            sourceHandle: finalSourceHandle,
            targetHandle: finalTargetHandle,
            id: `e-${connection.source}-${connection.target}-${finalSourceHandle || 'd'}-${finalTargetHandle || 'd'}`,
            type: 'animated',
          },
          state.edges,
        ),
        isDirty: true,
      };
    });
  },

  addNode: (type, position, additionalData) => {
    get().pushHistory();
    const id = `node-${type}-${crypto.randomUUID().slice(0, 8)}`;
    const label =
      type === 'input_trigger' ? 'Initial workflow instruction' : `${type.toUpperCase()} Node`;
    const newNode: Node<any> = {
      id,
      type,
      position: position || { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: {
        label,
        model: type === 'supervisor' ? 'qwen3-max' : type === 'agent' ? 'qwen-plus' : undefined,
        systemPrompt:
          type === 'agent' || type === 'supervisor' ? 'You are a helpful assistant.' : undefined,
        outputFormat: 'text',
        ...additionalData,
      },
    };
    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: id,
      isDirty: true,
    }));
  },

  deleteNode: (id) => {
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      isDirty: true,
    }));
  },

  duplicateNode: (id) => {
    get().pushHistory();
    set((state) => {
      const original = state.nodes.find((n) => n.id === id);
      if (!original) return {};

      const newId = `node-${original.type}-${crypto.randomUUID().slice(0, 8)}`;

      const duplicatedNode: Node<any> = {
        ...original,
        id: newId,
        selected: false,
        position: {
          x: original.position.x + 80,
          y: original.position.y + 80,
        },
        data: { ...original.data },
      };

      return {
        nodes: [...state.nodes, duplicatedNode],
        selectedNodeId: newId,
        isDirty: true,
      };
    });
  },

  updateNodeData: (id, data) => {
    const activeTimer = _updateNodeDataTimers.get(id);
    if (!activeTimer) {
      get().pushHistory();
    } else {
      clearTimeout(activeTimer);
    }
    const newTimer = setTimeout(() => {
      _updateNodeDataTimers.delete(id);
    }, 800);
    _updateNodeDataTimers.set(id, newTimer);
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
      isDirty: true,
    }));
  },

  setNodeData: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node,
      ),
    })),
  setEdgeData: (id, data) =>
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === id ? { ...edge, data: { ...edge.data, ...data } } : edge,
      ),
    })),
  selectNode: (id) => set({ selectedNodeId: id }),

  setWorkflowMeta: (name, description) =>
    set({ workflowName: name, workflowDescription: description, isDirty: true }),

  clearGraph: () => {
    get().pushHistory();
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      workflowId: null,
      workflowName: '',
      workflowDescription: '',
      isDirty: false,
    });
    get().loadCopilotHistory([]);
  },

  loadTemplate: (templateName) => {
    if (templateName === 'research') {
      get().pushHistory();
      set({
        nodes: RESEARCH_WORKFLOW_TEMPLATE.nodes,
        edges: RESEARCH_WORKFLOW_TEMPLATE.edges,
        selectedNodeId: null,
        isDirty: false,
      });
    }
  },

  loadWorkflow: (workflowId) => {
    const wf = EXAMPLE_WORKFLOWS.find((w) => w.id === workflowId);
    if (wf) {
      get().pushHistory();
      set({
        nodes: wf.nodes as any,
        edges: wf.edges as any,
        selectedNodeId: null,
        workflowId: null,
        workflowName: wf.name,
        workflowDescription: wf.description,
        isDirty: false,
      });
      get().rearrangeGraph();
      toast.success(`Loaded workflow: ${wf.name}`);
    } else {
      toast.error(`Workflow "${workflowId}" not found.`);
    }
  },

  loadUnsavedWorkflow: (nodes, edges, name, description = '') => {
    get().pushHistory();
    set({
      nodes: nodes as any,
      edges: edges as any,
      selectedNodeId: null,
      workflowId: null,
      workflowName: name,
      workflowDescription: description,
      isDirty: false,
    });
    get().rearrangeGraph();
  },

  rearrangeGraph: () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) return;
    set({ nodes: computeDagLayout(nodes, edges) });
  },

  importWorkflow: (workflowData, merge) => {
    get().pushHistory();
    try {
      const validatedData = {
        name: (workflowData as any).name || 'Imported Workflow',
        nodes: workflowData.nodes || [],
        edges: workflowData.edges || [],
      };

      const result = WorkflowPayload.safeParse(validatedData);
      if (!result.success) {
        const errorMsg = result.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
        toast.error(`Invalid workflow structure: ${errorMsg}`);
        return false;
      }

      const importedNodes = result.data.nodes as Node<any>[];
      const importedEdges = (result.data.edges as Edge<any>[]).map((edge) => ({
        ...edge,
        type: edge.type || 'animated',
      }));

      if (!merge) {
        set({
          nodes: importedNodes,
          edges: importedEdges,
          selectedNodeId: null,
          maximizedNodeId: null,
        });
        toast.success(`Workflow successfully imported!`);
        return true;
      } else {
        // Merge mode: map IDs to prevent collisions
        const idMap = new Map<string, string>();
        const timestamp = Date.now().toString().slice(-4);

        const newNodes = importedNodes.map((node) => {
          const randomSuffix = Math.random().toString(36).slice(-4);
          const newId = `node-${node.type}-${timestamp}-${randomSuffix}`;
          idMap.set(node.id, newId);

          return {
            ...node,
            id: newId,
            selected: false,
            dragging: false,
            // Offset slightly to prevent exact overlay
            position: {
              x: node.position.x + 50,
              y: node.position.y + 50,
            },
          };
        });

        const newEdges = importedEdges
          .map((edge) => {
            const newSource = idMap.get(edge.source);
            const newTarget = idMap.get(edge.target);
            if (newSource && newTarget) {
              return {
                ...edge,
                id: `e-${newSource}-${newTarget}`,
                source: newSource,
                target: newTarget,
                type: edge.type || 'animated',
              };
            }
            return null;
          })
          .filter(Boolean) as Edge<any>[];

        const existingNodes = get().nodes;
        const existingEdges = get().edges;

        set({
          nodes: [...existingNodes, ...newNodes],
          edges: [...existingEdges, ...newEdges],
          selectedNodeId: null,
        });
        toast.success(
          `Merged ${newNodes.length} nodes and ${newEdges.length} edges into the canvas.`,
        );
        return true;
      }
    } catch (err: any) {
      toast.error(`Import failed: ${err.message || err}`);
      return false;
    }
  },

  applyActions: (actions) => {
    get().pushHistory();
    set((state) => executeGraphActions(state.nodes, state.edges, state.selectedNodeId, actions));
  },
});
