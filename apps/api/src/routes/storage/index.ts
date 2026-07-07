import { Hono } from 'hono';
import { getStorage } from '../../storage/index.js';
import { createModuleLogger } from '../../logger.js';
import type { Variables } from '../../index.js';

const log = createModuleLogger('routes/storage');

export const storageRoutes = new Hono<{ Variables: Variables }>();

storageRoutes.get('/proxy', async (c) => {
  const key = c.req.query('key');
  if (!key) {
    return c.json({ error: 'Missing "key" query parameter' }, 400);
  }

  try {
    const storage = getStorage();
    const signedUrl = await storage.getSignedUrl(key);
    return c.redirect(signedUrl, 302);
  } catch (err) {
    log.error({ error: (err as Error).message, key }, 'Failed to generate signed URL');
    return c.json({ error: 'Failed to access storage' }, 500);
  }
});
