import { randomUUID } from 'node:crypto';
import { getStorage } from '../../storage/index.js';
import { createModuleLogger } from '../../logger.js';
import type { Context } from 'hono';
import type { Variables } from '../../index.js';

const log = createModuleLogger('routes/files/handlers');

export async function handleUpload(c: Context<{ Variables: Variables }>) {
  try {
    const raw = await c.req.json();
    const dataUrl: string | undefined = raw.data;

    if (!dataUrl || typeof dataUrl !== 'string') {
      return c.json({ error: 'Missing "data" field with base64 data URL' }, 400);
    }

    // Parse data URL: "data:image/png;base64,iVBORw0KGgo..."
    const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
    if (!match) {
      return c.json({ error: 'Invalid data URL format' }, 400);
    }

    const contentType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length === 0) {
      return c.json({ error: 'Empty file data' }, 400);
    }

    const ext =
      contentType
        .split('/')
        .pop()
        ?.replace(/[^a-z0-9]/g, '') || 'bin';
    const key = `uploads/${randomUUID()}.${ext}`;

    const storage = getStorage();
    const url = await storage.write(key, buffer, contentType);

    log.info({ key, contentType, size: buffer.length }, 'File uploaded');

    return c.json({ url }, 201);
  } catch (err) {
    log.error({ error: (err as Error).message }, 'File upload failed');
    return c.json({ error: 'Upload failed' }, 500);
  }
}
