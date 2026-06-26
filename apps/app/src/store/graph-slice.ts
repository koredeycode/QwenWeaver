import { StateCreator } from 'zustand';
import { Node, Edge, Connection, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { StoreState, GraphSlice } from './types.js';
import { toast } from 'sonner';
import { EXAMPLE_WORKFLOWS } from '../lib/example-workflows.js';
import { WorkflowPayload, NodeData } from '@qwenweaver/types';

// Initial template for the "Research Workflow"
const RESEARCH_WORKFLOW_TEMPLATE = {
  nodes: [
    {
      id: 'node-trigger',
      type: 'trigger',
      position: { x: 50, y: 200 },
      data: { label: 'Web Trigger (Cron 9 AM)', outputFormat: 'text' },
    },
    {
      id: 'node-agent-1',
      type: 'agent',
      position: { x: 300, y: 100 },
      data: {
        label: 'Academic Searcher',
        model: 'qwen-plus',
        systemPrompt: 'Scrapes Google Scholar for the latest papers on multi-agent consensus.',
        outputFormat: 'markdown',
      },
    },
    {
      id: 'node-agent-2',
      type: 'agent',
      position: { x: 300, y: 300 },
      data: {
        label: 'Patent Scanner',
        model: 'qwen-plus',
        systemPrompt: 'Queries global patent databases for visual node orchestration systems.',
        outputFormat: 'markdown',
      },
    },
    {
      id: 'node-supervisor',
      type: 'supervisor',
      position: { x: 600, y: 200 },
      data: {
        label: 'Consensus Supervisor',
        model: 'qwen3-max',
        systemPrompt:
          'Review the outputs of both Searcher and Scanner. Synthesize findings. If they contradict, ask them to re-verify.',
        enableThinking: true,
        thinkingBudget: 1024,
        outputFormat: 'json',
      },
    },
    {
      id: 'node-mcp-tool',
      type: 'mcp_tool',
      position: { x: 900, y: 200 },
      data: {
        label: 'GitHub Writer Tool',
        mcpServerId: 'github-server',
        mcpServerUrl: 'http://localhost:8000',
        systemPrompt:
          'Pushes the Synthesized consensus report to repository: qwen-weaver/research-reports',
        outputFormat: 'text',
      },
    },
  ] as Node<NodeData>[],
  edges: [
    {
      id: 'e-t-a1',
      source: 'node-trigger',
      target: 'node-agent-1',
      sourceHandle: 'source',
      targetHandle: 'target-left',
      type: 'animated',
    },
    {
      id: 'e-t-a2',
      source: 'node-trigger',
      target: 'node-agent-2',
      sourceHandle: 'source',
      targetHandle: 'target-left',
      type: 'animated',
    },
    {
      id: 'e-a1-s',
      source: 'node-agent-1',
      target: 'node-supervisor',
      sourceHandle: 'source-right',
      targetHandle: 'target-left',
      type: 'animated',
    },
    {
      id: 'e-a2-s',
      source: 'node-agent-2',
      target: 'node-supervisor',
      sourceHandle: 'source-right',
      targetHandle: 'target-left',
      type: 'animated',
    },
    {
      id: 'e-s-m',
      source: 'node-supervisor',
      target: 'node-mcp-tool',
      sourceHandle: 'source-bottom',
      targetHandle: 'target',
      type: 'animated',
    },
  ] as Edge[],
};

let _updateNodeDataTimer: ReturnType<typeof setTimeout> | undefined;

export const createGraphSlice: StateCreator<StoreState, [], [], GraphSlice> = (set, get) => ({
  nodes: RESEARCH_WORKFLOW_TEMPLATE.nodes,
  edges: RESEARCH_WORKFLOW_TEMPLATE.edges,
  selectedNodeId: null,
  workflowId: null,
  workflowName: '',
  workflowDescription: '',
  isDirty: false,
  markClean: () => set({ isDirty: false }),
  maximizedNodeId: null,
  setMaximizedNodeId: (id) => set({ maximizedNodeId: id }),

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

      const isAgent = (t?: string) => t === 'agent' || t === 'supervisor';
      const isTrigger = (t?: string) => t === 'trigger' || t === 'input_trigger';

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

      // Block duplicate or reverse connections between the same two nodes
      const hasEdge = state.edges.some(
        (e) =>
          (e.source === connection.source && e.target === connection.target) ||
          (e.source === connection.target && e.target === connection.source),
      );
      if (hasEdge) {
        toast.error('A connection already exists between these nodes.');
        return {};
      }

      // Agent→agent connections should use left/right handles
      // Agent→tool connections should use top/bottom handles
      // Auto-detect handles when missing, and validate/override wrong handles
      let sourceHandle = connection.sourceHandle;
      let targetHandle = connection.targetHandle;

      if (isAgent(sourceNode.type) && isAgent(targetNode.type)) {
        sourceHandle = 'source-right';
        targetHandle = 'target-left';
      } else if (isAgent(sourceNode.type) && targetNode.type === 'mcp_tool') {
        sourceHandle = 'source-bottom';
        targetHandle = 'target';
      } else if (isTrigger(sourceNode.type) && isAgent(targetNode.type)) {
        sourceHandle = 'source';
        targetHandle = 'target-left';
      } else if (sourceNode.type === 'mcp_tool' && isAgent(targetNode.type)) {
        sourceHandle = 'target';
        targetHandle = 'target-bottom';
      } else if (isAgent(targetNode.type)) {
        targetHandle = 'target-left';
      } else if (targetNode.type === 'mcp_tool') {
        targetHandle = 'target';
      }

      return {
        edges: addEdge(
          {
            ...connection,
            sourceHandle,
            targetHandle,
            id: `e-${connection.source}-${connection.target}`,
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
    const id = `node-${type}-${Date.now().toString().slice(-4)}`;
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

      const newId = `node-${original.type}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).slice(-4)}`;

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
    if (!_updateNodeDataTimer) get().pushHistory();
    clearTimeout(_updateNodeDataTimer);
    _updateNodeDataTimer = setTimeout(() => {
      _updateNodeDataTimer = undefined;
    }, 800);
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

    // 1. Build adjacency list of parents for each node
    const parentsMap = new Map<string, string[]>();
    for (const node of nodes) {
      parentsMap.set(node.id, []);
    }
    for (const edge of edges) {
      if (parentsMap.has(edge.target)) {
        parentsMap.get(edge.target)!.push(edge.source);
      }
    }

    // 2. Compute level of each node
    const levelMap = new Map<string, number>();
    const visited = new Set<string>();

    const getLevel = (nodeId: string): number => {
      if (levelMap.has(nodeId)) return levelMap.get(nodeId)!;
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);
      const parents = parentsMap.get(nodeId) || [];
      if (parents.length === 0) {
        levelMap.set(nodeId, 0);
        visited.delete(nodeId);
        return 0;
      }
      let maxParentLevel = 0;
      for (const pId of parents) {
        maxParentLevel = Math.max(maxParentLevel, getLevel(pId));
      }
      const level = maxParentLevel + 1;
      levelMap.set(nodeId, level);
      visited.delete(nodeId);
      return level;
    };

    for (const node of nodes) {
      getLevel(node.id);
    }

    // 3. Identify which tools belong to which parent agent/supervisor
    const toolParentMap = new Map<string, string>();
    for (const edge of edges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (
        targetNode?.type === 'mcp_tool' &&
        (sourceNode?.type === 'agent' || sourceNode?.type === 'supervisor')
      ) {
        if (!toolParentMap.has(edge.target)) {
          toolParentMap.set(edge.target, edge.source);
        }
      } else if (
        sourceNode?.type === 'mcp_tool' &&
        (targetNode?.type === 'agent' || targetNode?.type === 'supervisor')
      ) {
        if (!toolParentMap.has(edge.source)) {
          toolParentMap.set(edge.source, edge.target);
        }
      }
    }

    // 4. Split into main nodes and tool nodes
    const mainNodes = nodes.filter((n) => n.type !== 'mcp_tool');
    const toolNodes = nodes.filter((n) => n.type === 'mcp_tool');

    // 5. Group main nodes by level
    const mainNodesByLevel = new Map<number, string[]>();
    for (const node of mainNodes) {
      const lvl = levelMap.get(node.id) || 0;
      if (!mainNodesByLevel.has(lvl)) {
        mainNodesByLevel.set(lvl, []);
      }
      mainNodesByLevel.get(lvl)!.push(node.id);
    }

    // 7. Calculate positions
    const X_GAP = 360;
    const Y_GAP = 180;
    const TOOL_WIDTH = 80;
    const TOOL_GAP = 12;

    const nodeWidth = (type?: string) => {
      if (type === 'supervisor') return 320;
      if (type === 'trigger') return 256;
      return 288;
    };

    const positionMap = new Map<string, { x: number; y: number }>();

    // Place main nodes left-to-right, leaving room below for tools
    for (const node of mainNodes) {
      const level = levelMap.get(node.id) || 0;
      const levelNodes = mainNodesByLevel.get(level) || [];
      const index = levelNodes.indexOf(node.id);
      const totalHeight = (levelNodes.length - 1) * Y_GAP;
      const y = 250 + index * Y_GAP - totalHeight / 2;
      positionMap.set(node.id, { x: level * X_GAP + 80, y });
    }

    // Place tool nodes spread evenly below their parent node
    for (const node of toolNodes) {
      const parentId = toolParentMap.get(node.id);
      if (parentId && positionMap.has(parentId)) {
        const parentNode = nodes.find((n) => n.id === parentId);
        const parentPos = positionMap.get(parentId)!;
        const siblingTools = toolNodes.filter((t) => toolParentMap.get(t.id) === parentId);
        const count = siblingTools.length;
        const pw = nodeWidth(parentNode?.type);
        const totalWidth = count * TOOL_WIDTH + (count - 1) * TOOL_GAP;
        const startX = parentPos.x + (pw - totalWidth) / 2;
        const siblingIndex = siblingTools.indexOf(node);
        positionMap.set(node.id, {
          x: startX + siblingIndex * (TOOL_WIDTH + TOOL_GAP),
          y: parentPos.y + 280,
        });
      } else {
        // Orphaned tool — place at far right
        const maxLevel = Math.max(...Array.from(levelMap.values()), 0);
        const index = toolNodes.indexOf(node);
        positionMap.set(node.id, {
          x: (maxLevel + 1) * X_GAP + 80,
          y: 250 + index * Y_GAP,
        });
      }
    }

    const rearrangedNodes = nodes.map((node) => {
      const pos = positionMap.get(node.id);
      return {
        ...node,
        position: pos || { x: 100, y: 100 },
      };
    });

    set({ nodes: rearrangedNodes });
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
});
