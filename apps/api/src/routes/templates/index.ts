import { Hono } from 'hono';
import type { Variables } from '../../index.js';
import {
  handleListTemplates,
  handleGetTemplate,
  handleCreateTemplate,
  handleDeleteTemplate,
  handleForkTemplate,
  handleGetReviews,
  handleRateTemplate,
  handleListCategories,
} from './handlers.js';

export const templateRoutes = new Hono<{ Variables: Variables }>()
  .get('/', handleListTemplates)
  .get('/categories', handleListCategories)
  .get('/:id', handleGetTemplate)
  .get('/:id/reviews', handleGetReviews)
  .post('/', handleCreateTemplate)
  .delete('/:id', handleDeleteTemplate)
  .post('/:id/fork', handleForkTemplate)
  .post('/:id/rate', handleRateTemplate);
