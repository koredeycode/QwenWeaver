import { getQueryProvider } from '@qwenweaver/database';
import { createModuleLogger } from '../../logger.js';
import { LOW_CREDIT_WARNING } from '../../config.js';
import type { Variables } from '../../index.js';
import type { RouteHandler } from '@hono/zod-openapi';
import type { getCreditsRoute, listTransactionsRoute } from './index.js';

const log = createModuleLogger('routes/credits.handlers');

export const handleGetCredits: RouteHandler<typeof getCreditsRoute, { Variables: Variables }> = async (c) => {
  const userId = c.get('jwtPayload').sub;
  const provider = getQueryProvider();
  const credits = await provider.getUserCredits(userId);
  return c.json({
    balance: credits.balance,
    lifetimeEarned: credits.lifetimeEarned,
    lifetimeSpent: credits.lifetimeSpent,
    lowBalance: credits.balance < LOW_CREDIT_WARNING,
  }, 200);
};

export const handleListTransactions: RouteHandler<typeof listTransactionsRoute, { Variables: Variables }> = async (c) => {
  const userId = c.get('jwtPayload').sub;
  const provider = getQueryProvider();
  const transactions = await provider.listCreditTransactions(userId);
  return c.json({ transactions }, 200);
};
