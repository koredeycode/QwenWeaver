import { getQueryProvider } from '@qwenweaver/database';
import { LOW_CREDIT_WARNING } from '../../config.js';
import type { Variables } from '../../index.js';
import type { Context } from 'hono';

export const handleGetCredits = async (c: Context<{ Variables: Variables }>) => {
  const userId = c.get('user')!.id;
  const provider = getQueryProvider();
  const credits = await provider.getUserCredits(userId);
  return c.json(
    {
      balance: credits.balance,
      lifetimeEarned: credits.lifetimeEarned,
      lifetimeSpent: credits.lifetimeSpent,
      lowBalance: credits.balance < LOW_CREDIT_WARNING,
    },
    200,
  );
};

export const handleListTransactions = async (c: Context<{ Variables: Variables }>) => {
  const userId = c.get('user')!.id;
  const provider = getQueryProvider();
  const transactions = await provider.listCreditTransactions(userId);
  return c.json({ transactions }, 200);
};
