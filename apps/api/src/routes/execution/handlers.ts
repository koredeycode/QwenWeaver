import { getQueryProvider } from '@qwenweaver/database';
import { createModuleLogger } from '../../logger.js';
import type { Variables } from '../../index.js';
import type { Context } from 'hono';

const log = createModuleLogger('routes/execution.handlers');

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
