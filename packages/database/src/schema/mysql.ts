import {
  mysqlTable,
  text,
  int,
  timestamp,
  json,
  index,
  uniqueIndex,
  varchar,
  boolean,
} from 'drizzle-orm/mysql-core';
import type {
  NodeData,
  ExecutionMetrics,
  AgentLogInput,
  AgentLogOutput,
  WorkflowPayload,
  CopilotHistoryMessage,
} from '@qwenweaver/types';
import type { MCPAuthConfig } from '@qwenweaver/types';

// ─── Better Auth tables ──────────────────────────────────────────────────────
export const user = mysqlTable('user', {
  id: varchar('id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  name: varchar('name', { length: 255 }).notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export const session = mysqlTable('session', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('userId', { length: 255 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export const account = mysqlTable('account', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: varchar('userId', { length: 255 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export const verification = mysqlTable('verification', {
  id: varchar('id', { length: 255 }).primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

// ─── Application tables ──────────────────────────────────────────────────────

export const mysqlWorkflows = mysqlTable(
  'workflows',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 255 }).references(() => user.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    description: text('description'),
    isActive: int('is_active').default(1).notNull(),
    nodesEdges: json('nodes_edges').$type<WorkflowPayload>(),
    copilotHistory: json('copilot_history').$type<CopilotHistoryMessage[]>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('workflows_user_id_idx').on(table.userId)],
);

export const mysqlExecutions = mysqlTable(
  'executions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    workflowId: varchar('workflow_id', { length: 36 }).references(() => mysqlWorkflows.id, {
      onDelete: 'cascade',
    }),
    userId: varchar('user_id', { length: 255 }).references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
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
    status: text('status').notNull(),
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
    userId: varchar('user_id', { length: 255 }).references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    transport: text('transport').notNull().default('http'),
    url: text('url'),
    command: text('command'),
    args: json('args').$type<string[]>(),
    authConfig: json('auth_config').$type<MCPAuthConfig>(),
    iconUrl: text('icon_url'),
    registryOrigin: text('registry_origin').default('manual').notNull(),
    registryId: text('registry_id'),
    registryMetadata: json('registry_metadata'),
    isFavorite: int('is_favorite').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('mcp_servers_user_id_idx').on(table.userId)],
);

export const mysqlTemplateCategories = mysqlTable('template_categories', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
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
    authorId: varchar('author_id', { length: 255 })
      .notNull()
      .references(() => user.id),
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
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => user.id),
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
  userId: varchar('user_id', { length: 255 })
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  balance: int('balance').notNull().default(0),
  lifetimeEarned: int('lifetime_earned').notNull().default(0),
  lifetimeSpent: int('lifetime_spent').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const mysqlCredentials = mysqlTable(
  'credentials',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').notNull(),
    encryptedData: text('encrypted_data').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('credentials_user_id_idx').on(table.userId)],
);

export const mysqlCreditTransactions = mysqlTable(
  'credit_transactions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amount: int('amount').notNull(),
    type: text('type').notNull(),
    description: text('description'),
    executionId: varchar('execution_id', { length: 36 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('credit_transactions_user_id_idx').on(table.userId)],
);

export const mysqlExecutionMessages = mysqlTable(
  'execution_messages',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    executionId: varchar('execution_id', { length: 36 })
      .notNull()
      .references(() => mysqlExecutions.id, { onDelete: 'cascade' }),
    topic: text('topic').notNull(),
    sourceNodeId: text('source_node_id').notNull(),
    messageType: text('message_type').notNull().default('output'),
    payload: json('payload').notNull(),
    contentType: text('content_type'),
    round: int('round').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('msg_exec_topic_idx').on(table.executionId, table.topic)],
);

export const mysqlWorkspaceEntries = mysqlTable(
  'workspace_entries',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    executionId: varchar('execution_id', { length: 36 })
      .notNull()
      .references(() => mysqlExecutions.id, { onDelete: 'cascade' }),
    nodeId: text('node_id').notNull(),
    key: text('key').notNull(),
    value: json('value').notNull(),
    valueType: text('value_type').notNull().default('text'),
    fileUrl: text('file_url'),
    round: int('round').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('ws_exec_key_idx').on(table.executionId, table.key),
    index('ws_exec_node_idx').on(table.executionId, table.nodeId),
  ],
);
