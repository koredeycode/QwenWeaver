import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getConnection, pgSchema } from '../index.js';
import type { QueryProvider } from './provider.js';
import type { SavedMCPServerInput, SavedMCPServer } from './mcp.js';
import type { WorkflowPayload, ExecutionMetrics, AgentLogInput, AgentLogOutput } from '@qwenweaver/types';

const log = {
  info: (data: Record<string, unknown>, message: string) => {
    console.log(JSON.stringify({ level: 30, time: Date.now(), service: 'qwenweaver-database', ...data, msg: message }));
  }
};

export const pgProvider: QueryProvider = {
  async createUser(id: string, email: string, passwordHash: string): Promise<void> {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    await pgDb.insert(pgSchema.pgUsers).values({
      id,
      email,
      passwordHash,
      createdAt: new Date(),
    });
  },

  async getUserByEmail(email: string) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const rows = await pgDb.select().from(pgSchema.pgUsers).where(eq(pgSchema.pgUsers.email, email)).limit(1);
    return rows[0] || null;
  },

  async getUserById(id: string) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const rows = await pgDb.select().from(pgSchema.pgUsers).where(eq(pgSchema.pgUsers.id, id)).limit(1);
    if (!rows[0]) return null;
    return { id: rows[0].id, email: rows[0].email, createdAt: rows[0].createdAt };
  },

  async saveMcpServer(id: string, userId: string, input: SavedMCPServerInput): Promise<SavedMCPServer> {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
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
    await pgDb.insert(pgSchema.pgMcpServers).values({
      ...baseValues,
      createdAt: new Date(),
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
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const rows = await pgDb.select().from(pgSchema.pgMcpServers).where(eq(pgSchema.pgMcpServers.userId, userId));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      transport: r.transport,
      url: r.url ?? undefined,
      command: r.command ?? undefined,
      args: r.args ?? undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  },

  async deleteMcpServer(id: string, userId: string): Promise<boolean> {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const existing = await pgDb
      .select()
      .from(pgSchema.pgMcpServers)
      .where(and(eq(pgSchema.pgMcpServers.id, id), eq(pgSchema.pgMcpServers.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    await pgDb
      .delete(pgSchema.pgMcpServers)
      .where(and(eq(pgSchema.pgMcpServers.id, id), eq(pgSchema.pgMcpServers.userId, userId)));

    return true;
  },

  async saveWorkflow(userId: string, workflow: WorkflowPayload): Promise<string> {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const workflowId = workflow.id || crypto.randomUUID();

    await pgDb.insert(pgSchema.pgWorkflows).values({
      id: workflowId,
      userId,
      name: workflow.name,
      description: workflow.description || null,
      isActive: 1,
      createdAt: new Date(),
    });

    if (workflow.nodes.length > 0) {
      await pgDb.insert(pgSchema.pgNodes).values(
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
      await pgDb.insert(pgSchema.pgEdges).values(
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
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    await pgDb.insert(pgSchema.pgExecutions).values({
      id: executionId,
      workflowId,
      userId,
      status: 'pending',
      startedAt: new Date(),
    });
  },

  async updateExecution(
    executionId: string,
    status: string,
    metrics?: ExecutionMetrics
  ): Promise<void> {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    await pgDb
      .update(pgSchema.pgExecutions)
      .set({
        status,
        metrics: metrics || null,
        completedAt: new Date(),
      })
      .where(eq(pgSchema.pgExecutions.id, executionId));
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
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const id = crypto.randomUUID();
    await pgDb.insert(pgSchema.pgAgentLogs).values({
      id,
      executionId,
      nodeId,
      status,
      input: input || null,
      output: output || null,
      tokensUsed: tokensUsed || null,
      startedAt: new Date(),
      completedAt: new Date(),
      error: error || null,
    });
  },

  async getExecution(executionId: string) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const rows = await pgDb
      .select()
      .from(pgSchema.pgExecutions)
      .where(eq(pgSchema.pgExecutions.id, executionId))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      workflowId: r.workflowId ?? '',
      userId: r.userId ?? '',
      status: r.status,
      metrics: r.metrics ?? undefined,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt ? r.completedAt.toISOString() : undefined,
    };
  },

  async getAgentLogs(executionId: string) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const rows = await pgDb
      .select()
      .from(pgSchema.pgAgentLogs)
      .where(eq(pgSchema.pgAgentLogs.executionId, executionId));

    return rows.map((r) => ({
      id: r.id,
      executionId: r.executionId ?? '',
      nodeId: r.nodeId,
      status: r.status,
      input: r.input ?? undefined,
      output: r.output ?? undefined,
      tokensUsed: r.tokensUsed ?? undefined,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt ? r.completedAt.toISOString() : undefined,
      error: r.error ?? undefined,
    }));
  },

  async getAnalyticsSummary(userId: string) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    
    const summaryRows = await pgDb.select({
      totalRuns: sql<number>`cast(count(*) as integer)`,
      completedRuns: sql<number>`cast(sum(case when status = 'completed' then 1 else 0 end) as integer)`,
      failedRuns: sql<number>`cast(sum(case when status = 'failed' then 1 else 0 end) as integer)`,
      avgSpeedup: sql<number | null>`avg(cast(metrics->>'speedupS' as numeric))`,
      totalTokens: sql<number>`cast(sum(cast(metrics->>'totalTokens' as integer)) as integer)`,
      avgLatencyMs: sql<number | null>`avg(cast(metrics->>'totalLatencyMs' as numeric))`,
    })
    .from(pgSchema.pgExecutions)
    .where(eq(pgSchema.pgExecutions.userId, userId));

    const recentRows = await pgDb.select({
      id: pgSchema.pgExecutions.id,
      status: pgSchema.pgExecutions.status,
      startedAt: pgSchema.pgExecutions.startedAt,
      metrics: pgSchema.pgExecutions.metrics,
    })
    .from(pgSchema.pgExecutions)
    .where(eq(pgSchema.pgExecutions.userId, userId))
    .orderBy(desc(pgSchema.pgExecutions.startedAt))
    .limit(10);

    const summary = summaryRows[0];

    return {
      totalRuns: summary?.totalRuns || 0,
      completedRuns: summary?.completedRuns || 0,
      failedRuns: summary?.failedRuns || 0,
      avgSpeedup: summary?.avgSpeedup || null,
      totalTokens: summary?.totalTokens || 0,
      avgLatencyMs: summary?.avgLatencyMs || null,
      runsByModel: {}, // Not currently tracked in metrics
      recentRuns: recentRows.map(r => ({
        id: r.id,
        status: r.status,
        startedAt: r.startedAt.toISOString(),
        totalTokens: r.metrics?.totalTokens,
      })),
    };
  }
};
