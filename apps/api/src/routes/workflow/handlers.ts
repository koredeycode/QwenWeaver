import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { WorkflowPayload, SSEEventType } from '@qwenweaver/types';
import { getQueryProvider } from '@qwenweaver/database';
import type { StreamEmitter, SSEPayloadMap } from '../../engine/types.js';
import { executeWorkflow } from '../../engine/executor.js';
import { createModuleLogger } from '../../logger.js';
import { active_sse_connections } from '../../metrics.js';
import type { Variables } from '../../index.js';
import type { Context } from 'hono';
import {
  NODE_BASE_COST,
  FIXED_COST,
  PROMPT_TOKEN_COST,
  COMPLETION_TOKEN_COST,
  MIN_COST,
  MAX_FREE_WORKFLOWS,
} from '../../config.js';

const log = createModuleLogger('routes/workflow.handlers');

// ─── Active execution emitters registry (live socket collections) ───────────

export interface ActiveExecution {
  emitters: Set<StreamEmitter>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: Awaited<ReturnType<typeof executeWorkflow>>;
  promise?: Promise<void>;
  resolve?: () => void;
  createdAt: number; // Track creation time for TTL sweep
  userId?: string;
  hasEverHadEmitter: boolean; // true once at least one SSE client connects
}

export const activeExecutions = new Map<string, ActiveExecution>();

// Periodic TTL sweep — remove stale executions older than 5 minutes
const EXECUTION_TTL_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, execution] of activeExecutions) {
    const isTerminal = execution.status === 'completed' || execution.status === 'failed';
    const isExpired = now - execution.createdAt > EXECUTION_TTL_MS;
    if (isTerminal && isExpired) {
      activeExecutions.delete(id);
      log.debug({ executionId: id }, 'TTL sweep: removed stale execution');
    }
  }
}, 60_000).unref();

class SSEQueue {
  private queue: Promise<void> = Promise.resolve();

  async enqueue(fn: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(async () => {
      try {
        await fn();
      } catch (err) {
        log.debug(
          { error: (err as Error).message },
          'SSE write failed (client may have disconnected)',
        );
      }
    });
    return this.queue;
  }
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

export const handleListWorkflows = async (c: Context<{ Variables: Variables }>) => {
  const jwtPayload = c.get('jwtPayload');
  const provider = getQueryProvider();
  const workflows = await provider.listUserWorkflows(jwtPayload.sub);
  return c.json({ workflows }, 200);
};

export const handleGetWorkflow = async (c: Context<{ Variables: Variables }>) => {
  const jwtPayload = c.get('jwtPayload');
  const workflowId = c.req.param('workflowId');
  if (!workflowId) {
    return c.json({ error: 'Missing workflowId parameter' }, 400);
  }
  const provider = getQueryProvider();
  const workflow = await provider.getWorkflow(workflowId, jwtPayload.sub);
  if (!workflow) {
    return c.json({ error: 'Workflow not found' }, 404);
  }
  return c.json(workflow, 200);
};

export const handleDeleteWorkflow = async (c: Context<{ Variables: Variables }>) => {
  const jwtPayload = c.get('jwtPayload');
  const workflowId = c.req.param('workflowId');
  if (!workflowId) {
    return c.json({ error: 'Missing workflowId parameter' }, 400);
  }
  const provider = getQueryProvider();
  const deleted = await provider.deleteWorkflow(workflowId, jwtPayload.sub);
  if (!deleted) {
    return c.json({ error: 'Workflow not found' }, 404);
  }
  return c.json({ success: true }, 200);
};

export const handleUpdateWorkflow = async (c: Context<{ Variables: Variables }>) => {
  const jwtPayload = c.get('jwtPayload');
  const workflowId = c.req.param('workflowId');
  if (!workflowId) {
    return c.json({ error: 'Missing workflowId parameter' }, 400);
  }
  const raw = await c.req.json();
  const parsed = WorkflowPayload.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'Invalid workflow', details: parsed.error.format() }, 400);
  }
  const provider = getQueryProvider();
  const existing = await provider.getWorkflow(workflowId, jwtPayload.sub);
  if (!existing) {
    return c.json({ error: 'Workflow not found' }, 404);
  }
  await provider.updateWorkflow(workflowId, jwtPayload.sub, parsed.data);
  return c.json({ workflowId }, 200);
};

export const handleSaveWorkflow = async (c: Context<{ Variables: Variables }>) => {
  const jwtPayload = c.get('jwtPayload');
  const raw = await c.req.json();
  const parsed = WorkflowPayload.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'Invalid workflow', details: parsed.error.format() }, 400);
  }
  const provider = getQueryProvider();
  const workflowCount = await provider.countUserWorkflows(jwtPayload.sub);
  if (workflowCount >= MAX_FREE_WORKFLOWS) {
    return c.json(
      { error: `Workflow limit reached. Maximum ${MAX_FREE_WORKFLOWS} workflows allowed.` },
      403,
    );
  }
  const workflowId = await provider.saveWorkflow(jwtPayload.sub, parsed.data);
  return c.json({ workflowId }, 201);
};

export const handleExecute = async (c: Context<{ Variables: Variables }>) => {
  const raw = await c.req.json();

  // Accept optional workflowId alongside the DAG
  const requestWorkflowId: string | undefined = raw.workflowId;
  const parsed = WorkflowPayload.safeParse(raw);

  if (!parsed.success) {
    return c.json({ error: 'Invalid workflow payload', details: parsed.error.format() }, 400);
  }

  const body = parsed.data;
  const executionId = crypto.randomUUID();
  const userId = c.get('jwtPayload').sub;

  const workflow: z.infer<typeof WorkflowPayload> = {
    id: body.id,
    name: body.name,
    description: body.description,
    nodes: body.nodes,
    edges: body.edges,
  };

  const provider = getQueryProvider();
  let workflowId: string;

  if (requestWorkflowId) {
    // Update existing workflow then execute it
    const existing = await provider.getWorkflow(requestWorkflowId, userId);
    if (!existing) {
      return c.json({ error: 'Workflow not found' }, 404);
    }
    await provider.updateWorkflow(requestWorkflowId, userId, workflow);
    workflowId = requestWorkflowId;
  } else {
    // Save as new workflow
    workflowId = await provider.saveWorkflow(userId, workflow);
  }

  await provider.createExecution(executionId, workflowId, userId);

  // ─── MCP auth validation ──────────────────────────────────────────────
  const mcpNodes = workflow.nodes.filter((n) => n.type === 'mcp_tool');
  for (const node of mcpNodes) {
    const auth = node.data.mcpAuthConfig;
    if (!auth || !auth.type || auth.type === 'none') continue;

    if (auth.credentialId) {
      const credential = await provider.getCredential(auth.credentialId, userId);
      if (!credential) {
        const msg = `Node "${node.data.label || node.id}" references credential "${auth.credentialId}" that does not exist`;
        return c.json({ error: msg }, 400);
      }
    } else if (!auth.apiKey && !auth.token && !(auth.username && auth.password)) {
      const msg = `Node "${node.data.label || node.id}" has auth type "${auth.type}" but no credential or inline auth configured`;
      return c.json({ error: msg }, 400);
    }
  }

  // ─── Credit check ──────────────────────────────────────────────────────
  const { balance } = await provider.getUserCredits(userId);
  const estimatedCost = estimateExecutionCost(workflow);
  if (balance < estimatedCost) {
    log.warn({ userId, balance, estimatedCost }, 'Insufficient credits for execution');
    return c.json({ error: 'Insufficient credits', balance, required: estimatedCost }, 402);
  }

  let resolveExecution: () => void;
  const promise = new Promise<void>((resolve) => {
    resolveExecution = resolve;
  });

  activeExecutions.set(executionId, {
    emitters: new Set(),
    status: 'pending',
    promise,
    resolve: resolveExecution!,
    createdAt: Date.now(),
    userId,
    hasEverHadEmitter: false,
  });

  log.info(
    {
      executionId,
      workflowId,
      userId,
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
    },
    'Workflow execution created in database',
  );

  runExecutionAsync(executionId, workflow, userId).catch((error) => {
    log.error({ executionId, error: (error as Error).message }, 'Execution crashed');
  });

  return c.json({ executionId, workflowId, status: 'pending' }, 201);
};

export const handleStream = async (c: Context<{ Variables: Variables }>) => {
  const executionId = c.req.param('executionId');
  if (!executionId) {
    return c.json({ error: 'Missing executionId parameter' }, 400);
  }
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
      createdAt: Date.now(),
      hasEverHadEmitter: false,
    };
    activeExecutions.set(executionId, execution);
  }

  c.header('X-Accel-Buffering', 'no');
  c.header('Cache-Control', 'no-cache, no-transform');

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
    execution!.hasEverHadEmitter = true;

    // Send a 1KB ping payload immediately to forcefully flush any intermediate HTTP proxy buffers
    // that might be waiting for a minimum chunk size before yielding to the fetch API.
    await emitter.emit('ping', { data: ' '.repeat(1024) });

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
};

export const handleGetStatus = async (c: Context<{ Variables: Variables }>) => {
  const executionId = c.req.param('executionId');
  if (!executionId) {
    return c.json({ error: 'Missing executionId parameter' }, 400);
  }
  const userId = c.get('jwtPayload').sub;
  const provider = getQueryProvider();

  const dbExecution = await provider.getExecution(executionId);
  if (dbExecution) {
    if (dbExecution.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    return c.json(
      {
        id: dbExecution.id,
        status: dbExecution.status,
        metrics: dbExecution.metrics,
      },
      200,
    );
  }

  const execution = activeExecutions.get(executionId);
  if (!execution) {
    return c.json({ error: 'Execution not found' }, 404);
  }

  return c.json(
    {
      id: executionId,
      status: execution.status,
      metrics: execution.result?.metrics,
    },
    200,
  );
};

// ─── Cost estimation ──────────────────────────────────────────────────────────

function estimateExecutionCost(workflow: z.infer<typeof WorkflowPayload>): number {
  let total = FIXED_COST;
  for (const node of workflow.nodes) {
    total += NODE_BASE_COST[node.type] ?? 2;
  }
  return Math.max(total, MIN_COST);
}

function calculateFinalCost(
  workflow: z.infer<typeof WorkflowPayload>,
  totalTokens: number,
): number {
  const baseCost = estimateExecutionCost(workflow);
  const tokenCost = Math.round(totalTokens * (PROMPT_TOKEN_COST + COMPLETION_TOKEN_COST));
  return Math.max(baseCost + tokenCost, MIN_COST);
}

// ─── Async execution runner ─────────────────────────────────────────────────

async function runExecutionAsync(
  executionId: string,
  workflow: WorkflowPayload,
  userId?: string,
): Promise<void> {
  const execution = activeExecutions.get(executionId);
  if (!execution) return;

  // Wait up to 3s for at least one SSE client to connect before starting
  const sseWaitStart = Date.now();
  while (execution.emitters.size === 0 && Date.now() - sseWaitStart < 3000) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  execution.status = 'running';

  // Wrap in try/finally to guarantee cleanup even on crash
  try {
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
      isClosed: () => execution.hasEverHadEmitter && execution.emitters.size === 0,
    };

    const result = await executeWorkflow(
      workflow,
      executionId,
      broadcastEmitter,
      undefined,
      userId,
    );

    execution.status = result.status;
    execution.result = result;

    // ─── Credit deduction ────────────────────────────────────────────────
    if (result.status === 'completed') {
      try {
        const totalTokens = result.metrics?.totalTokens ?? 0;
        const cost = calculateFinalCost(workflow, totalTokens);
        const provider = getQueryProvider();
        const dbExec = await provider.getExecution(executionId);
        if (dbExec) {
          await provider.deductCredits(
            dbExec.userId,
            cost,
            `Execution ${executionId}`,
            executionId,
          );
          log.info({ executionId, cost, totalTokens }, 'Credits deducted for execution');
        }
      } catch (err) {
        log.error({ executionId, error: (err as Error).message }, 'Failed to deduct credits');
      }
    }

    log.info({ executionId, status: result.status }, 'Execution finished');
  } finally {
    // Always resolve the promise and schedule cleanup
    if (execution.resolve) {
      execution.resolve();
    }

    // Clean up execution map after a short delay to allow clients to receive final messages
    setTimeout(() => {
      activeExecutions.delete(executionId);
    }, 5000);
  }
}
