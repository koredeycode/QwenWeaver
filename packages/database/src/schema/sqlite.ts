import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import type { NodeData, ExecutionMetrics, AgentLogInput, AgentLogOutput } from '@qwenweaver/types';
import type { MCPAuthConfig } from '@qwenweaver/types';

export const sqliteUsers = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const sqliteWorkflows = sqliteTable(
  'workflows',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => sqliteUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    isActive: integer('is_active').default(1).notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('workflows_user_id_idx').on(table.userId)],
);

export const sqliteNodes = sqliteTable(
  'nodes',
  {
    id: text('id').primaryKey(),
    workflowId: text('workflow_id').references(() => sqliteWorkflows.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    data: text('data', { mode: 'json' }).notNull().$type<NodeData>(),
    positionX: integer('position_x').notNull(),
    positionY: integer('position_y').notNull(),
  },
  (table) => [index('nodes_workflow_id_idx').on(table.workflowId)],
);

export const sqliteEdges = sqliteTable(
  'edges',
  {
    id: text('id').primaryKey(),
    workflowId: text('workflow_id').references(() => sqliteWorkflows.id, { onDelete: 'cascade' }),
    source: text('source_node').notNull(),
    target: text('target_node').notNull(),
    sourceHandle: text('source_handle'),
    targetHandle: text('target_handle'),
  },
  (table) => [index('edges_workflow_id_idx').on(table.workflowId)],
);

export const sqliteExecutions = sqliteTable(
  'executions',
  {
    id: text('id').primaryKey(),
    workflowId: text('workflow_id').references(() => sqliteWorkflows.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => sqliteUsers.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    metrics: text('metrics', { mode: 'json' }).$type<ExecutionMetrics>(),
    startedAt: integer('started_at').notNull(),
    completedAt: integer('completed_at'),
  },
  (table) => [
    index('executions_workflow_id_idx').on(table.workflowId),
    index('executions_user_id_idx').on(table.userId),
    index('executions_status_idx').on(table.status),
  ],
);

export const sqliteAgentLogs = sqliteTable(
  'agent_logs',
  {
    id: text('id').primaryKey(),
    executionId: text('execution_id').references(() => sqliteExecutions.id, {
      onDelete: 'cascade',
    }),
    nodeId: text('node_id').notNull(),
    status: text('status').notNull(),
    input: text('input', { mode: 'json' }).$type<AgentLogInput>(),
    output: text('output', { mode: 'json' }).$type<AgentLogOutput>(),
    tokensUsed: integer('tokens_used'),
    startedAt: integer('started_at').notNull(),
    completedAt: integer('completed_at'),
    error: text('error'),
  },
  (table) => [
    index('agent_logs_execution_id_idx').on(table.executionId),
    index('agent_logs_node_id_idx').on(table.nodeId),
    index('agent_logs_status_idx').on(table.status),
  ],
);

export const sqliteMcpServers = sqliteTable(
  'mcp_servers',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => sqliteUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    transport: text('transport').notNull().default('http'),
    url: text('url'),
    command: text('command'),
    args: text('args', { mode: 'json' }).$type<string[]>(),
    authConfig: text('auth_config', { mode: 'json' }).$type<MCPAuthConfig>(),
    iconUrl: text('icon_url'),
    registryOrigin: text('registry_origin').default('manual').notNull(),
    registryId: text('registry_id'),
    registryMetadata: text('registry_metadata', { mode: 'json' }),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('mcp_servers_user_id_idx').on(table.userId)],
);

export const sqliteTemplateCategories = sqliteTable('template_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
});

export const sqliteTemplates = sqliteTable(
  'templates',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    workflowData: text('workflow_data', { mode: 'json' })
      .notNull()
      .$type<import('@qwenweaver/types').WorkflowPayload>(),
    categoryId: text('category_id').references(() => sqliteTemplateCategories.id),
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    authorId: text('author_id')
      .notNull()
      .references(() => sqliteUsers.id),
    thumbnail: text('thumbnail'),
    downloads: integer('downloads').default(0).notNull(),
    avgRating: integer('avg_rating').default(0).notNull(),
    ratingCount: integer('rating_count').default(0).notNull(),
    featured: integer('featured').default(0).notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('templates_category_id_idx').on(table.categoryId),
    index('templates_author_id_idx').on(table.authorId),
  ],
);

export const sqliteTemplateReviews = sqliteTable(
  'template_reviews',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id')
      .notNull()
      .references(() => sqliteTemplates.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => sqliteUsers.id),
    rating: integer('rating').notNull(),
    review: text('review'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('template_reviews_template_id_idx').on(table.templateId),
    index('template_reviews_user_id_idx').on(table.userId),
  ],
);

export const sqliteUserCredits = sqliteTable('user_credits', {
  userId: text('user_id')
    .primaryKey()
    .references(() => sqliteUsers.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  lifetimeEarned: integer('lifetime_earned').notNull().default(0),
  lifetimeSpent: integer('lifetime_spent').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
});

export const sqliteCreditTransactions = sqliteTable(
  'credit_transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => sqliteUsers.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    type: text('type').notNull(), // signup_bonus | execution_cost | admin_grant
    description: text('description'),
    executionId: text('execution_id'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('credit_transactions_user_id_idx').on(table.userId)],
);

export type SqliteMcpServer = typeof sqliteMcpServers.$inferSelect;
export type NewSqliteMcpServer = typeof sqliteMcpServers.$inferInsert;
