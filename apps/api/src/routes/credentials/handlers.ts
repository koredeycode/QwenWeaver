import { getQueryProvider } from '@qwenweaver/database';
import { CredentialInput, CredentialUpdate } from '@qwenweaver/types';
import type { Variables } from '../../index.js';
import type { Context } from 'hono';

export const handleListCredentials = async (c: Context<{ Variables: Variables }>) => {
  const userId = c.get('user')?.id;
  const provider = getQueryProvider();
  const credentials = await provider.listCredentials(userId);
  return c.json({ credentials }, 200);
};

export const handleGetCredential = async (c: Context<{ Variables: Variables }>) => {
  const userId = c.get('user')?.id;
  const id = c.req.param('id')!;
  const provider = getQueryProvider();
  const credential = await provider.getCredential(id, userId);
  if (!credential) return c.json({ error: 'Credential not found' }, 404);
  return c.json({ credential }, 200);
};

export const handleCreateCredential = async (c: Context<{ Variables: Variables }>) => {
  const userId = c.get('user')?.id;
  const provider = getQueryProvider();
  const body = await c.req.json();
  const parsed = CredentialInput.parse(body);
  const credential = await provider.createCredential(userId, parsed);
  return c.json({ credential }, 201);
};

export const handleUpdateCredential = async (c: Context<{ Variables: Variables }>) => {
  const userId = c.get('user')?.id;
  const id = c.req.param('id')!;
  const provider = getQueryProvider();
  const body = await c.req.json();
  const parsed = CredentialUpdate.parse(body);
  const credential = await provider.updateCredential(id, userId, parsed);
  return c.json({ credential }, 200);
};

export const handleDeleteCredential = async (c: Context<{ Variables: Variables }>) => {
  const userId = c.get('user')?.id;
  const id = c.req.param('id')!;
  const provider = getQueryProvider();
  const deleted = await provider.deleteCredential(id, userId);
  if (!deleted) return c.json({ error: 'Credential not found' }, 404);
  return c.json({ success: true }, 200);
};
