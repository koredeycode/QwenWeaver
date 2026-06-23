import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Variables } from '../../index.js';
import { TemplateListQuery, TemplateParams, CreateTemplateBody, RateTemplateBody } from './schema.js';
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

const errorResponse = z.object({ error: z.string() });

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Templates'],
  summary: 'List public templates',
  request: { query: TemplateListQuery },
  responses: {
     200: { content: { 'application/json': { schema: z.object({ templates: z.array(z.any()), total: z.number(), limit: z.number(), offset: z.number() }) } }, description: 'OK' },
  },
});

const getRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Templates'],
  summary: 'Get template details',
  request: { params: TemplateParams },
  responses: {
    200: { content: { 'application/json': { schema: z.object({ template: z.any() }) } }, description: 'OK' },
    404: { content: { 'application/json': { schema: errorResponse } }, description: 'Not found' },
  },
});

const createTemplateRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Templates'],
  summary: 'Publish a template',
  request: { body: { content: { 'application/json': { schema: CreateTemplateBody } } } },
  responses: {
    201: { content: { 'application/json': { schema: z.object({ id: z.string() }) } }, description: 'Created' },
    400: { content: { 'application/json': { schema: errorResponse } }, description: 'Bad request' },
  },
});

const deleteTemplateRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Templates'],
  summary: 'Delete a template',
  request: { params: TemplateParams },
  responses: {
    200: { content: { 'application/json': { schema: z.object({ deleted: z.boolean() }) } }, description: 'OK' },
    404: { content: { 'application/json': { schema: errorResponse } }, description: 'Not found' },
  },
});

const forkRoute = createRoute({
  method: 'post',
  path: '/{id}/fork',
  tags: ['Templates'],
  summary: 'Fork a template into your workflows',
  request: { params: TemplateParams },
  responses: {
    201: { content: { 'application/json': { schema: z.object({ workflowId: z.string() }) } }, description: 'Created' },
    404: { content: { 'application/json': { schema: errorResponse } }, description: 'Not found' },
  },
});

const reviewsRoute = createRoute({
  method: 'get',
  path: '/{id}/reviews',
  tags: ['Templates'],
  summary: 'Get template reviews',
  request: { params: TemplateParams },
  responses: {
     200: { content: { 'application/json': { schema: z.object({ reviews: z.array(z.object({}).passthrough()) }) } }, description: 'OK' },
  },
});

const rateRoute = createRoute({
  method: 'post',
  path: '/{id}/rate',
  tags: ['Templates'],
  summary: 'Rate a template',
  request: { params: TemplateParams, body: { content: { 'application/json': { schema: RateTemplateBody } } } },
  responses: {
    200: { content: { 'application/json': { schema: z.object({ id: z.string() }) } }, description: 'OK' },
    400: { content: { 'application/json': { schema: errorResponse } }, description: 'Bad request' },
    404: { content: { 'application/json': { schema: errorResponse } }, description: 'Not found' },
  },
});

const categoriesRoute = createRoute({
  method: 'get',
  path: '/categories',
  tags: ['Templates'],
  summary: 'List template categories',
  responses: {
     200: { content: { 'application/json': { schema: z.object({ categories: z.array(z.object({}).passthrough()) }) } }, description: 'OK' },
  },
});

export const templateRoutes = new OpenAPIHono<{ Variables: Variables }>()
  .openapi(listRoute, handleListTemplates)
  .openapi(categoriesRoute, handleListCategories)
  .openapi(getRoute, handleGetTemplate)
  .openapi(reviewsRoute, handleGetReviews)
  .openapi(createTemplateRoute, handleCreateTemplate)
  .openapi(deleteTemplateRoute, handleDeleteTemplate)
  .openapi(forkRoute, handleForkTemplate)
  .openapi(rateRoute, handleRateTemplate);
