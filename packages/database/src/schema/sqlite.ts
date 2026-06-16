import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import type { NodeData, ExecutionMetrics, AgentLogInput, AgentLogOutput } from '@qwenweaver/types';
import type { MCPAuthConfig } from '@qwenweaver/types';

export const sqliteWorkflows = sqliteTable('workflows', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  isActive: integer('is_active').default(1).notNull(),
  createdAt: integer('created_at').notNull(),
});

export const sqliteNodes = sqliteTable('nodes', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').references(() => sqliteWorkflows.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  data: text('data', { mode: 'json' }).notNull().$type<NodeData>(),
  positionX: integer('position_x').notNull(),
  positionY: integer('position_y').notNull(),
}, (table) => ({
  workflowIdIdx: index('nodes_workflow_id_idx').on(table.workflowId),
}));

export const sqliteEdges = sqliteTable('edges', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').references(() => sqliteWorkflows.id, { onDelete: 'cascade' }),
  source: text('source_node').notNull(),
  target: text('target_node').notNull(),
  sourceHandle: text('source_handle'),
  targetHandle: text('target_handle'),
}, (table) => ({
  workflowIdIdx: index('edges_workflow_id_idx').on(table.workflowId),
}));

export const sqliteExecutions = sqliteTable('executions', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').references(() => sqliteWorkflows.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  metrics: text('metrics', { mode: 'json' }).$type<ExecutionMetrics>(),
  startedAt: integer('started_at').notNull(),
  completedAt: integer('completed_at'),
}, (table) => ({
  workflowIdIdx: index('executions_workflow_id_idx').on(table.workflowId),
  statusIdx: index('executions_status_idx').on(table.status),
}));

export const sqliteAgentLogs = sqliteTable('agent_logs', {
  id: text('id').primaryKey(),
  executionId: text('execution_id').references(() => sqliteExecutions.id, { onDelete: 'cascade' }),
  nodeId: text('node_id').notNull(),
  status: text('status').notNull(),
  input: text('input', { mode: 'json' }).$type<AgentLogInput>(),
  output: text('output', { mode: 'json' }).$type<AgentLogOutput>(),
  tokensUsed: integer('tokens_used'),
  startedAt: integer('started_at').notNull(),
  completedAt: integer('completed_at'),
  error: text('error'),
}, (table) => ({
  executionIdIdx: index('agent_logs_execution_id_idx').on(table.executionId),
  nodeIdIdx: index('agent_logs_node_id_idx').on(table.nodeId),
  statusIdx: index('agent_logs_status_idx').on(table.status),
}));

export const sqliteMcpServers = sqliteTable('mcp_servers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  transport: text('transport').notNull().default('http'),
  url: text('url'),
  command: text('command'),
  args: text('args', { mode: 'json' }).$type<string[]>(),
  authConfig: text('auth_config', { mode: 'json' }).$type<MCPAuthConfig>(),
  createdAt: integer('created_at').notNull(),
});
