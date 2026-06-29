import type { Node, Edge } from '@xyflow/react';

export function computeDagLayout(nodes: Node<any>[], edges: Edge<any>[]): Node<any>[] {
  if (nodes.length === 0) return nodes;

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

  // 3. Build node lookup map for O(1) access
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // 4. Identify which tools belong to which parent agent/supervisor
  const toolParentMap = new Map<string, string>();
  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
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

  // Place main nodes left-to-right
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
      const parentNode = nodeMap.get(parentId);
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

  return nodes.map((node) => {
    const pos = positionMap.get(node.id);
    return {
      ...node,
      position: pos || { x: 100, y: 100 },
    };
  });
}
