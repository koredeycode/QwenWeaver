import { mysqlTable, text, int, timestamp, json, index, varchar } from 'drizzle-orm/mysql-core';
import type { NodeData, ExecutionMetrics, AgentLogInput, AgentLogOutput, WorkflowPayload } from '@qwenweaver/types';
import type { MCPAuthConfig } from '@qwenweaver/types';

export const mysqlUsers = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mysqlWorkflows = mysqlTable(
  'workflows',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).references(() => mysqlUsers.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    description: text('description'),
    isActive: int('is_active').default(1).notNull(),
    nodesEdges: json('nodes_edges').$type<WorkflowPayload>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('workflows_user_id_idx').on(table.userId)],
);

export const mysqlNodes = mysqlTable(
  'nodes',
  {
    id: varchar('id', { length: 128 }).primaryKey(),
    workflowId: varchar('workflow_id', { length: 36 }).references(() => mysqlWorkflows.id, {
      onDelete: 'cascade',
    }),
    type: text('type').notNull(),
    data: json('data').notNull().$type<NodeData>(),
    positionX: int('position_x').notNull(),
    positionY: int('position_y').notNull(),
  },
  (table) => [index('nodes_workflow_id_idx').on(table.workflowId)],
);

export const mysqlEdges = mysqlTable(
  'edges',
  {
    id: varchar('id', { length: 128 }).primaryKey(),
    workflowId: varchar('workflow_id', { length: 36 }).references(() => mysqlWorkflows.id, {
      onDelete: 'cascade',
    }),
    source: text('source_node').notNull(),
    target: text('target_node').notNull(),
    sourceHandle: text('source_handle'),
    targetHandle: text('target_handle'),
  },
  (table) => [index('edges_workflow_id_idx').on(table.workflowId)],
);

export const mysqlExecutions = mysqlTable(
  'executions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    workflowId: varchar('workflow_id', { length: 36 }).references(() => mysqlWorkflows.id, {
      onDelete: 'cascade',
    }),
    userId: varchar('user_id', { length: 36 }).references(() => mysqlUsers.id, {
      onDelete: 'cascade',
    }),
    status: varchar('status', { length: 64 }).notNull(),
    metrics: json('metrics').$type<ExecutionMetrics>(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => [
    index('executions_workflow_id_idx').on(table.workflowId),
    index('executions_user_id_idx').on(table.userId),
    index('executions_status_idx').on(table.status),
  ],
);

export const mysqlAgentLogs = mysqlTable(
  'agent_logs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    executionId: varchar('execution_id', { length: 36 }).references(() => mysqlExecutions.id, {
      onDelete: 'cascade',
    }),
    nodeId: text('node_id').notNull(),
    status: varchar('status', { length: 64 }).notNull(),
    input: json('input').$type<AgentLogInput>(),
    output: json('output').$type<AgentLogOutput>(),
    tokensUsed: int('tokens_used'),
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

export const mysqlMcpServers = mysqlTable(
  'mcp_servers',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).references(() => mysqlUsers.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    description: text('description'),
    transport: varchar('transport', { length: 32 }).notNull().default('http'),
    url: text('url'),
    command: text('command'),
    args: json('args').$type<string[]>(),
    authConfig: json('auth_config').$type<MCPAuthConfig>(),
    iconUrl: text('icon_url'),
    registryOrigin: varchar('registry_origin', { length: 32 }).default('manual').notNull(),
    registryId: varchar('registry_id', { length: 255 }),
    registryMetadata: json('registry_metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('mcp_servers_user_id_idx').on(table.userId)],
);

export const mysqlTemplateCategories = mysqlTable('template_categories', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  icon: text('icon'),
  sortOrder: int('sort_order').default(0),
});

export const mysqlTemplates = mysqlTable(
  'templates',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    workflowData: json('workflow_data')
      .notNull()
      .$type<import('@qwenweaver/types').WorkflowPayload>(),
    categoryId: varchar('category_id', { length: 36 }).references(() => mysqlTemplateCategories.id),
    tags: json('tags').$type<string[]>(),
    authorId: varchar('author_id', { length: 36 })
      .notNull()
      .references(() => mysqlUsers.id),
    thumbnail: text('thumbnail'),
    downloads: int('downloads').default(0).notNull(),
    avgRating: int('avg_rating').default(0).notNull(),
    ratingCount: int('rating_count').default(0).notNull(),
    featured: int('featured').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('templates_category_id_idx').on(table.categoryId),
    index('templates_author_id_idx').on(table.authorId),
  ],
);

export const mysqlTemplateReviews = mysqlTable(
  'template_reviews',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    templateId: varchar('template_id', { length: 36 })
      .notNull()
      .references(() => mysqlTemplates.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => mysqlUsers.id),
    rating: int('rating').notNull(),
    review: text('review'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('template_reviews_template_id_idx').on(table.templateId),
    index('template_reviews_user_id_idx').on(table.userId),
  ],
);

export const mysqlUserCredits = mysqlTable('user_credits', {
  userId: varchar('user_id', { length: 36 })
    .primaryKey()
    .references(() => mysqlUsers.id, { onDelete: 'cascade' }),
  balance: int('balance').notNull().default(0),
  lifetimeEarned: int('lifetime_earned').notNull().default(0),
  lifetimeSpent: int('lifetime_spent').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const mysqlCreditTransactions = mysqlTable(
  'credit_transactions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => mysqlUsers.id, { onDelete: 'cascade' }),
    amount: int('amount').notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    description: text('description'),
    executionId: varchar('execution_id', { length: 36 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('credit_transactions_user_id_idx').on(table.userId)],
);

export type MysqlMcpServer = typeof mysqlMcpServers.$inferSelect;
export type MysqlUser = typeof mysqlUsers.$inferSelect;
export type NewMysqlMcpServer = typeof mysqlMcpServers.$inferInsert;
export type NewMysqlUser = typeof mysqlUsers.$inferInsert;
