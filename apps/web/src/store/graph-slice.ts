import { StateCreator } from 'zustand';
import { 
  Node, 
  Edge, 
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge
} from '@xyflow/react';
import { StoreState, GraphSlice } from './types.js';
import { toast } from 'sonner';

// Initial template for the "Research Swarm"
const RESEARCH_SWARM_TEMPLATE = {
  nodes: [
    {
      id: 'node-trigger',
      type: 'trigger',
      position: { x: 50, y: 200 },
      data: { label: 'Web Trigger (Cron 9 AM)', outputFormat: 'text' }
    },
    {
      id: 'node-agent-1',
      type: 'agent',
      position: { x: 300, y: 100 },
      data: { 
        label: 'Academic Searcher', 
        model: 'qwen-plus', 
        systemPrompt: 'Scrapes Google Scholar for the latest papers on multi-agent consensus.',
        outputFormat: 'markdown'
      }
    },
    {
      id: 'node-agent-2',
      type: 'agent',
      position: { x: 300, y: 300 },
      data: { 
        label: 'Patent Scanner', 
        model: 'qwen-plus', 
        systemPrompt: 'Queries global patent databases for visual node orchestration systems.',
        outputFormat: 'markdown'
      }
    },
    {
      id: 'node-supervisor',
      type: 'supervisor',
      position: { x: 600, y: 200 },
      data: { 
        label: 'Consensus Supervisor', 
        model: 'qwen3-max', 
        systemPrompt: 'Review the outputs of both Searcher and Scanner. Synthesize findings. If they contradict, ask them to re-verify.',
        enableThinking: true,
        thinkingBudget: 1024,
        outputFormat: 'json'
      }
    },
    {
      id: 'node-mcp-tool',
      type: 'mcp_tool',
      position: { x: 900, y: 200 },
      data: { 
        label: 'GitHub Writer Tool', 
        mcpServerId: 'github-server',
        mcpServerUrl: 'http://localhost:8000',
        systemPrompt: 'Pushes the Synthesized consensus report to repository: qwen-weaver/research-reports',
        outputFormat: 'text'
      }
    }
  ] as Node<any>[],
  edges: [
    { id: 'e-t-a1', source: 'node-trigger', target: 'node-agent-1', type: 'animated' },
    { id: 'e-t-a2', source: 'node-trigger', target: 'node-agent-2', type: 'animated' },
    { id: 'e-a1-s', source: 'node-agent-1', target: 'node-supervisor', type: 'animated' },
    { id: 'e-a2-s', source: 'node-agent-2', target: 'node-supervisor', type: 'animated' },
    { id: 'e-s-m', source: 'node-supervisor', target: 'node-mcp-tool', type: 'animated' }
  ] as Edge<any>[]
};

export const createGraphSlice: StateCreator<StoreState, [], [], GraphSlice> = (set, get) => ({
  nodes: RESEARCH_SWARM_TEMPLATE.nodes,
  edges: RESEARCH_SWARM_TEMPLATE.edges,
  selectedNodeId: null,

  onNodesChange: (changes) => set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),
  onEdgesChange: (changes) => set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),
  
  onConnect: (connection: Connection) => set((state) => {
    const sourceNode = state.nodes.find((n) => n.id === connection.source);
    const targetNode = state.nodes.find((n) => n.id === connection.target);
    if (sourceNode?.type === 'mcp_tool' && targetNode?.type === 'mcp_tool') {
      toast.error("Error: MCP Tools cannot be directly connected to each other.");
      return {};
    }
    return { 
      edges: addEdge({ ...connection, id: `e-${connection.source}-${connection.target}`, type: 'animated' }, state.edges) 
    };
  }),

  addNode: (type, position) => {
    const id = `node-${type}-${Date.now().toString().slice(-4)}`;
    const label = type === 'input_trigger' 
      ? 'Initial workflow instruction' 
      : `${type.toUpperCase()} Node`;
    const newNode: Node<any> = {
      id,
      type,
      position: position || { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: {
        label,
        model: type === 'supervisor' ? 'qwen3-max' : type === 'agent' ? 'qwen-plus' : undefined,
        systemPrompt: type === 'agent' || type === 'supervisor' ? 'You are a helpful assistant.' : undefined,
        outputFormat: 'text'
      }
    };
    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: id
    }));
  },

  deleteNode: (id) => set((state) => ({
    nodes: state.nodes.filter((n) => n.id !== id),
    edges: state.edges.filter((e) => e.source !== id && e.target !== id),
    selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
  })),

  updateNodeData: (id, data) => set((state) => ({
    nodes: state.nodes.map((node) => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, ...data } };
      }
      return node;
    })
  })),

  selectNode: (id) => set({ selectedNodeId: id }),

  clearGraph: () => set({ nodes: [], edges: [], selectedNodeId: null }),

  loadTemplate: (templateName) => {
    if (templateName === 'research') {
      set({ 
        nodes: RESEARCH_SWARM_TEMPLATE.nodes, 
        edges: RESEARCH_SWARM_TEMPLATE.edges,
        selectedNodeId: null
      });
    }
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

    // 2. Compute level of each node (handling cycle avoidance)
    const levelMap = new Map<string, number>();
    const visited = new Set<string>();

    const getLevel = (nodeId: string): number => {
      if (levelMap.has(nodeId)) {
        return levelMap.get(nodeId)!;
      }
      if (visited.has(nodeId)) {
        return 0; // Prevent infinite loop in cycle
      }
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

    // 3. Group node IDs by their level
    const nodesByLevel = new Map<number, string[]>();
    for (const node of nodes) {
      const lvl = levelMap.get(node.id) || 0;
      if (!nodesByLevel.has(lvl)) {
        nodesByLevel.set(lvl, []);
      }
      nodesByLevel.get(lvl)!.push(node.id);
    }

    // 4. Calculate layout positions
    const X_GAP = 360;
    const Y_GAP = 280; // 280px gap gives enough space for console log outputs

    const rearrangedNodes = nodes.map((node) => {
      const level = levelMap.get(node.id) || 0;
      const levelNodes = nodesByLevel.get(level) || [];
      const index = levelNodes.indexOf(node.id);
      
      const x = level * X_GAP + 80;
      const totalHeight = (levelNodes.length - 1) * Y_GAP;
      const y = 200 + index * Y_GAP - totalHeight / 2;

      return {
        ...node,
        position: { x, y }
      };
    });

    set({ nodes: rearrangedNodes });
  }
});
