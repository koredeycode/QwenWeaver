import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Variables } from '../../index.js';
import { WorkflowPayload } from '@qwenweaver/types';
import { handleListWorkflows, handleGetWorkflow, handleDeleteWorkflow, handleSaveWorkflow, handleExecute, handleStream, handleGetStatus } from './handlers.js';



const errorResponseSchema = z.object({
  error: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

const workflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.union([z.number(), z.string(), z.date()]),
});

const nodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.unknown(),
  positionX: z.number(),
  positionY: z.number(),
});

const edgeSchema = z.object({
  id: z.string(),
  sourceNode: z.string(),
  targetNode: z.string(),
  sourceHandle: z.string().nullable(),
  targetHandle: z.string().nullable(),
});

const workflowDetailSchema = workflowSchema.extend({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

export const listWorkflowsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Workflow'],
  summary: 'List user workflows',
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ workflows: z.array(workflowSchema) }) } },
      description: 'OK',
    },
  },
});

export const getWorkflowRoute = createRoute({
  method: 'get',
  path: '/detail/{workflowId}',
  tags: ['Workflow'],
  summary: 'Get workflow with nodes and edges',
  request: {
    params: z.object({ workflowId: z.string() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: workflowDetailSchema } },
      description: 'OK',
    },
    404: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Not Found' },
  },
});

export const executeRoute = createRoute({
  method: 'post',
  path: '/execute',
  tags: ['Workflow'],
  summary: 'Execute a workflow',
  request: {
    body: {
      content: { 'application/json': { schema: WorkflowPayload } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: z.object({ executionId: z.string(), status: z.string() }) } },
      description: 'Created',
    },
    400: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Bad Request' },
    402: {
      content: {
        'application/json': {
          schema: z.object({ error: z.string(), balance: z.number(), required: z.number() }),
        },
      },
      description: 'Insufficient credits',
    },
  },
});

export const streamRoute = createRoute({
  method: 'get',
  path: '/{executionId}/stream',
  tags: ['Workflow'],
  summary: 'Stream workflow execution events',
  request: {
    params: z.object({ executionId: z.string() }),
  },
  responses: {
    200: {
      description: 'SSE Stream',
    },
    404: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Not Found or Unauthorized' },
  },
});

export const getStatusRoute = createRoute({
  method: 'get',
  path: '/{executionId}',
  tags: ['Workflow'],
  summary: 'Get execution status',
  request: {
    params: z.object({ executionId: z.string() }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            id: z.string(),
            status: z.string(),
            metrics: z.record(z.string(), z.unknown()).optional(),
          }),
        },
      },
      description: 'OK',
    },
    403: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Unauthorized' },
    404: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Not Found' },
    },
});
export const deleteWorkflowRoute = createRoute({
  method: 'delete',
  path: '/detail/{workflowId}',
  tags: ['Workflow'],
  summary: 'Delete a workflow',
  request: {
    params: z.object({ workflowId: z.string() }),
  },
  responses: {
    200: { content: { 'application/json': { schema: z.object({ success: z.boolean() }) } }, description: 'OK' },
    404: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Not Found' },
  },
});
export const saveWorkflowRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Workflow'],
  summary: 'Save a workflow',
  request: {
    body: {
      content: { 'application/json': { schema: WorkflowPayload } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: z.object({ workflowId: z.string() }) } },
      description: 'Created',
    },
    400: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Bad Request' },
    403: { content: { 'application/json': { schema: errorResponseSchema } }, description: 'Workflow limit reached' },
  },
});
export const workflowRoutes = new OpenAPIHono<{ Variables: Variables }>()
  .openapi(listWorkflowsRoute, handleListWorkflows)
  .openapi(getWorkflowRoute, handleGetWorkflow)
  .openapi(deleteWorkflowRoute, handleDeleteWorkflow)
  .openapi(saveWorkflowRoute, handleSaveWorkflow)
  .openapi(executeRoute, handleExecute)
  .openapi(streamRoute, handleStream)
  .openapi(getStatusRoute, handleGetStatus);

export type { ActiveExecution } from './handlers.js';
export { activeExecutions } from './handlers.js';
