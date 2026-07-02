import { z } from 'zod';
import { getQueryProvider } from '@qwenweaver/database';
import { WriteWorkspaceRequest } from '@qwenweaver/types';
import { createModuleLogger } from '../../logger.js';
import type { Context } from 'hono';
import type { Variables } from '../../index.js';

const log = createModuleLogger('routes/workspace/handlers');

export async function handleWrite(c: Context<{ Variables: Variables }>) {
  const executionId = c.req.param('executionId');
  if (!executionId) {
    return c.json({ error: 'Missing executionId' }, 400);
  }

  try {
    const raw = await c.req.json();
    const parsed = WriteWorkspaceRequest.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request', details: parsed.error.format() }, 400);
    }

    const { key, value, valueType, fileUrl } = parsed.data;
    const userId = c.get('user')!.id;
    const provider = getQueryProvider();

    const execution = await provider.getExecution(executionId);
    if (!execution || execution.userId !== userId) {
      return c.json({ error: 'Execution not found or unauthorized' }, 404);
    }

    const id = await provider.writeWorkspaceEntry(
      executionId,
      'api',
      key,
      value,
      valueType,
      fileUrl,
    );

    log.info({ executionId, key, id }, 'Workspace entry written via API');

    return c.json({ id, key }, 201);
  } catch (err) {
    log.error({ executionId, error: (err as Error).message }, 'Failed to write workspace entry');
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleRead(c: Context<{ Variables: Variables }>) {
  const executionId = c.req.param('executionId');
  const key = c.req.param('key');

  if (!executionId || !key) {
    return c.json({ error: 'Missing executionId or key' }, 400);
  }

  try {
    const userId = c.get('user')!.id;
    const provider = getQueryProvider();

    const execution = await provider.getExecution(executionId);
    if (!execution || execution.userId !== userId) {
      return c.json({ error: 'Execution not found or unauthorized' }, 404);
    }

    const entry = await provider.readWorkspaceEntry(executionId, key);
    if (!entry) {
      return c.json({ error: 'Key not found' }, 404);
    }

    return c.json(entry, 200);
  } catch (err) {
    log.error(
      { executionId, key, error: (err as Error).message },
      'Failed to read workspace entry',
    );
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleList(c: Context<{ Variables: Variables }>) {
  const executionId = c.req.param('executionId');

  if (!executionId) {
    return c.json({ error: 'Missing executionId' }, 400);
  }

  try {
    const userId = c.get('user')!.id;
    const provider = getQueryProvider();

    const execution = await provider.getExecution(executionId);
    if (!execution || execution.userId !== userId) {
      return c.json({ error: 'Execution not found or unauthorized' }, 404);
    }

    const nodeId = c.req.query('nodeId');
    const prefix = c.req.query('prefix');

    const entries = await provider.listWorkspaceEntries(
      executionId,
      nodeId || undefined,
      prefix || undefined,
    );

    return c.json({ entries }, 200);
  } catch (err) {
    log.error({ executionId, error: (err as Error).message }, 'Failed to list workspace entries');
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export async function handleClear(c: Context<{ Variables: Variables }>) {
  const executionId = c.req.param('executionId');

  if (!executionId) {
    return c.json({ error: 'Missing executionId' }, 400);
  }

  try {
    const userId = c.get('user')!.id;
    const provider = getQueryProvider();

    const execution = await provider.getExecution(executionId);
    if (!execution || execution.userId !== userId) {
      return c.json({ error: 'Execution not found or unauthorized' }, 404);
    }

    await provider.clearWorkspace(executionId);

    log.info({ executionId }, 'Workspace cleared');

    return c.json({ success: true }, 200);
  } catch (err) {
    log.error({ executionId, error: (err as Error).message }, 'Failed to clear workspace');
    return c.json({ error: 'Internal server error' }, 500);
  }
}
