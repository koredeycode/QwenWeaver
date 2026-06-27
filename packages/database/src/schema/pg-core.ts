import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  jsonb,
  index,
  varchar,
} from 'drizzle-orm/pg-core';
import type {
  ExecutionMetrics,
  AgentLogInput,
  AgentLogOutput,
  WorkflowPayload,
} from '@qwenweaver/types';
import type { MCPAuthConfig } from '@qwenweaver/types';

export const pgUsers = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgWorkflows = pgTable(
  'workflows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => pgUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    isActive: integer('is_active').default(1).notNull(),
    nodesEdges: jsonb('nodes_edges').$type<WorkflowPayload>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('workflows_user_id_idx').on(table.userId)],
);

export const pgExecutions = pgTable(
  'executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id').references(() => pgWorkflows.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => pgUsers.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    metrics: jsonb('metrics').$type<ExecutionMetrics>(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => [
    index('executions_workflow_id_idx').on(table.workflowId),
    index('executions_user_id_idx').on(table.userId),
    index('executions_status_idx').on(table.status),
  ],
);

export const pgAgentLogs = pgTable(
  'agent_logs',
  {
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
  },
  (table) => [
    index('agent_logs_execution_id_idx').on(table.executionId),
    index('agent_logs_node_id_idx').on(table.nodeId),
    index('agent_logs_status_idx').on(table.status),
  ],
);

export const pgMcpServers = pgTable(
  'mcp_servers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => pgUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    transport: text('transport').notNull().default('http'),
    url: text('url'),
    command: text('command'),
    args: jsonb('args').$type<string[]>(),
    authConfig: jsonb('auth_config').$type<MCPAuthConfig>(),
    iconUrl: text('icon_url'),
    registryOrigin: text('registry_origin').default('manual').notNull(),
    registryId: text('registry_id'),
    registryMetadata: jsonb('registry_metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('mcp_servers_user_id_idx').on(table.userId)],
);

export const pgCredentials = pgTable(
  'credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => pgUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').notNull(),
    encryptedData: text('encrypted_data').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('credentials_user_id_idx').on(table.userId)],
);

export const pgTemplateCategories = pgTable('template_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
});

export type PgMcpServer = typeof pgMcpServers.$inferSelect;
export type NewPgMcpServer = typeof pgMcpServers.$inferInsert;
