import { pgTable, text, integer, timestamp, uuid, jsonb, index, varchar } from 'drizzle-orm/pg-core';
import type { NodeData, ExecutionMetrics, AgentLogInput, AgentLogOutput } from '@qwenweaver/types';
import type { MCPAuthConfig } from '@qwenweaver/types';

export const pgUsers = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgWorkflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => pgUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isActive: integer('is_active').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('workflows_user_id_idx').on(table.userId),
]);

export const pgNodes = pgTable('nodes', {
  id: text('id').primaryKey(),
  workflowId: uuid('workflow_id').references(() => pgWorkflows.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  data: jsonb('data').notNull().$type<NodeData>(),
  positionX: integer('position_x').notNull(),
  positionY: integer('position_y').notNull(),
}, (table) => [
  index('nodes_workflow_id_idx').on(table.workflowId),
]);

export const pgEdges = pgTable('edges', {
  id: text('id').primaryKey(),
  workflowId: uuid('workflow_id').references(() => pgWorkflows.id, { onDelete: 'cascade' }),
  source: text('source_node').notNull(),
  target: text('target_node').notNull(),
  sourceHandle: text('source_handle'),
  targetHandle: text('target_handle'),
}, (table) => [
  index('edges_workflow_id_idx').on(table.workflowId),
]);

export const pgExecutions = pgTable('executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').references(() => pgWorkflows.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => pgUsers.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  metrics: jsonb('metrics').$type<ExecutionMetrics>(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => [
  index('executions_workflow_id_idx').on(table.workflowId),
  index('executions_user_id_idx').on(table.userId),
  index('executions_status_idx').on(table.status),
]);

export const pgAgentLogs = pgTable('agent_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  executionId: uuid('execution_id').references(() => pgExecutions.id, { onDelete: 'cascade' }),
  nodeId: text('node_id').notNull(),
  status: text('status').notNull(),
  input: jsonb('input').$type<AgentLogInput>(),
  output: jsonb('output').$type<AgentLogOutput>(),
  tokensUsed: integer('tokens_used'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  error: text('error'),
}, (table) => [
  index('agent_logs_execution_id_idx').on(table.executionId),
  index('agent_logs_node_id_idx').on(table.nodeId),
  index('agent_logs_status_idx').on(table.status),
]);

export const pgMcpServers = pgTable('mcp_servers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => pgUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  transport: text('transport').notNull().default('http'),
  url: text('url'),
  command: text('command'),
  args: jsonb('args').$type<string[]>(),
  authConfig: jsonb('auth_config').$type<MCPAuthConfig>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('mcp_servers_user_id_idx').on(table.userId),
]);

export type PgMcpServer = typeof pgMcpServers.$inferSelect;
export type NewPgMcpServer = typeof pgMcpServers.$inferInsert;
