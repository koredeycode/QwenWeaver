import type { WorkflowPayload, ExecutionMetrics, NodeTiming } from '@qwenweaver/types';
import type {
  UpstreamOutputs,
  ExecutionResult,
  ExecutionOptions,
  StreamEmitter,
} from './types.js';
import { compileDag } from './dag-compiler.js';
import { runAgent } from './agent-runner.js';
import {
  updateExecution,
  saveAgentLog,
  getExecution,
  createExecution,
  saveWorkflow,
} from '@qwenweaver/database';
import { createModuleLogger } from '../logger.js';

const log = createModuleLogger('engine/executor');

/**
 * Executes a full workflow by compiling the DAG, running agents in
 * topologically-ordered parallel batches, and streaming events via SSE.
 *
 * 1. Compile DAG — detect cycles, produce execution batches
 * 2. Create execution record in DB
 * 3. Iterate batches: run agents in parallel via Promise.all
 * 4. Compute execution metrics (speedup S, total tokens)
 * 5. Emit `complete` event with final metrics
 */
export async function executeWorkflow(
  workflow: WorkflowPayload,
  executionId: string,
  emitter: StreamEmitter,
  options: ExecutionOptions = { maxNegotiationRounds: 3, persistLogs: true },
): Promise<ExecutionResult> {
  const executionStart = performance.now();

  log.info(
    { executionId, workflowName: workflow.name, nodeCount: workflow.nodes.length },
    'Starting workflow execution',
  );

  // Ensure execution record exists in DB (self-healing for tests or direct calls)
  const existing = await getExecution(executionId).catch(() => null);
  if (!existing) {
    const workflowId = await saveWorkflow(workflow).catch((err) => {
      log.error({ executionId, error: err.message }, 'Failed to auto-save workflow');
      return 'placeholder-workflow-id';
    });
    await createExecution(executionId, workflowId).catch((err) => {
      log.error({ executionId, error: err.message }, 'Failed to auto-create execution');
    });
  }

  // Update execution status in DB to 'running'
  await updateExecution(executionId, 'running').catch((err) => {
    log.error({ executionId, error: err.message }, 'Failed to set execution status to running');
  });

  // ─── Phase 1: Compile DAG ──────────────────────────────────────────────────

  const dagResult = compileDag(workflow.nodes, workflow.edges);

  if (dagResult.hasCycle) {
    const errorMsg = `Cycle detected in workflow DAG. Nodes involved: ${dagResult.cycleNodeIds?.join(', ')}`;

    log.error({ executionId, cycleNodeIds: dagResult.cycleNodeIds }, errorMsg);

    await updateExecution(executionId, 'failed').catch((err) => {
      log.error({ executionId, error: err.message }, 'Failed to set execution status to failed on cycle');
    });

    await emitter.emit('error', {
      message: errorMsg,
      timestamp: Date.now(),
    });

    return {
      executionId,
      status: 'failed',
      metrics: { totalLatencyMs: Math.round(performance.now() - executionStart) },
      outputs: new Map(),
      error: errorMsg,
    };
  }

  log.info(
    { executionId, batchCount: dagResult.batches.length },
    'DAG compiled, starting batch execution',
  );

  // ─── Phase 2: Execute batches in topological order ─────────────────────────

  const allOutputs: UpstreamOutputs = new Map();
  const nodeTimings: NodeTiming[] = [];
  let totalTokens = 0;
  let sequentialTime = 0; // Sum of all individual agent times (for speedup calc)
  let currentRound = 0;
  const maxNegotiationRounds = options?.maxNegotiationRounds ?? 3;
  const cumulativeFeedback = new Map<string, string>();

  // Pre-calculate node-to-batch-index map
  const nodeToBatchIdx = new Map<string, number>();
  for (let i = 0; i < dagResult.batches.length; i++) {
    for (const node of dagResult.batches[i]) {
      nodeToBatchIdx.set(node.id, i);
    }
  }

  // Build edge lookup: target -> source[] for upstream data resolution
  const incomingEdges = new Map<string, string[]>();
  for (const edge of workflow.edges) {
    const sources = incomingEdges.get(edge.target) ?? [];
    sources.push(edge.source);
    incomingEdges.set(edge.target, sources);
  }

  for (let batchIdx = 0; batchIdx < dagResult.batches.length; batchIdx++) {
    const batch = dagResult.batches[batchIdx];

    if (emitter.isClosed()) {
      log.warn({ executionId, batchIdx }, 'Client disconnected, aborting execution');
      break;
    }

    log.info(
      { executionId, batchIdx, batchSize: batch.length, currentRound },
      'Executing batch',
    );

    // Emit status_update: all nodes in this batch are now "running"
    for (const node of batch) {
      await emitter.emit('status_update', {
        nodeId: node.id,
        status: 'running',
        timestamp: Date.now(),
      });
    }

    // Execute all agents in this batch concurrently
    const batchResults = await Promise.all(
      batch.map(async (node) => {
        // Resolve upstream outputs for this node
        const upstreamSources = incomingEdges.get(node.id) ?? [];
        const upstream: UpstreamOutputs = new Map();

        for (const sourceId of upstreamSources) {
          const sourceResult = allOutputs.get(sourceId);
          if (sourceResult) {
            upstream.set(sourceId, sourceResult);

            // Emit edge_active: data is flowing from source to this node
            await emitter.emit('edge_active', {
              sourceId,
              targetId: node.id,
              timestamp: Date.now(),
            });
          }
        }

        // Apply cumulative supervisor feedback to worker nodes if any
        let nodeToRun = node;
        const feedback = cumulativeFeedback.get(node.id);
        if (feedback) {
          nodeToRun = {
            ...node,
            data: {
              ...node.data,
              label: (node.data.label ?? '') + feedback,
            },
          };
        }

        const result = await runAgent(nodeToRun, upstream, emitter, executionId);

        // Persist agent log to DB directly in the map callback where node and upstream are in scope
        await saveAgentLog(
          executionId,
          result.nodeId,
          result.status,
          {
            prompt: nodeToRun.data.label || 'Agent Execution',
            systemPrompt: nodeToRun.data.systemPrompt || undefined,
            upstreamOutputs: Object.fromEntries(
              Array.from(upstream.entries()).map(([k, v]) => [k, { text: v.text, status: v.status }])
            ),
          },
          {
            text: result.text,
            outputs: result.outputs,
            reasoning: result.reasoning,
            toolCalls: result.toolCalls,
            toolResults: result.toolResults,
          },
          result.tokensUsed,
          result.error
        ).catch((err) => {
          log.error({ executionId, nodeId: result.nodeId, error: err.message }, 'Failed to save agent log');
        });

        return result;
      }),
    );

    // Process batch results
    for (const result of batchResults) {
      allOutputs.set(result.nodeId, result);
      totalTokens += result.tokensUsed;
      sequentialTime += result.durationMs;

      const existingTimingIdx = nodeTimings.findIndex((t) => t.nodeId === result.nodeId);
      if (existingTimingIdx !== -1) {
        nodeTimings[existingTimingIdx] = {
          nodeId: result.nodeId,
          status: result.status,
          durationMs: result.durationMs,
          tokensUsed: result.tokensUsed,
        };
      } else {
        nodeTimings.push({
          nodeId: result.nodeId,
          status: result.status,
          durationMs: result.durationMs,
          tokensUsed: result.tokensUsed,
        });
      }

      // Emit status_update for completed/failed nodes
      await emitter.emit('status_update', {
        nodeId: result.nodeId,
        status: result.status,
        timestamp: Date.now(),
      });

      if (result.status === 'failed') {
        log.error(
          { executionId, nodeId: result.nodeId, error: result.error },
          'Agent failed',
        );
      }
    }

    // Check for Supervisor node rejection and backtrack if needed
    let rejectionDetected = false;
    let supervisorFeedback = '';
    const upstreamWorkerIdsToReset: string[] = [];

    for (const result of batchResults) {
      const nodePayload = batch.find((n) => n.id === result.nodeId);
      const textVal = result.text ?? result.outputs?.map((o) => o.value).join('\n') ?? '';
      if (
        nodePayload &&
        nodePayload.type === 'supervisor' &&
        result.status === 'completed' &&
        /\[REJECT\]/i.test(textVal) &&
        currentRound < maxNegotiationRounds
      ) {
        rejectionDetected = true;
        supervisorFeedback = textVal.replace(/\[REJECT\]/gi, '').trim();

        const upstreamWorkerIds = workflow.edges
          .filter((edge) => edge.target === result.nodeId)
          .map((edge) => edge.source);

        upstreamWorkerIdsToReset.push(...upstreamWorkerIds);
      }
    }

    if (rejectionDetected && upstreamWorkerIdsToReset.length > 0) {
      currentRound++;

      let minBatchIdx = batchIdx;
      for (const workerId of upstreamWorkerIdsToReset) {
        const bIdx = nodeToBatchIdx.get(workerId);
        if (bIdx !== undefined && bIdx < minBatchIdx) {
          minBatchIdx = bIdx;
        }
      }

      log.info(
        { executionId, minBatchIdx, currentRound, upstreamWorkerIdsToReset },
        `Backtracking execution from batch ${batchIdx} to batch ${minBatchIdx}`,
      );

      for (const workerId of upstreamWorkerIdsToReset) {
        const existingFeedback = cumulativeFeedback.get(workerId) ?? '';
        cumulativeFeedback.set(
          workerId,
          existingFeedback + `\n\n[REVISION REQUESTED BY SUPERVISOR]: ${supervisorFeedback}`
        );
      }

      for (let i = minBatchIdx; i <= batchIdx; i++) {
        for (const node of dagResult.batches[i]) {
          allOutputs.delete(node.id);
          await emitter.emit('status_update', {
            nodeId: node.id,
            status: 'pending',
            timestamp: Date.now(),
          });
        }
      }

      batchIdx = minBatchIdx - 1;
      continue;
    }
  }

  // ─── Phase 3: Compute execution metrics ────────────────────────────────────

  const totalLatencyMs = Math.round(performance.now() - executionStart);

  // Speedup S = T_single / T_multi
  // T_single = sum of all individual agent durations (sequential)
  // T_multi = actual wall-clock time (parallel)
  const speedupS = totalLatencyMs > 0
    ? Math.round((sequentialTime / totalLatencyMs) * 100) / 100
    : 1;

  const parallelEfficiency = dagResult.batches.length > 0
    ? Math.round((workflow.nodes.length / dagResult.batches.length) * 100) / 100
    : 1;

  const metrics: ExecutionMetrics = {
    speedupS,
    totalTokens,
    totalLatencyMs,
    parallelEfficiency,
    nodeTimings,
  };

  // Determine overall status
  const hasFailures = nodeTimings.some((t) => t.status === 'failed');
  const status = hasFailures ? 'failed' : 'completed';

  // Update final execution status and metrics in DB
  await updateExecution(executionId, status, metrics).catch((err) => {
    log.error({ executionId, error: err.message }, 'Failed to update execution final status');
  });

  // ─── Phase 4: Emit completion ──────────────────────────────────────────────

  await emitter.emit('complete', {
    executionId,
    metrics,
    timestamp: Date.now(),
  });

  log.info(
    { executionId, status, speedupS, totalTokens, totalLatencyMs },
    'Workflow execution finished',
  );

  return {
    executionId,
    status,
    metrics,
    outputs: allOutputs,
  };
}
