import type { WorkflowPayload, ExecutionMetrics, NodeTiming } from '@qwenweaver/types';
import type {
  UpstreamOutputs,
  ExecutionResult,
  ExecutionOptions,
  StreamEmitter,
} from './types.js';
import { compileDag } from './dag-compiler.js';
import { runAgent } from './agent-runner.js';
import { getQueryProvider } from '@qwenweaver/database';
import { createModuleLogger } from '../logger.js';

const log = createModuleLogger('engine/executor');

export async function executeWorkflow(
  workflow: WorkflowPayload,
  executionId: string,
  emitter: StreamEmitter,
  options: ExecutionOptions = { maxNegotiationRounds: 3, persistLogs: true },
): Promise<ExecutionResult> {
  const executionStart = performance.now();
  const provider = getQueryProvider();
  
  // Try fetching to get userId
  let executionUserId = '';
  const existing = await provider.getExecution(executionId).catch(() => null);
  if (existing) {
    executionUserId = existing.userId;
    await provider.updateExecution(executionId, 'running').catch((err: Error) => {
      log.error({ executionId, error: err.message }, 'Failed to set execution status to running');
    });
  } else {
    log.error({ executionId }, 'Execution not found at start');
  }

  log.info(
    { executionId, workflowName: workflow.name, nodeCount: workflow.nodes.length },
    'Starting workflow execution',
  );

  const dagResult = compileDag(workflow.nodes, workflow.edges);

  if (dagResult.hasCycle) {
    const errorMsg = `Cycle detected in workflow DAG. Nodes involved: ${dagResult.cycleNodeIds?.join(', ')}`;

    log.error({ executionId, cycleNodeIds: dagResult.cycleNodeIds }, errorMsg);

    await provider.updateExecution(executionId, 'failed').catch((err: Error) => {
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

  const allOutputs: UpstreamOutputs = new Map();
  const nodeTimings: NodeTiming[] = [];
  let totalTokens = 0;
  let sequentialTime = 0; 
  let currentRound = 0;
  const maxNegotiationRounds = options?.maxNegotiationRounds ?? 3;
  const cumulativeFeedback = new Map<string, string>();

  const nodeToBatchIdx = new Map<string, number>();
  for (let i = 0; i < dagResult.batches.length; i++) {
    for (const node of dagResult.batches[i]) {
      nodeToBatchIdx.set(node.id, i);
    }
  }

  const incomingEdges = new Map<string, string[]>();
  for (const edge of workflow.edges) {
    const sources = incomingEdges.get(edge.target) ?? [];
    sources.push(edge.source);
    incomingEdges.set(edge.target, sources);
  }

  const backgroundTasks: Promise<void>[] = [];

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

    for (const node of batch) {
      await emitter.emit('status_update', {
        nodeId: node.id,
        status: 'running',
        timestamp: Date.now(),
      });
    }

    // Use Promise.allSettled to not discard sibling results on failure
    const batchSettledResults = await Promise.allSettled(
      batch.map(async (node) => {
        const upstreamSources = incomingEdges.get(node.id) ?? [];
        const upstream: UpstreamOutputs = new Map();

        for (const sourceId of upstreamSources) {
          const sourceResult = allOutputs.get(sourceId);
          if (sourceResult) {
            upstream.set(sourceId, sourceResult);

            await emitter.emit('edge_active', {
              sourceId,
              targetId: node.id,
              timestamp: Date.now(),
            });
          }
        }

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

        // Non-blocking log save
        const logPromise = provider.saveAgentLog(
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
        ).catch((err: Error) => {
          log.error({ executionId, nodeId: result.nodeId, error: err.message }, 'Failed to save agent log');
        });
        
        backgroundTasks.push(logPromise);

        return result;
      }),
    );

    const batchResults = batchSettledResults.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const node = batch[i];
      const errorMsg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      return {
        nodeId: node.id,
        status: 'failed' as const,
        outputs: [],
        text: '',
        tokensUsed: 0,
        durationMs: 0,
        error: errorMsg,
      };
    });

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

  // Await background tasks (logs)
  await Promise.allSettled(backgroundTasks);

  const totalLatencyMs = Math.round(performance.now() - executionStart);

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

  const hasFailures = nodeTimings.some((t) => t.status === 'failed');
  const status = hasFailures ? 'failed' : 'completed';

  await provider.updateExecution(executionId, status, metrics).catch((err: Error) => {
    log.error({ executionId, error: err.message }, 'Failed to update execution final status');
  });

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
