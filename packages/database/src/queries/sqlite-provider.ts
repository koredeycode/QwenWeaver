import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, and } from 'drizzle-orm';
import { getConnection, sqliteSchema } from '../index.js';
import type { QueryProvider } from './provider.js';
import type { SavedMCPServerInput, SavedMCPServer } from './mcp.js';
import type { WorkflowPayload, ExecutionMetrics, AgentLogInput, AgentLogOutput } from '@qwenweaver/types';

const log = {
  info: (data: Record<string, unknown>, message: string) => {
    console.log(JSON.stringify({ level: 30, time: Date.now(), service: 'qwenweaver-database', ...data, msg: message }));
  }
};

export const sqliteProvider: QueryProvider = {
  async createUser(id: string, email: string, passwordHash: string): Promise<void> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb.insert(sqliteSchema.sqliteUsers).values({
      id,
      email,
      passwordHash,
      createdAt: Date.now(),
    });
  },

  async getUserByEmail(email: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb.select().from(sqliteSchema.sqliteUsers).where(eq(sqliteSchema.sqliteUsers.email, email)).limit(1);
    return rows[0] || null;
  },

  async getUserById(id: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb.select().from(sqliteSchema.sqliteUsers).where(eq(sqliteSchema.sqliteUsers.id, id)).limit(1);
    if (!rows[0]) return null;
    return { id: rows[0].id, email: rows[0].email, createdAt: rows[0].createdAt };
  },

  async saveMcpServer(id: string, userId: string, input: SavedMCPServerInput): Promise<SavedMCPServer> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const baseValues = {
      id,
      userId,
      name: input.name,
      description: input.description || null,
      transport: input.transport,
      url: input.url || null,
      command: input.command || null,
      args: input.args || null,
    };
    await sqliteDb.insert(sqliteSchema.sqliteMcpServers).values({
      ...baseValues,
      createdAt: Date.now(),
    });
    log.info({ id, name: input.name, transport: input.transport }, 'MCP server saved');
    return {
      id,
      name: input.name,
      description: input.description ?? undefined,
      transport: input.transport,
      url: input.url ?? undefined,
      command: input.command ?? undefined,
      args: input.args ?? undefined,
      createdAt: new Date().toISOString(),
    };
  },

  async getMcpServers(userId: string): Promise<SavedMCPServer[]> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb.select().from(sqliteSchema.sqliteMcpServers).where(eq(sqliteSchema.sqliteMcpServers.userId, userId));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      transport: r.transport,
      url: r.url ?? undefined,
      command: r.command ?? undefined,
      args: r.args ?? undefined,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  },

  async deleteMcpServer(id: string, userId: string): Promise<boolean> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const existing = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteMcpServers)
      .where(and(eq(sqliteSchema.sqliteMcpServers.id, id), eq(sqliteSchema.sqliteMcpServers.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    await sqliteDb
      .delete(sqliteSchema.sqliteMcpServers)
      .where(and(eq(sqliteSchema.sqliteMcpServers.id, id), eq(sqliteSchema.sqliteMcpServers.userId, userId)));

    return true;
  },

  async saveWorkflow(userId: string, workflow: WorkflowPayload): Promise<string> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const workflowId = workflow.id || crypto.randomUUID();

    await sqliteDb.insert(sqliteSchema.sqliteWorkflows).values({
      id: workflowId,
      userId,
      name: workflow.name,
      description: workflow.description || null,
      isActive: 1,
      createdAt: Date.now(),
    });

    if (workflow.nodes.length > 0) {
      await sqliteDb.insert(sqliteSchema.sqliteNodes).values(
        workflow.nodes.map((node) => ({
          id: `${workflowId}_${node.id}`,
          workflowId,
          type: node.type,
          data: node.data,
          positionX: node.position.x,
          positionY: node.position.y,
        }))
      );
    }

    if (workflow.edges.length > 0) {
      await sqliteDb.insert(sqliteSchema.sqliteEdges).values(
        workflow.edges.map((edge) => ({
          id: `${workflowId}_${edge.id}`,
          workflowId,
          source: `${workflowId}_${edge.source}`,
          target: `${workflowId}_${edge.target}`,
          sourceHandle: edge.sourceHandle || null,
          targetHandle: edge.targetHandle || null,
        }))
      );
    }

    return workflowId;
  },

  async createExecution(executionId: string, workflowId: string, userId: string): Promise<void> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb.insert(sqliteSchema.sqliteExecutions).values({
      id: executionId,
      workflowId,
      userId,
      status: 'pending',
      startedAt: Date.now(),
    });
  },

  async updateExecution(
    executionId: string,
    status: string,
    metrics?: ExecutionMetrics
  ): Promise<void> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb
      .update(sqliteSchema.sqliteExecutions)
      .set({
        status,
        metrics: metrics || null,
        completedAt: Date.now(),
      })
      .where(eq(sqliteSchema.sqliteExecutions.id, executionId));
  },

  async saveAgentLog(
    executionId: string,
    nodeId: string,
    status: string,
    input: AgentLogInput | null,
    output: AgentLogOutput | null,
    tokensUsed?: number,
    error?: string | null
  ): Promise<void> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const id = crypto.randomUUID();
    await sqliteDb.insert(sqliteSchema.sqliteAgentLogs).values({
      id,
      executionId,
      nodeId,
      status,
      input: input || null,
      output: output || null,
      tokensUsed: tokensUsed || null,
      startedAt: Date.now(),
      completedAt: Date.now(),
      error: error || null,
    });
  },

  async getExecution(executionId: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteExecutions)
      .where(eq(sqliteSchema.sqliteExecutions.id, executionId))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      workflowId: r.workflowId ?? '',
      userId: r.userId ?? '',
      status: r.status,
      metrics: r.metrics ?? undefined,
      startedAt: new Date(r.startedAt).toISOString(),
      completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : undefined,
    };
  },

  async getAgentLogs(executionId: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteAgentLogs)
      .where(eq(sqliteSchema.sqliteAgentLogs.executionId, executionId));

    return rows.map((r) => ({
      id: r.id,
      executionId: r.executionId ?? '',
      nodeId: r.nodeId,
      status: r.status,
      input: r.input ?? undefined,
      output: r.output ?? undefined,
      tokensUsed: r.tokensUsed ?? undefined,
      startedAt: new Date(r.startedAt).toISOString(),
      completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : undefined,
      error: r.error ?? undefined,
    }));
  }
};
