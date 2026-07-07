import type { WorkflowPayload, ExecutionMetrics, NodeTiming, BusMessage } from '@qwenweaver/types';
import type { AgentResult, ExecutionResult, ExecutionOptions, StreamEmitter } from './types.js';
import { compileDag } from './dag-compiler.js';
import { runAgent } from './agent-runner.js';
import { runDebate } from './debate-runner.js';
import { DataBus, type BusMessagePersistFn } from './message-bus.js';
import { buildUserMessageFromBus } from './prompt-builder.js';
import { buildChannelId, extractPayloadText } from './shared.js';
import { getQueryProvider } from '@qwenweaver/database';
import { createModuleLogger } from '../logger.js';
import { createDiagnosticLogger, type CopilotDiag } from '../diagnostic-logger.js';
import { executions_total } from '../metrics.js';

const log = createModuleLogger('engine/executor');

export async function executeWorkflow(
  workflow: WorkflowPayload,
  executionId: string,
  emitter: StreamEmitter,
  options: ExecutionOptions = { maxNegotiationRounds: 3, persistLogs: true, signal: undefined },
  userId?: string,
): Promise<ExecutionResult> {
  const executionStart = performance.now();
  const provider = getQueryProvider();

  const diag = createDiagnosticLogger(`exec-${executionId}`);
  diag.log(`╔══ WORKFLOW EXECUTION START ══╗`);
  diag.log(`Execution ID: ${executionId}`);
  diag.log(
    `Workflow: "${workflow.name}" (${workflow.nodes.length} nodes, ${workflow.edges.length} edges)`,
  );
  diag.log(
    `Options: persistLogs=${options.persistLogs}, maxRounds=${options.maxNegotiationRounds}`,
  );

  const existing = await provider.getExecution(executionId).catch(() => null);
  if (existing) {
    if (options.persistLogs) {
      await provider.updateExecution(executionId, 'running').catch((err: Error) => {
        log.error({ executionId, error: err.message }, 'Failed to set execution status to running');
      });
    }
  } else {
    log.error({ executionId }, 'Execution not found at start');
    diag.log('ERROR: Execution not found at start');
  }

  log.info(
    { executionId, workflowName: workflow.name, nodeCount: workflow.nodes.length },
    'Starting workflow execution',
  );

  const dagResult = compileDag(workflow.nodes, workflow.edges);
  diag.log(`DAG compiled: ${dagResult.batches.length} batches, cycle=${dagResult.hasCycle}`);

  if (dagResult.hasCycle) {
    const errorMsg = `Cycle detected in workflow DAG. Nodes involved: ${dagResult.cycleNodeIds?.join(', ')}`;

    log.error({ executionId, cycleNodeIds: dagResult.cycleNodeIds }, errorMsg);
    diag.log(`CYCLE DETECTED: ${errorMsg}`);

    if (options.persistLogs) {
      await provider.updateExecution(executionId, 'failed').catch((err: Error) => {
        log.error(
          { executionId, error: err.message },
          'Failed to set execution status to failed on cycle',
        );
      });
    }

    await emitter.emit('error', {
      message: errorMsg,
      timestamp: Date.now(),
    });

    diag.close();
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
  for (let i = 0; i < dagResult.batches.length; i++) {
    diag.log(`  Batch ${i}: [${dagResult.batches[i].map((n) => n.id).join(', ')}]`);
  }

  // Reset workspace blackboard for a fresh execution
  try {
    await provider.clearWorkspace(executionId);
    diag.log('Workspace blackboard cleared');
  } catch (err) {
    log.warn({ executionId, error: (err as Error).message }, 'Failed to clear workspace');
    diag.log('WARN: Failed to clear workspace');
  }

  // Clear any previous execution messages
  try {
    await provider.clearExecutionMessages(executionId);
    diag.log('Execution messages cleared');
  } catch (err) {
    log.warn({ executionId, error: (err as Error).message }, 'Failed to clear execution messages');
  }

  // Create DataBus — the unified message bus for all inter-agent communication.
  // Bus messages are persisted to DB asynchronously.
  const persistFn: BusMessagePersistFn = async (msg: BusMessage) => {
    await provider.writeExecutionMessage({
      id: msg.id,
      executionId: msg.executionId,
      topic: msg.topic,
      sourceNodeId: msg.sourceNodeId,
      messageType: msg.messageType,
      payload: msg.payload,
      contentType: msg.contentType ?? null,
      round: msg.round ?? 0,
      createdAt: msg.timestamp,
    });
  };
  const dataBus = new DataBus(executionId, options.persistLogs ? persistFn : undefined);

  const nodeResults = new Map<string, AgentResult>();
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

  // Identify conversation-mode edges
  const conversationEdges = workflow.edges.filter((e) => e.data?.subscription?.conversationMode);
  diag.log(`Conversation-mode edges: ${conversationEdges.length}`);

  const backgroundTasks: Promise<void>[] = [];

  for (let batchIdx = 0; batchIdx < dagResult.batches.length; batchIdx++) {
    const batch = dagResult.batches[batchIdx];

    if (emitter.isClosed() || options.signal?.aborted) {
      log.warn({ executionId, batchIdx }, 'Client disconnected or aborted, aborting execution');
      break;
    }

    log.info({ executionId, batchIdx, batchSize: batch.length, currentRound }, 'Executing batch');
    diag.log(
      `BATCH ${batchIdx} START: ${batch.length} nodes [${batch.map((n) => n.id).join(', ')}]`,
    );

    for (const node of batch) {
      await emitter.emit('status_update', {
        nodeId: node.id,
        status: 'running',
        timestamp: Date.now(),
      });
    }

    // Execute all nodes in this batch in parallel
    const batchSettledResults = await Promise.allSettled(
      batch.map(async (node) => {
        // Collect messages from DataBus for this node
        const upstreamMessages = dataBus.getMessagesForNode(node.id, workflow.edges);
        const conversationMsgs = dataBus.getConversationMessages(node.id, conversationEdges);
        const nodeConversationEdges = workflow.edges.filter(
          (e) =>
            (e.target === node.id || e.source === node.id) &&
            e.data?.subscription?.conversationMode,
        );

        // Check for upstream failures
        for (const msg of upstreamMessages) {
          if (msg.messageType === 'error') {
            throw new Error(`Upstream dependency ${msg.sourceNodeId} failed`);
          }
        }

        // Fire edge_active events for upstream edges that produced output
        for (const msg of upstreamMessages) {
          await emitter.emit('edge_active', {
            sourceId: msg.sourceNodeId,
            targetId: node.id,
            timestamp: Date.now(),
          });
        }

        let nodeToRun = node;
        const feedback = cumulativeFeedback.get(node.id);
        if (feedback) {
          nodeToRun = {
            ...node,
            data: {
              ...node.data,
              _revisionFeedback: feedback,
            },
          };
          diag.log(`  Feedback injected for ${node.id}: "${feedback.substring(0, 200)}..."`);
        }

        // Create the bus message context for this node
        const busMessages: BusMessage[] = [...upstreamMessages, ...conversationMsgs];

        let result: AgentResult;
        if (node.type === 'debate_arena') {
          const participantIds = workflow.edges
            .filter((e) => e.target === node.id)
            .map((e) => e.source);
          const participantNodes = workflow.nodes.filter((n) => participantIds.includes(n.id));
          diag.log(`  DEBATE ARENA: ${node.id} with ${participantNodes.length} participants`);
          result = await runDebate(
            nodeToRun,
            participantNodes,
            busMessages,
            emitter,
            executionId,
            userId,
            options.signal,
            diag,
          );
        } else {
          diag.log(`  RUN AGENT: ${node.id} (${node.type}) — diag attached: ${!!diag}`);
          result = await runAgent(
            nodeToRun,
            busMessages,
            emitter,
            executionId,
            userId,
            undefined,
            options.signal,
            diag,
          );
        }

        // Non-blocking log save
        if (options.persistLogs) {
          const logPromise = provider
            .saveAgentLog(
              executionId,
              result.nodeId,
              result.status,
              {
                prompt: nodeToRun.data.label || 'Agent Execution',
                systemPrompt: nodeToRun.data.systemPrompt || undefined,
                upstreamOutputs:
                  upstreamMessages.length > 0
                    ? Object.fromEntries(
                        upstreamMessages.map((m) => [
                          m.sourceNodeId,
                          { text: extractPayloadText(m) ?? '', status: m.messageType },
                        ]),
                      )
                    : undefined,
              },
              {
                text: result.text,
                outputs: result.outputs,
                reasoning: result.reasoning,
                toolCalls: result.toolCalls,
                toolResults: result.toolResults,
              },
              result.tokensUsed,
              result.error,
            )
            .catch((err: Error) => {
              log.error(
                { executionId, nodeId: result.nodeId, error: err.message },
                'Failed to save agent log',
              );
            });

          backgroundTasks.push(logPromise);
        }

        // Publish result to DataBus
        dataBus.publish({
          topic: `node:${node.id}.output`,
          sourceNodeId: node.id,
          messageType: result.status === 'completed' ? 'output' : 'error',
          payload: { text: result.text, outputs: result.outputs },
          contentType: 'text',
        });

        // Emit bus_message event to frontend
        await emitter.emit('bus_message', {
          message: {
            id: crypto.randomUUID(),
            executionId,
            topic: `node:${node.id}.output`,
            sourceNodeId: node.id,
            messageType: result.status === 'completed' ? 'output' : 'error',
            payload: { text: result.text, outputs: result.outputs },
            contentType: 'text',
            timestamp: Date.now(),
          },
        });

        return result;
      }),
    );

    const batchResults = batchSettledResults.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const node = batch[i];
      const errorMsg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      diag.log(`  BATCH PROMISE REJECTED: ${node.id} — ${errorMsg}`);
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
      nodeResults.set(result.nodeId, result);
      totalTokens += result.tokensUsed;
      sequentialTime += result.durationMs;

      diag.log(
        `  RESULT: ${result.nodeId} — status=${result.status}, tokens=${result.tokensUsed}, duration=${result.durationMs}ms`,
      );
      if (result.reasoning) {
        diag.log(`    reasoning length: ${result.reasoning.length} chars`);
      }
      if (result.toolCalls && result.toolCalls.length > 0) {
        diag.log(`    toolCalls: ${result.toolCalls.length}`);
      }

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
        outputUrl: result.outputs?.[0]?.value,
        outputParts: result.outputs,
        outputText: result.text,
        error: result.error,
      });

      if (result.status === 'failed') {
        log.error({ executionId, nodeId: result.nodeId, error: result.error }, 'Agent failed');
      }
    }

    // ─── Supervisor rejection detection ────────────────────────────────────────
    let rejectionDetected = false;
    let supervisorFeedback = '';
    const upstreamWorkerIdsToReset: string[] = [];

    for (const result of batchResults) {
      const nodePayload = batch.find((n) => n.id === result.nodeId);
      const textVal =
        result.text ?? result.outputs?.map((o: { value: string }) => o.value).join('\n') ?? '';
      if (
        nodePayload &&
        nodePayload.type === 'supervisor' &&
        result.status === 'completed' &&
        /\[REJECT\]/i.test(textVal) &&
        currentRound < maxNegotiationRounds
      ) {
        rejectionDetected = true;
        const feedback = textVal.replace(/\[REJECT\]/gi, '').trim();
        supervisorFeedback += supervisorFeedback
          ? `\n\n[ADDITIONAL SUPERVISOR FEEDBACK]: ${feedback}`
          : feedback;

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

      diag.log(`SUPERVISOR REJECTION detected (round ${currentRound})`);
      diag.log(`  Feedback: "${supervisorFeedback.substring(0, 300)}"`);
      diag.log(`  Workers to reset: [${upstreamWorkerIdsToReset.join(', ')}]`);
      diag.log(`  Backtracking from batch ${batchIdx} to batch ${minBatchIdx}`);

      log.info(
        { executionId, minBatchIdx, currentRound, upstreamWorkerIdsToReset },
        `Backtracking execution from batch ${batchIdx} to batch ${minBatchIdx}`,
      );

      for (const workerId of upstreamWorkerIdsToReset) {
        const existingFeedback = cumulativeFeedback.get(workerId) ?? '';
        cumulativeFeedback.set(
          workerId,
          existingFeedback + `\n\n[REVISION REQUESTED BY SUPERVISOR]: ${supervisorFeedback}`,
        );
      }

      // Remove DataBus messages and node results for backtracked nodes
      for (let i = minBatchIdx; i <= batchIdx; i++) {
        for (const node of dagResult.batches[i]) {
          const previous = nodeResults.get(node.id);
          if (previous) {
            totalTokens -= previous.tokensUsed;
            sequentialTime -= previous.durationMs;
          }
          nodeResults.delete(node.id);
          dataBus.removeNodeOutputs(node.id);
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

    // ─── Conversation exchange (multi-round) ──────────────────────────────────
    // For edges with conversationMode enabled, run multi-round exchanges
    // between participants within the current batch.
    const batchNodeIds = new Set(batch.map((n) => n.id));
    const relevantConversationEdges = conversationEdges.filter(
      (e) => batchNodeIds.has(e.source) || batchNodeIds.has(e.target),
    );

    if (relevantConversationEdges.length > 0) {
      diag.log(
        `CONVERSATION EXCHANGE: ${relevantConversationEdges.length} edges in batch ${batchIdx}`,
      );
      log.info(
        { executionId, batchIdx, conversationEdgeCount: relevantConversationEdges.length },
        'Running conversation exchange',
      );

      for (const edge of relevantConversationEdges) {
        const channelId = buildChannelId(edge.source, edge.target);
        const maxRounds = edge.data?.subscription?.maxRounds ?? 5;
        const participants = [edge.source, edge.target];
        const topic = `conversation:${channelId}`;

        for (let round = 1; round <= maxRounds; round++) {
          for (const agentId of participants) {
            const agentBatchIdx = nodeToBatchIdx.get(agentId);
            if (agentBatchIdx === undefined || agentBatchIdx > batchIdx) continue;

            const transcriptMessages = dataBus.getConversationChannelMessages(channelId);
            const alreadyResponded = transcriptMessages.some(
              (m) => m.sourceNodeId === agentId && m.round === round,
            );
            if (alreadyResponded) continue;

            // Count how many messages this agent has sent in this round across all channels
            const allConvMsgs = dataBus.getConversationMessages(agentId, conversationEdges);
            const alreadyRespondedGeneral = allConvMsgs.some(
              (m) => m.sourceNodeId === agentId && m.round === round,
            );
            if (alreadyRespondedGeneral) continue;

            const agentNode = workflow.nodes.find((n) => n.id === agentId);
            if (!agentNode) continue;

            // Collect upstream + conversation messages for this agent
            const upstreamMessages = dataBus.getMessagesForNode(agentId, workflow.edges);
            const conversationMsgs = dataBus.getConversationMessages(agentId, conversationEdges);

            const busMessages: BusMessage[] = [...upstreamMessages, ...conversationMsgs];

            // Build conversation prompt via bus message context
            const conversationContextMessage = buildUserMessageFromBus(
              agentNode,
              upstreamMessages,
              conversationMsgs,
              conversationEdges,
            );

            diag.log(
              `  CONVERSATION: agent=${agentNode.id}, round=${round}/${maxRounds}, channel=${channelId}`,
            );

            const msgResult = await runAgent(
              agentNode,
              busMessages,
              emitter,
              executionId,
              userId,
              conversationContextMessage,
              options.signal,
              diag,
            );

            if (msgResult.text) {
              // Publish conversation message to DataBus
              dataBus.publish({
                topic,
                sourceNodeId: agentId,
                messageType: 'conversation',
                payload: { text: msgResult.text },
                contentType: 'text',
                round,
              });

              await emitter.emit('bus_message', {
                message: {
                  id: crypto.randomUUID(),
                  executionId,
                  topic,
                  sourceNodeId: agentId,
                  messageType: 'conversation',
                  payload: { text: msgResult.text },
                  contentType: 'text',
                  round,
                  timestamp: Date.now(),
                },
              });

              // Also emit the legacy 'message' event for backward compat
              await emitter.emit('message', {
                fromNodeId: agentId,
                toNodeId: edge.source === agentId ? edge.target : edge.source,
                content: msgResult.text,
                round,
                channelId,
                timestamp: Date.now(),
              });

              log.info(
                { executionId, channelId, agentId, round },
                'Conversation message exchanged',
              );
            }
          }
        }
      }
    }
  }

  // Await background tasks (logs)
  await Promise.allSettled(backgroundTasks);

  const totalLatencyMs = Math.round(performance.now() - executionStart);

  const speedupS =
    totalLatencyMs > 0 ? Math.round((sequentialTime / totalLatencyMs) * 100) / 100 : 1;

  const avgBatchSize =
    dagResult.batches.length > 0 ? workflow.nodes.length / dagResult.batches.length : 1;
  const parallelEfficiency =
    avgBatchSize > 0 ? Math.round((speedupS / avgBatchSize) * 100) / 100 : 1;

  const metrics: ExecutionMetrics = {
    speedupS,
    totalTokens,
    totalLatencyMs,
    parallelEfficiency,
    nodeTimings,
  };

  const hasFailures = nodeTimings.some((t) => t.status === 'failed');
  const status = hasFailures ? 'failed' : 'completed';

  if (options.persistLogs) {
    await provider.updateExecution(executionId, status, metrics).catch((err: Error) => {
      log.error({ executionId, error: err.message }, 'Failed to update execution final status');
    });
  }

  executions_total.labels(status).inc();

  await emitter.emit('complete', {
    executionId,
    metrics,
    timestamp: Date.now(),
  });

  diag.log(`══ WORKFLOW FINISHED ══`);
  diag.log(`Status: ${status}, totalLatency: ${totalLatencyMs}ms, tokens: ${totalTokens}`);
  diag.log(`Metrics: speedup=${speedupS}x, parallelism=${parallelEfficiency}`);
  diag.log(`Node timings:`);
  for (const t of nodeTimings) {
    diag.log(`  ${t.nodeId}: ${t.status} (${t.durationMs}ms, ${t.tokensUsed}tokens)`);
  }
  diag.close();

  log.info(
    { executionId, status, speedupS, totalTokens, totalLatencyMs },
    'Workflow execution finished',
  );

  return {
    executionId,
    status,
    metrics,
    outputs: nodeResults,
  };
}
