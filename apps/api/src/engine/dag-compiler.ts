import type { NodePayload, EdgePayload } from '@qwenweaver/types';
import type { DagCompilationResult } from './types.js';
import { createModuleLogger } from '../logger.js';

const log = createModuleLogger('engine/dag-compiler');

/**
 * Compiles a Directed Acyclic Graph using Kahn's Algorithm.
 *
 * Takes the workflow nodes and edges, computes a topological ordering,
 * and groups nodes into parallel execution batches. Nodes within the
 * same batch have no dependencies on each other and can run concurrently
 * via `Promise.all`.
 *
 * If the graph contains a cycle, `hasCycle` will be `true` and
 * `cycleNodeIds` will list the IDs of the nodes trapped in the cycle.
 */
export function compileDag(nodes: NodePayload[], edges: EdgePayload[]): DagCompilationResult {
  if (nodes.length === 0) {
    return { batches: [], hasCycle: false };
  }

  // Build node lookup for O(1) access
  const nodeMap = new Map<string, NodePayload>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Build adjacency list and compute in-degrees
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize all nodes with in-degree 0
  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  // Populate from edges
  for (const edge of edges) {
    // Skip edges referencing nodes not in the graph
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) {
      log.warn(
        { source: edge.source, target: edge.target },
        'Edge references unknown node, skipping',
      );
      continue;
    }

    adjacency.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // Kahn's BFS — collect zero-in-degree nodes as the initial batch
  const batches: NodePayload[][] = [];
  let queue: string[] = [];

  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  let processedCount = 0;

  while (queue.length > 0) {
    // Current queue = one parallel batch (all independent)
    const batch: NodePayload[] = [];
    const nextQueue: string[] = [];

    for (const nodeId of queue) {
      const node = nodeMap.get(nodeId);
      if (node) {
        batch.push(node);
      }
      processedCount++;

      // Decrement in-degree for all downstream dependents
      const dependents = adjacency.get(nodeId) ?? [];
      for (const depId of dependents) {
        const newDegree = (inDegree.get(depId) ?? 1) - 1;
        inDegree.set(depId, newDegree);
        if (newDegree === 0) {
          nextQueue.push(depId);
        }
      }
    }

    if (batch.length > 0) {
      batches.push(batch);
    }

    queue = nextQueue;
  }

  // Cycle detection: if we haven't processed all nodes, a cycle exists
  if (processedCount < nodes.length) {
    const cycleNodeIds = nodes.filter((n) => (inDegree.get(n.id) ?? 0) > 0).map((n) => n.id);

    log.error({ cycleNodeIds }, 'Cycle detected in DAG');

    return {
      batches,
      hasCycle: true,
      cycleNodeIds,
    };
  }

  log.info({ totalNodes: nodes.length, totalBatches: batches.length }, 'DAG compiled successfully');

  return { batches, hasCycle: false };
}
