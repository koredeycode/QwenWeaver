import { relations } from 'drizzle-orm';
import {
  pgWorkflows,
  pgExecutions,
  pgAgentLogs,
  pgMcpServers,
  pgTemplates,
  pgTemplateCategories,
  pgTemplateReviews,
  pgCredentials,
  pgUsers,
} from './pg.js';
import {
  sqliteWorkflows,
  sqliteExecutions,
  sqliteAgentLogs,
  sqliteMcpServers,
  sqliteTemplates,
  sqliteTemplateCategories,
  sqliteTemplateReviews,
  sqliteCredentials,
  sqliteUsers,
} from './sqlite.js';

export const pgWorkflowsRelations = relations(pgWorkflows, ({ many }) => ({
  executions: many(pgExecutions),
}));

export const pgExecutionsRelations = relations(pgExecutions, ({ one, many }) => ({
  workflow: one(pgWorkflows, {
    fields: [pgExecutions.workflowId],
    references: [pgWorkflows.id],
  }),
  agentLogs: many(pgAgentLogs),
}));

export const pgAgentLogsRelations = relations(pgAgentLogs, ({ one }) => ({
  execution: one(pgExecutions, {
    fields: [pgAgentLogs.executionId],
    references: [pgExecutions.id],
  }),
}));

export const pgMcpServersRelations = relations(pgMcpServers, () => ({}));

export const pgCredentialsRelations = relations(pgCredentials, ({ one }) => ({
  user: one(pgUsers, {
    fields: [pgCredentials.userId],
    references: [pgUsers.id],
  }),
}));

export const pgUsersRelations = relations(pgUsers, ({ many }) => ({
  credentials: many(pgCredentials),
}));

export const pgTemplateCategoriesRelations = relations(pgTemplateCategories, ({ many }) => ({
  templates: many(pgTemplates),
}));

export const pgTemplatesRelations = relations(pgTemplates, ({ one, many }) => ({
  category: one(pgTemplateCategories, {
    fields: [pgTemplates.categoryId],
    references: [pgTemplateCategories.id],
  }),
  reviews: many(pgTemplateReviews),
}));

export const pgTemplateReviewsRelations = relations(pgTemplateReviews, ({ one }) => ({
  template: one(pgTemplates, {
    fields: [pgTemplateReviews.templateId],
    references: [pgTemplates.id],
  }),
}));

export const sqliteWorkflowsRelations = relations(sqliteWorkflows, ({ many }) => ({
  executions: many(sqliteExecutions),
}));

export const sqliteExecutionsRelations = relations(sqliteExecutions, ({ one, many }) => ({
  workflow: one(sqliteWorkflows, {
    fields: [sqliteExecutions.workflowId],
    references: [sqliteWorkflows.id],
  }),
  agentLogs: many(sqliteAgentLogs),
}));

export const sqliteAgentLogsRelations = relations(sqliteAgentLogs, ({ one }) => ({
  execution: one(sqliteExecutions, {
    fields: [sqliteAgentLogs.executionId],
    references: [sqliteExecutions.id],
  }),
}));

export const sqliteMcpServersRelations = relations(sqliteMcpServers, () => ({}));

export const sqliteCredentialsRelations = relations(sqliteCredentials, ({ one }) => ({
  user: one(sqliteUsers, {
    fields: [sqliteCredentials.userId],
    references: [sqliteUsers.id],
  }),
}));

export const sqliteUsersRelations = relations(sqliteUsers, ({ many }) => ({
  credentials: many(sqliteCredentials),
}));

export const sqliteTemplateCategoriesRelations = relations(
  sqliteTemplateCategories,
  ({ many }) => ({
    templates: many(sqliteTemplates),
  }),
);

export const sqliteTemplatesRelations = relations(sqliteTemplates, ({ one, many }) => ({
  category: one(sqliteTemplateCategories, {
    fields: [sqliteTemplates.categoryId],
    references: [sqliteTemplateCategories.id],
  }),
  reviews: many(sqliteTemplateReviews),
}));

export const sqliteTemplateReviewsRelations = relations(sqliteTemplateReviews, ({ one }) => ({
  template: one(sqliteTemplates, {
    fields: [sqliteTemplateReviews.templateId],
    references: [sqliteTemplates.id],
  }),
}));
