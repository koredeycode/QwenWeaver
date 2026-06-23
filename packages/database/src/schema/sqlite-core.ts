import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import type { NodeData, ExecutionMetrics, AgentLogInput, AgentLogOutput } from '@qwenweaver/types';
import type { MCPAuthConfig } from '@qwenweaver/types';

export const sqliteUsers = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const sqliteWorkflows = sqliteTable('workflows', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => sqliteUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isActive: integer('is_active').default(1).notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('workflows_user_id_idx').on(table.userId),
]);

export const sqliteNodes = sqliteTable('nodes', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').references(() => sqliteWorkflows.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  data: text('data', { mode: 'json' }).notNull().$type<NodeData>(),
  positionX: integer('position_x').notNull(),
  positionY: integer('position_y').notNull(),
}, (table) => [
  index('nodes_workflow_id_idx').on(table.workflowId),
]);

export const sqliteEdges = sqliteTable('edges', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').references(() => sqliteWorkflows.id, { onDelete: 'cascade' }),
  source: text('source_node').notNull(),
  target: text('target_node').notNull(),
  sourceHandle: text('source_handle'),
  targetHandle: text('target_handle'),
}, (table) => [
  index('edges_workflow_id_idx').on(table.workflowId),
]);

export const sqliteExecutions = sqliteTable('executions', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').references(() => sqliteWorkflows.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => sqliteUsers.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  metrics: text('metrics', { mode: 'json' }).$type<ExecutionMetrics>(),
  startedAt: integer('started_at').notNull(),
  completedAt: integer('completed_at'),
}, (table) => [
  index('executions_workflow_id_idx').on(table.workflowId),
  index('executions_user_id_idx').on(table.userId),
  index('executions_status_idx').on(table.status),
]);

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
}, (table) => [
  index('agent_logs_execution_id_idx').on(table.executionId),
  index('agent_logs_node_id_idx').on(table.nodeId),
  index('agent_logs_status_idx').on(table.status),
]);

export const sqliteMcpServers = sqliteTable('mcp_servers', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => sqliteUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  transport: text('transport').notNull().default('http'),
  url: text('url'),
  command: text('command'),
  args: text('args', { mode: 'json' }).$type<string[]>(),
  authConfig: text('auth_config', { mode: 'json' }).$type<MCPAuthConfig>(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('mcp_servers_user_id_idx').on(table.userId),
]);

export const sqliteTemplateCategories = sqliteTable('template_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
});

export type SqliteMcpServer = typeof sqliteMcpServers.$inferSelect;
export type NewSqliteMcpServer = typeof sqliteMcpServers.$inferInsert;
