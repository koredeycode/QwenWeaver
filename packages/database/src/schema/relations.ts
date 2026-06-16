import { relations } from 'drizzle-orm';
import {
  pgWorkflows, pgNodes, pgEdges, pgExecutions, pgAgentLogs, pgMcpServers,
} from './pg.js';
import {
  sqliteWorkflows, sqliteNodes, sqliteEdges, sqliteExecutions, sqliteAgentLogs, sqliteMcpServers,
} from './sqlite.js';

export const pgWorkflowsRelations = relations(pgWorkflows, ({ many }) => ({
  nodes: many(pgNodes),
  edges: many(pgEdges),
  executions: many(pgExecutions),
}));

export const pgNodesRelations = relations(pgNodes, ({ one }) => ({
  workflow: one(pgWorkflows, {
    fields: [pgNodes.workflowId],
    references: [pgWorkflows.id],
  }),
}));

export const pgEdgesRelations = relations(pgEdges, ({ one }) => ({
  workflow: one(pgWorkflows, {
    fields: [pgEdges.workflowId],
    references: [pgWorkflows.id],
  }),
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

export const sqliteWorkflowsRelations = relations(sqliteWorkflows, ({ many }) => ({
  nodes: many(sqliteNodes),
  edges: many(sqliteEdges),
  executions: many(sqliteExecutions),
}));

export const sqliteNodesRelations = relations(sqliteNodes, ({ one }) => ({
  workflow: one(sqliteWorkflows, {
    fields: [sqliteNodes.workflowId],
    references: [sqliteWorkflows.id],
  }),
}));

export const sqliteEdgesRelations = relations(sqliteEdges, ({ one }) => ({
  workflow: one(sqliteWorkflows, {
    fields: [sqliteEdges.workflowId],
    references: [sqliteWorkflows.id],
  }),
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
