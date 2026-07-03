import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type {
  ExecutionMetrics,
  AgentLogInput,
  AgentLogOutput,
  WorkflowPayload,
  CopilotHistoryMessage,
} from '@qwenweaver/types';
import type { MCPAuthConfig } from '@qwenweaver/types';

// ─── Better Auth tables ──────────────────────────────────────────────────────
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  name: text('name').notNull(),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

// ─── Application tables ──────────────────────────────────────────────────────

export const sqliteWorkflows = sqliteTable(
  'workflows',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    isActive: integer('is_active').default(1).notNull(),
    nodesEdges: text('nodes_edges', { mode: 'json' }).$type<WorkflowPayload>(),
    copilotHistory: text('copilot_history', { mode: 'json' }).$type<CopilotHistoryMessage[]>(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('workflows_user_id_idx').on(table.userId)],
);

export const sqliteExecutions = sqliteTable(
  'executions',
  {
    id: text('id').primaryKey(),
    workflowId: text('workflow_id').references(() => sqliteWorkflows.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
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
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
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
    isFavorite: integer('is_favorite').default(0).notNull(),
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
      .references(() => user.id),
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
      .references(() => user.id),
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
    .references(() => user.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  lifetimeEarned: integer('lifetime_earned').notNull().default(0),
  lifetimeSpent: integer('lifetime_spent').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
});

export const sqliteCredentials = sqliteTable(
  'credentials',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').notNull(),
    encryptedData: text('encrypted_data').notNull(),
    description: text('description'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('credentials_user_id_idx').on(table.userId)],
);

export const sqliteCreditTransactions = sqliteTable(
  'credit_transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    type: text('type').notNull(),
    description: text('description'),
    executionId: text('execution_id'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('credit_transactions_user_id_idx').on(table.userId)],
);

export const sqliteWorkspaceEntries = sqliteTable(
  'workspace_entries',
  {
    id: text('id').primaryKey(),
    executionId: text('execution_id')
      .notNull()
      .references(() => sqliteExecutions.id, { onDelete: 'cascade' }),
    nodeId: text('node_id').notNull(),
    key: text('key').notNull(),
    value: text('value', { mode: 'json' }).notNull(),
    valueType: text('value_type').notNull().default('text'),
    fileUrl: text('file_url'),
    round: integer('round').default(0).notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('ws_exec_key_idx').on(table.executionId, table.key),
    index('ws_exec_node_idx').on(table.executionId, table.nodeId),
  ],
);

export const sqliteExecutionMessages = sqliteTable(
  'execution_messages',
  {
    id: text('id').primaryKey(),
    executionId: text('execution_id')
      .notNull()
      .references(() => sqliteExecutions.id, { onDelete: 'cascade' }),
    topic: text('topic').notNull(),
    sourceNodeId: text('source_node_id').notNull(),
    messageType: text('message_type').notNull().default('output'),
    payload: text('payload', { mode: 'json' }).notNull(),
    contentType: text('content_type'),
    round: integer('round').default(0).notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('msg_exec_topic_idx').on(table.executionId, table.topic)],
);

export type SqliteMcpServer = typeof sqliteMcpServers.$inferSelect;
export type NewSqliteMcpServer = typeof sqliteMcpServers.$inferInsert;
