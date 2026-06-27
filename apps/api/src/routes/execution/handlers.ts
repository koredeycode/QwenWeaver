import { getQueryProvider } from '@qwenweaver/database';
import { createModuleLogger } from '../../logger.js';
import type { Variables } from '../../index.js';
import type { Context } from 'hono';

const log = createModuleLogger('routes/execution.handlers');

export const handleListExecutions = async (c: Context<{ Variables: Variables }>) => {
  const userId = c.get('jwtPayload').sub;
  const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
  const offset = Number(c.req.query('offset')) || 0;
  const workflowId = c.req.query('workflowId');

  log.info({ userId, limit, offset, workflowId }, 'List executions');

  const provider = getQueryProvider();
  const executions = await provider.listUserExecutions(userId, limit, offset, workflowId);

  return c.json({ executions }, 200);
};

// Use getQueryProvider() directly for consistency with all other handlers
export const handleGetExecution = async (c: Context<{ Variables: Variables }>) => {
  const executionId = c.req.param('executionId')!;

  log.info({ executionId }, 'Execution status requested');

  const provider = getQueryProvider();
  const execution = await provider.getExecution(executionId);
  const userId = c.get('jwtPayload').sub;

  if (!execution || execution.userId !== userId) {
    return c.json({ error: 'Execution not found or unauthorized' }, 404);
  }

  return c.json(execution, 200);
};

export const handleGetExecutionLogs = async (c: Context<{ Variables: Variables }>) => {
  const executionId = c.req.param('executionId')!;

  log.info({ executionId }, 'Agent logs requested');

  const provider = getQueryProvider();
  const execution = await provider.getExecution(executionId);
  const userId = c.get('jwtPayload').sub;

  if (!execution || execution.userId !== userId) {
    return c.json({ error: 'Execution not found or unauthorized' }, 404);
  }

  const logs = await provider.getAgentLogs(executionId);

  return c.json(
    {
      executionId,
      logs,
    },
    200,
  );
};
