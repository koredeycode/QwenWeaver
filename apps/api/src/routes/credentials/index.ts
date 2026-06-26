import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import {
  handleListCredentials,
  handleGetCredential,
  handleCreateCredential,
  handleUpdateCredential,
  handleDeleteCredential,
} from './handlers.js';

export const credentialsRoutes = new Hono<{ Variables: Variables }>()
  .get('/', handleListCredentials)
  .get('/:id', handleGetCredential)
  .post('/', handleCreateCredential)
  .put('/:id', handleUpdateCredential)
  .delete('/:id', handleDeleteCredential);
