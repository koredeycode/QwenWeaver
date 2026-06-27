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

export const pgTemplateCategories = pgTable('template_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
});

export const pgTemplates = pgTable(
  'templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    workflowData: jsonb('workflow_data')
      .notNull()
      .$type<import('@qwenweaver/types').WorkflowPayload>(),
    categoryId: uuid('category_id').references(() => pgTemplateCategories.id),
    tags: jsonb('tags').$type<string[]>(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => pgUsers.id),
    thumbnail: text('thumbnail'),
    downloads: integer('downloads').default(0).notNull(),
    avgRating: integer('avg_rating').default(0).notNull(),
    ratingCount: integer('rating_count').default(0).notNull(),
    featured: integer('featured').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('templates_category_id_idx').on(table.categoryId),
    index('templates_author_id_idx').on(table.authorId),
  ],
);

export const pgTemplateReviews = pgTable(
  'template_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => pgTemplates.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => pgUsers.id),
    rating: integer('rating').notNull(),
    review: text('review'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('template_reviews_template_id_idx').on(table.templateId),
    index('template_reviews_user_id_idx').on(table.userId),
  ],
);

export const pgUserCredits = pgTable('user_credits', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => pgUsers.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  lifetimeEarned: integer('lifetime_earned').notNull().default(0),
  lifetimeSpent: integer('lifetime_spent').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

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

export const pgCreditTransactions = pgTable(
  'credit_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => pgUsers.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    type: text('type').notNull(),
    description: text('description'),
    executionId: uuid('execution_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('credit_transactions_user_id_idx').on(table.userId)],
);

export type PgMcpServer = typeof pgMcpServers.$inferSelect;
export type NewPgMcpServer = typeof pgMcpServers.$inferInsert;
