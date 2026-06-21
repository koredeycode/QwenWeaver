import type { Context } from 'hono';
import { getQueryProvider } from '@qwenweaver/database';
import { createModuleLogger } from '../../logger.js';
import type { Variables } from '../../index.js';

const log = createModuleLogger('routes/analytics.handlers');

export async function handleGetAnalyticsSummary(c: Context<{ Variables: Variables }>) {
  const userId = c.get('jwtPayload').sub;
  const provider = getQueryProvider();

  try {
    const summary = await provider.getAnalyticsSummary(userId);
    return c.json(summary, 200);
  } catch (error) {
    log.error({ userId, error: (error as Error).message }, 'Failed to get analytics summary');
    return c.json({ error: 'Internal Server Error' }, 500);
  }
}
