import { describe, it, expect } from 'vitest';
import { compileDag } from '../engine/dag-compiler.js';
import type { NodePayload, EdgePayload } from '@qwenweaver/types';

function node(
  id: string,
  type: 'trigger' | 'agent' | 'supervisor' | 'mcp_tool' | 'logic' = 'agent',
): NodePayload {
  return { id, type, position: { x: 0, y: 0 }, data: {} };
}

function edge(source: string, target: string): EdgePayload {
  return { id: `${source}->${target}`, source, target };
}

describe('dag-compiler', () => {
  it('handles an empty graph', () => {
    const result = compileDag([], []);
    expect(result.hasCycle).toBe(false);
    expect(result.batches).toEqual([]);
  });

  it('handles a single node with no edges', () => {
    const result = compileDag([node('A')], []);
    expect(result.hasCycle).toBe(false);
    expect(result.batches).toHaveLength(1);
    expect(result.batches[0]).toHaveLength(1);
    expect(result.batches[0][0].id).toBe('A');
  });

  it('compiles a linear chain (A→B→C) into 3 sequential batches', () => {
    const nodes = [node('A'), node('B'), node('C')];
    const edges = [edge('A', 'B'), edge('B', 'C')];

    const result = compileDag(nodes, edges);

    expect(result.hasCycle).toBe(false);
    expect(result.batches).toHaveLength(3);
    expect(result.batches[0].map((n) => n.id)).toEqual(['A']);
    expect(result.batches[1].map((n) => n.id)).toEqual(['B']);
    expect(result.batches[2].map((n) => n.id)).toEqual(['C']);
  });

  it('compiles a diamond graph with parallel middle layer', () => {
    // A → B, A → C, B → D, C → D
    const nodes = [node('A'), node('B'), node('C'), node('D')];
    const edges = [edge('A', 'B'), edge('A', 'C'), edge('B', 'D'), edge('C', 'D')];

    const result = compileDag(nodes, edges);

    expect(result.hasCycle).toBe(false);
    expect(result.batches).toHaveLength(3);

    // Batch 0: A (root)
    expect(result.batches[0].map((n) => n.id)).toEqual(['A']);

    // Batch 1: B and C (parallel — order may vary)
    const batch1Ids = result.batches[1].map((n) => n.id).sort();
    expect(batch1Ids).toEqual(['B', 'C']);

    // Batch 2: D (depends on both B and C)
    expect(result.batches[2].map((n) => n.id)).toEqual(['D']);
  });

  it('detects a simple cycle (A→B→A)', () => {
    const nodes = [node('A'), node('B')];
    const edges = [edge('A', 'B'), edge('B', 'A')];

    const result = compileDag(nodes, edges);

    expect(result.hasCycle).toBe(true);
    expect(result.cycleNodeIds).toBeDefined();
    expect(result.cycleNodeIds!.sort()).toEqual(['A', 'B']);
  });

  it('detects a cycle in a larger graph (partial processing)', () => {
    // A → B → C → B (cycle between B and C), D is independent
    const nodes = [node('A'), node('B'), node('C'), node('D')];
    const edges = [
      edge('A', 'B'),
      edge('B', 'C'),
      edge('C', 'B'), // creates cycle
      edge('A', 'D'),
    ];

    const result = compileDag(nodes, edges);

    expect(result.hasCycle).toBe(true);
    // A and D should be processed, B and C should be in the cycle
    expect(result.cycleNodeIds!.sort()).toEqual(['B', 'C']);
    // A (and D) should still appear in the batches that were processable
    expect(result.batches.length).toBeGreaterThanOrEqual(1);
  });

  it('handles disconnected subgraphs', () => {
    // Subgraph 1: A → B
    // Subgraph 2: C → D
    // Both roots should be in batch 0
    const nodes = [node('A'), node('B'), node('C'), node('D')];
    const edges = [edge('A', 'B'), edge('C', 'D')];

    const result = compileDag(nodes, edges);

    expect(result.hasCycle).toBe(false);
    expect(result.batches).toHaveLength(2);

    // Batch 0: A and C (both roots, parallel)
    const batch0Ids = result.batches[0].map((n) => n.id).sort();
    expect(batch0Ids).toEqual(['A', 'C']);

    // Batch 1: B and D (both dependents, parallel)
    const batch1Ids = result.batches[1].map((n) => n.id).sort();
    expect(batch1Ids).toEqual(['B', 'D']);
  });

  it('handles a wide fan-out (A → B, C, D, E)', () => {
    const nodes = [node('A'), node('B'), node('C'), node('D'), node('E')];
    const edges = [edge('A', 'B'), edge('A', 'C'), edge('A', 'D'), edge('A', 'E')];

    const result = compileDag(nodes, edges);

    expect(result.hasCycle).toBe(false);
    expect(result.batches).toHaveLength(2);
    expect(result.batches[0].map((n) => n.id)).toEqual(['A']);
    expect(result.batches[1]).toHaveLength(4);
  });

  it('handles a wide fan-in (B, C, D → E)', () => {
    const nodes = [node('B'), node('C'), node('D'), node('E')];
    const edges = [edge('B', 'E'), edge('C', 'E'), edge('D', 'E')];

    const result = compileDag(nodes, edges);

    expect(result.hasCycle).toBe(false);
    expect(result.batches).toHaveLength(2);
    // B, C, D all have in-degree 0 → batch 0
    expect(result.batches[0]).toHaveLength(3);
    // E depends on all three → batch 1
    expect(result.batches[1].map((n) => n.id)).toEqual(['E']);
  });

  it('skips edges referencing unknown nodes', () => {
    const nodes = [node('A'), node('B')];
    const edges = [edge('A', 'B'), edge('A', 'UNKNOWN')];

    const result = compileDag(nodes, edges);

    expect(result.hasCycle).toBe(false);
    expect(result.batches).toHaveLength(2);
  });

  it('preserves node metadata through compilation', () => {
    const agentNode: NodePayload = {
      id: 'agent-1',
      type: 'supervisor',
      position: { x: 100, y: 200 },
      data: { label: 'Research Lead', model: 'qwen-max', enableThinking: true },
    };

    const result = compileDag([agentNode], []);

    expect(result.batches[0][0]).toEqual(agentNode);
    expect(result.batches[0][0].data.model).toBe('qwen-max');
  });
});
