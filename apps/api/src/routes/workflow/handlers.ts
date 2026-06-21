import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { WorkflowPayload, SSEEventType } from '@qwenweaver/types';
import { getQueryProvider } from '@qwenweaver/database';
import type { StreamEmitter, SSEPayloadMap } from '../../engine/types.js';
import { executeWorkflow } from '../../engine/executor.js';
import { createModuleLogger } from '../../logger.js';
import { active_sse_connections } from '../../metrics.js';
import type { Variables } from '../../index.js';

const log = createModuleLogger('routes/workflow.handlers');

// ─── Active execution emitters registry (live socket collections) ───────────

export interface ActiveExecution {
  emitters: Set<StreamEmitter>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: Awaited<ReturnType<typeof executeWorkflow>>;
  promise?: Promise<void>;
  resolve?: () => void;
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
  const body = (await c.req.json()) as z.infer<typeof WorkflowPayload>;
  const executionId = crypto.randomUUID();
  const userId = c.get('jwtPayload').sub;

  const workflow: z.infer<typeof WorkflowPayload> = {
    name: body.name,
    description: body.description,
    nodes: body.nodes,
    edges: body.edges,
  };

  const provider = getQueryProvider();
  const workflowId = await provider.saveWorkflow(userId, workflow);
  await provider.createExecution(executionId, workflowId, userId);

  let resolveExecution: () => void;
  const promise = new Promise<void>((resolve) => {
    resolveExecution = resolve;
  });

  activeExecutions.set(executionId, {
    emitters: new Set(),
    status: 'pending',
    promise,
    resolve: resolveExecution!,
  });

  log.info(
    { executionId, workflowId, userId, nodeCount: workflow.nodes.length, edgeCount: workflow.edges.length },
    'Workflow execution created in database',
  );

  runExecutionAsync(executionId, workflow).catch((error) => {
    log.error({ executionId, error: (error as Error).message }, 'Execution crashed');
  });

  return c.json({ executionId, status: 'pending' }, 201);
}

export async function handleStream(c: Context<{ Variables: Variables }>) {
  const executionId = c.req.param('executionId')!;
  const userId = c.get('jwtPayload').sub;
  const provider = getQueryProvider();
  
  let execution = activeExecutions.get(executionId);

  const dbExecution = await provider.getExecution(executionId);
  if (!dbExecution || dbExecution.userId !== userId) {
    return c.json({ error: 'Execution not found or unauthorized' }, 404);
  }

  if (!execution) {
    execution = {
      emitters: new Set(),
      status: dbExecution.status as any,
    };
    activeExecutions.set(executionId, execution);
  }

  return streamSSE(c, async (stream) => {
    active_sse_connections.inc();
    let closed = false;
    let abortResolver: () => void;
    const abortPromise = new Promise<void>((resolve) => {
      abortResolver = resolve;
    });

    stream.onAbort(() => {
      if (!closed) active_sse_connections.dec();
      closed = true;
      abortResolver();
      log.info({ executionId }, 'SSE client disconnected');
    });

    const sseQueue = new SSEQueue();

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

    execution!.emitters.add(emitter);

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

    if (execution!.result) {
      await emitter.emit('complete', {
        executionId,
        metrics: execution!.result.metrics,
        timestamp: Date.now(),
      });
      execution!.emitters.delete(emitter);
      return;
    }

    // Wait until either the stream is aborted or the execution promise resolves
    if (execution!.promise) {
      await Promise.race([execution!.promise, abortPromise]);
    } else {
      // Fallback polling if re-attached
      while (!closed && execution!.status !== 'completed' && execution!.status !== 'failed') {
        await Promise.race([new Promise((res) => setTimeout(res, 500)), abortPromise]);
      }
    }

    execution!.emitters.delete(emitter);
    if (!closed) {
      active_sse_connections.dec();
      closed = true;
    }
  });
}

export async function handleGetStatus(c: Context<{ Variables: Variables }>) {
  const executionId = c.req.param('executionId')!;
  const userId = c.get('jwtPayload').sub;
  const provider = getQueryProvider();

  const dbExecution = await provider.getExecution(executionId);
  if (dbExecution) {
    if (dbExecution.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    return c.json({
      id: dbExecution.id,
      status: dbExecution.status,
      metrics: dbExecution.metrics,
    }, 200);
  }

  const execution = activeExecutions.get(executionId);
  if (!execution) {
    return c.json({ error: 'Execution not found' }, 404);
  }

  return c.json({
    id: executionId,
    status: execution.status,
    metrics: execution.result?.metrics,
  }, 200);
}

// ─── Async execution runner ─────────────────────────────────────────────────

async function runExecutionAsync(executionId: string, workflow: WorkflowPayload): Promise<void> {
  const execution = activeExecutions.get(executionId);
  if (!execution) return;

  execution.status = 'running';

  const broadcastEmitter: StreamEmitter = {
    emit: async <K extends z.infer<typeof SSEEventType>>(event: K, data: SSEPayloadMap[K]) => {
      // Clone set to avoid iteration issues if emitters are removed
      const currentEmitters = Array.from(execution.emitters);
      const promises = currentEmitters.map((e) =>
        e.emit(event, data).catch(() => {
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

  if (execution.resolve) {
    execution.resolve();
  }

  log.info(
    { executionId, status: result.status },
    'Execution finished',
  );
  
  // Clean up execution map after a short delay to allow clients to receive final messages
  setTimeout(() => {
    activeExecutions.delete(executionId);
  }, 5000);
}
