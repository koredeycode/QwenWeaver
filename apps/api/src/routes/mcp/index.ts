import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import {
  handleDiscoverTools,
  handleSaveServer,
  handleListServers,
  handleDeleteServer,
  handleUpdateServerAuth,
  handleRegistrySearch,
  handleRegistryAdopt,
} from './handlers.js';

export const mcpRoutes = new Hono<{ Variables: Variables }>()
  .post('/tools/discover', handleDiscoverTools)
  .post('/servers', handleSaveServer)
  .get('/servers', handleListServers)
  .delete('/servers/:id', handleDeleteServer)
  .post('/servers/:id/auth', handleUpdateServerAuth);

export const registryRoutes = new Hono<{ Variables: Variables }>()
  .get('/search', handleRegistrySearch)
  .post('/adopt', handleRegistryAdopt);
