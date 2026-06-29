import { getQueryProvider } from '@qwenweaver/database';
import { createModuleLogger } from '../../logger.js';
import type { Variables } from '../../index.js';
import type { Context } from 'hono';

const log = createModuleLogger('routes/analytics.handlers');

export const handleGetAnalyticsSummary = async (c: Context<{ Variables: Variables }>) => {
  const userId = c.get('user')!.id;
  const provider = getQueryProvider();

  // Support pagination via recentLimit query param (default 10, max 100)
  const rawLimit = c.req.query('recentLimit');
  const recentLimit = Math.min(Math.max(parseInt(rawLimit || '10', 10) || 10, 1), 100);

  try {
    const summary = await provider.getAnalyticsSummary(userId, recentLimit);
    return c.json(summary, 200);
  } catch (error) {
    log.error({ userId, error: (error as Error).message }, 'Failed to get analytics summary');
    return c.json({ error: 'Internal Server Error' }, 500);
  }
};
