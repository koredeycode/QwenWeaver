import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { WorkflowPayload, SSEEventType } from '@qwenweaver/types';
import { saveWorkflow, createExecution, getExecution } from '@qwenweaver/database';
import type { StreamEmitter, SSEPayloadMap } from '../../engine/types.js';
import { executeWorkflow } from '../../engine/executor.js';
import { createModuleLogger } from '../../logger.js';
import type { Variables } from '../../index.js';

const log = createModuleLogger('routes/workflow.handlers');

// ─── Active execution emitters registry (live socket collections) ───────────

export interface ActiveExecution {
  emitters: Set<StreamEmitter>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: Awaited<ReturnType<typeof executeWorkflow>>;
}

export const activeExecutions = new Map<string, ActiveExecution>();

class SSEQueue {
  private queue: Promise<void> = Promise.resolve();

  async enqueue(fn: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(async () => {
      try {
        await fn();
      } catch {
        // ignore errors to not block the chain
      }
    });
    return this.queue;
  }
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

export async function handleExecute(c: Context<{ Variables: Variables }>) {
  const body = c.req.valid('json' as never) as any;
  const executionId = crypto.randomUUID();

  const workflow: z.infer<typeof WorkflowPayload> = {
    name: body.name,
    description: body.description,
    nodes: body.nodes,
    edges: body.edges,
  };

  // Save workflow structure and create execution record in the database
  const workflowId = await saveWorkflow(workflow);
  await createExecution(executionId, workflowId);

  // Initialize emitters collection in memory
  activeExecutions.set(executionId, {
    emitters: new Set(),
    status: 'pending',
  });

  log.info(
    { executionId, workflowId, nodeCount: workflow.nodes.length, edgeCount: workflow.edges.length },
    'Workflow execution created in database',
  );

  // Start execution asynchronously (non-blocking)
  runExecutionAsync(executionId, workflow).catch((error) => {
    log.error({ executionId, error: (error as Error).message }, 'Execution crashed');
  });

  return c.json({ executionId, status: 'pending' }, 201);
}

export async function handleStream(c: Context<{ Variables: Variables }>) {
  const executionId = c.req.param('executionId')!;
  let execution = activeExecutions.get(executionId);

  // Check if it exists in database
  const dbExecution = await getExecution(executionId);
  if (!dbExecution) {
    return c.json({ error: 'Execution not found' }, 404);
  }

  // If it's not currently running in memory, initialize activeExecutions so they can connect
  if (!execution) {
    execution = {
      emitters: new Set(),
      status: dbExecution.status as any,
    };
    activeExecutions.set(executionId, execution);
  }

  return streamSSE(c, async (stream) => {
    let closed = false;

    stream.onAbort(() => {
      closed = true;
      log.info({ executionId }, 'SSE client disconnected');
    });

    const sseQueue = new SSEQueue();

    // Create an emitter for this SSE connection
    const emitter: StreamEmitter = {
      emit: async <K extends z.infer<typeof SSEEventType>>(event: K, data: SSEPayloadMap[K]) => {
        if (closed) return;
        await sseQueue.enqueue(async () => {
          if (closed) return;
          await stream.writeSSE({
            event,
            data: JSON.stringify(data),
            id: crypto.randomUUID().slice(0, 8),
          });
        });
      },
      isClosed: () => closed,
    };

    // Register this emitter
    execution!.emitters.add(emitter);

    // If database execution is already completed or failed, emit complete and finish
    if (dbExecution.status === 'completed' || dbExecution.status === 'failed') {
      await emitter.emit('complete', {
        executionId,
        metrics: dbExecution.metrics || {
          speedupS: 1,
          totalTokens: 0,
          totalLatencyMs: 0,
          parallelEfficiency: 1,
          nodeTimings: [],
        },
        timestamp: Date.now(),
      });
      execution!.emitters.delete(emitter);
      return;
    }

    // If execution in-memory has a cached result, replay it
    if (execution!.result) {
      await emitter.emit('complete', {
        executionId,
        metrics: execution!.result.metrics,
        timestamp: Date.now(),
      });
      execution!.emitters.delete(emitter);
      return;
    }

    // Keep the connection alive until execution completes or client disconnects
    while (!closed && execution!.status !== 'completed' && execution!.status !== 'failed') {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Clean up
    execution!.emitters.delete(emitter);
  });
}

export async function handleGetStatus(c: Context<{ Variables: Variables }>) {
  const executionId = c.req.param('executionId')!;

  // Try to load from database first
  const dbExecution = await getExecution(executionId);
  if (dbExecution) {
    return c.json({
      id: dbExecution.id,
      status: dbExecution.status,
      metrics: dbExecution.metrics,
    });
  }

  // Fallback to active in-memory execution just in case
  const execution = activeExecutions.get(executionId);
  if (!execution) {
    return c.json({ error: 'Execution not found' }, 404);
  }

  return c.json({
    id: executionId,
    status: execution.status,
    metrics: execution.result?.metrics,
  });
}

// ─── Async execution runner ─────────────────────────────────────────────────

async function runExecutionAsync(executionId: string, workflow: WorkflowPayload): Promise<void> {
  const execution = activeExecutions.get(executionId);
  if (!execution) return;

  execution.status = 'running';

  // Create a broadcast emitter that fanned out to all connected SSE clients
  const broadcastEmitter: StreamEmitter = {
    emit: async <K extends z.infer<typeof SSEEventType>>(event: K, data: SSEPayloadMap[K]) => {
      const promises = Array.from(execution.emitters).map((e) =>
        e.emit(event, data).catch(() => {
          // Remove dead emitters
          execution.emitters.delete(e);
        }),
      );
      await Promise.all(promises);
    },
    isClosed: () => execution.emitters.size === 0,
  };

  const result = await executeWorkflow(
    workflow,
    executionId,
    broadcastEmitter,
  );

  execution.status = result.status;
  execution.result = result;

  log.info(
    { executionId, status: result.status },
    'Execution finished',
  );
}
