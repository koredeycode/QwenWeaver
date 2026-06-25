import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, and, sql, desc, count, inArray } from 'drizzle-orm';
import { getConnection, sqliteSchema } from '../index.js';
import type { QueryProvider, WorkflowRow, WorkflowDetail } from './provider.js';
import type { SavedMCPServerInput, SavedMCPServer } from './mcp.js';
import type {
  WorkflowPayload,
  ExecutionMetrics,
  AgentLogInput,
  AgentLogOutput,
  MCPAuthConfig,
} from '@qwenweaver/types';

const log = {
  info: (data: Record<string, unknown>, message: string) => {
    console.log(
      JSON.stringify({
        level: 30,
        time: Date.now(),
        service: 'qwenweaver-database',
        ...data,
        msg: message,
      }),
    );
  },
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
    const rows = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteUsers)
      .where(eq(sqliteSchema.sqliteUsers.email, email))
      .limit(1);
    return rows[0] || null;
  },

  async getUserById(id: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteUsers)
      .where(eq(sqliteSchema.sqliteUsers.id, id))
      .limit(1);
    if (!rows[0]) return null;
    return { id: rows[0].id, email: rows[0].email, createdAt: rows[0].createdAt };
  },

  async saveMcpServer(
    id: string,
    userId: string,
    input: SavedMCPServerInput,
  ): Promise<SavedMCPServer> {
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
      iconUrl: input.iconUrl || null,
      authConfig: input.authConfig || null,
      registryOrigin: input.registryOrigin || 'manual',
      registryId: input.registryId || null,
      registryMetadata: input.registryMetadata || null,
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
      iconUrl: input.iconUrl ?? undefined,
      authConfig: input.authConfig ?? undefined,
      registryOrigin: input.registryOrigin ?? undefined,
      registryId: input.registryId ?? undefined,
      registryMetadata: input.registryMetadata ?? undefined,
      createdAt: new Date().toISOString(),
    };
  },

  async getMcpServers(userId: string): Promise<SavedMCPServer[]> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteMcpServers)
      .where(eq(sqliteSchema.sqliteMcpServers.userId, userId));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      transport: r.transport,
      url: r.url ?? undefined,
      command: r.command ?? undefined,
      args: r.args ?? undefined,
      iconUrl: r.iconUrl ?? undefined,
      authConfig: r.authConfig ?? undefined,
      registryOrigin: r.registryOrigin ?? undefined,
      registryId: r.registryId ?? undefined,
      registryMetadata: r.registryMetadata ?? undefined,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  },

  async deleteMcpServer(id: string, userId: string): Promise<boolean> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const existing = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteMcpServers)
      .where(
        and(
          eq(sqliteSchema.sqliteMcpServers.id, id),
          eq(sqliteSchema.sqliteMcpServers.userId, userId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    await sqliteDb
      .delete(sqliteSchema.sqliteMcpServers)
      .where(
        and(
          eq(sqliteSchema.sqliteMcpServers.id, id),
          eq(sqliteSchema.sqliteMcpServers.userId, userId),
        ),
      );

    return true;
  },

  async updateMcpServerAuth(
    id: string,
    userId: string,
    authConfig: MCPAuthConfig,
  ): Promise<SavedMCPServer> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb
      .update(sqliteSchema.sqliteMcpServers)
      .set({ authConfig })
      .where(
        and(
          eq(sqliteSchema.sqliteMcpServers.id, id),
          eq(sqliteSchema.sqliteMcpServers.userId, userId),
        ),
      );
    const updated = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteMcpServers)
      .where(eq(sqliteSchema.sqliteMcpServers.id, id))
      .limit(1);
    const r = updated[0];
    return {
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      transport: r.transport,
      url: r.url ?? undefined,
      command: r.command ?? undefined,
      args: r.args ?? undefined,
      iconUrl: r.iconUrl ?? undefined,
      authConfig: r.authConfig ?? undefined,
      registryOrigin: r.registryOrigin ?? undefined,
      registryId: r.registryId ?? undefined,
      registryMetadata: r.registryMetadata ?? undefined,
      createdAt: new Date(r.createdAt).toISOString(),
    };
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
        })),
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
        })),
      );
    }

    return workflowId;
  },

  async updateWorkflow(
    workflowId: string,
    userId: string,
    workflow: WorkflowPayload,
  ): Promise<string> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;

    await sqliteDb.transaction(async (tx) => {
      await tx
        .update(sqliteSchema.sqliteWorkflows)
        .set({
          name: workflow.name,
          description: workflow.description || null,
        })
        .where(
          and(
            eq(sqliteSchema.sqliteWorkflows.id, workflowId),
            eq(sqliteSchema.sqliteWorkflows.userId, userId),
          ),
        );

      await tx
        .delete(sqliteSchema.sqliteNodes)
        .where(eq(sqliteSchema.sqliteNodes.workflowId, workflowId));
      await tx
        .delete(sqliteSchema.sqliteEdges)
        .where(eq(sqliteSchema.sqliteEdges.workflowId, workflowId));

      if (workflow.nodes.length > 0) {
        await tx.insert(sqliteSchema.sqliteNodes).values(
          workflow.nodes.map((node) => ({
            id: `${workflowId}_${node.id}`,
            workflowId,
            type: node.type,
            data: node.data,
            positionX: node.position.x,
            positionY: node.position.y,
          })),
        );
      }

      if (workflow.edges.length > 0) {
        await tx.insert(sqliteSchema.sqliteEdges).values(
          workflow.edges.map((edge) => ({
            id: `${workflowId}_${edge.id}`,
            workflowId,
            source: `${workflowId}_${edge.source}`,
            target: `${workflowId}_${edge.target}`,
            sourceHandle: edge.sourceHandle || null,
            targetHandle: edge.targetHandle || null,
          })),
        );
      }
    });

    return workflowId;
  },

  async listUserWorkflows(userId: string): Promise<WorkflowRow[]> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const workflows = await sqliteDb
      .select({
        id: sqliteSchema.sqliteWorkflows.id,
        name: sqliteSchema.sqliteWorkflows.name,
        description: sqliteSchema.sqliteWorkflows.description,
        createdAt: sqliteSchema.sqliteWorkflows.createdAt,
      })
      .from(sqliteSchema.sqliteWorkflows)
      .where(eq(sqliteSchema.sqliteWorkflows.userId, userId))
      .orderBy(desc(sqliteSchema.sqliteWorkflows.createdAt));

    if (workflows.length === 0) return workflows;

    // Fetch node type counts for all returned workflows
    const wfIds = workflows.map((w) => w.id);
    const counts = await sqliteDb
      .select({
        workflowId: sqliteSchema.sqliteNodes.workflowId,
        type: sqliteSchema.sqliteNodes.type,
        count: count(),
      })
      .from(sqliteSchema.sqliteNodes)
      .where(inArray(sqliteSchema.sqliteNodes.workflowId, wfIds as any[]))
      .groupBy(sqliteSchema.sqliteNodes.workflowId, sqliteSchema.sqliteNodes.type);

    // Build a lookup: workflowId -> { type: count }
    const countsByWf: Record<string, Record<string, number>> = {};
    for (const row of counts) {
      if (!row.workflowId) continue;
      if (!countsByWf[row.workflowId]) countsByWf[row.workflowId] = {};
      countsByWf[row.workflowId][row.type] = row.count;
    }

    return workflows.map((w) => ({
      ...w,
      nodeCounts: countsByWf[w.id] ?? {},
    }));
  },

  async getWorkflow(id: string, userId: string): Promise<WorkflowDetail | null> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const wf = await sqliteDb
      .select({
        id: sqliteSchema.sqliteWorkflows.id,
        name: sqliteSchema.sqliteWorkflows.name,
        description: sqliteSchema.sqliteWorkflows.description,
        createdAt: sqliteSchema.sqliteWorkflows.createdAt,
      })
      .from(sqliteSchema.sqliteWorkflows)
      .where(
        and(
          eq(sqliteSchema.sqliteWorkflows.id, id),
          eq(sqliteSchema.sqliteWorkflows.userId, userId),
        ),
      )
      .limit(1);
    if (wf.length === 0) return null;

    const nodes = await sqliteDb
      .select({
        id: sqliteSchema.sqliteNodes.id,
        type: sqliteSchema.sqliteNodes.type,
        data: sqliteSchema.sqliteNodes.data,
        positionX: sqliteSchema.sqliteNodes.positionX,
        positionY: sqliteSchema.sqliteNodes.positionY,
      })
      .from(sqliteSchema.sqliteNodes)
      .where(eq(sqliteSchema.sqliteNodes.workflowId, id));

    const edges = await sqliteDb
      .select({
        id: sqliteSchema.sqliteEdges.id,
        sourceNode: sqliteSchema.sqliteEdges.source,
        targetNode: sqliteSchema.sqliteEdges.target,
        sourceHandle: sqliteSchema.sqliteEdges.sourceHandle,
        targetHandle: sqliteSchema.sqliteEdges.targetHandle,
      })
      .from(sqliteSchema.sqliteEdges)
      .where(eq(sqliteSchema.sqliteEdges.workflowId, id));

    return { ...wf[0], nodes, edges };
  },

  async deleteWorkflow(id: string, userId: string): Promise<boolean> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const result = await sqliteDb
      .delete(sqliteSchema.sqliteWorkflows)
      .where(
        and(
          eq(sqliteSchema.sqliteWorkflows.id, id),
          eq(sqliteSchema.sqliteWorkflows.userId, userId),
        ),
      );
    const changes = (result as unknown as { changes: number }).changes;
    return changes > 0;
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
    metrics?: ExecutionMetrics,
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
    error?: string | null,
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
  },

  async getAnalyticsSummary(userId: string, recentLimit: number = 10) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;

    const summaryRows = await sqliteDb
      .select({
        totalRuns: sql<number>`cast(count(*) as integer)`,
        completedRuns: sql<number>`cast(sum(case when status = 'completed' then 1 else 0 end) as integer)`,
        failedRuns: sql<number>`cast(sum(case when status = 'failed' then 1 else 0 end) as integer)`,
        avgSpeedup: sql<number | null>`avg(json_extract(metrics, '$.speedupS'))`,
        totalTokens: sql<number>`cast(sum(json_extract(metrics, '$.totalTokens')) as integer)`,
        avgLatencyMs: sql<number | null>`avg(json_extract(metrics, '$.totalLatencyMs'))`,
      })
      .from(sqliteSchema.sqliteExecutions)
      .where(eq(sqliteSchema.sqliteExecutions.userId, userId));

    const recentRows = await sqliteDb
      .select({
        id: sqliteSchema.sqliteExecutions.id,
        status: sqliteSchema.sqliteExecutions.status,
        startedAt: sqliteSchema.sqliteExecutions.startedAt,
        metrics: sqliteSchema.sqliteExecutions.metrics,
      })
      .from(sqliteSchema.sqliteExecutions)
      .where(eq(sqliteSchema.sqliteExecutions.userId, userId))
      .orderBy(desc(sqliteSchema.sqliteExecutions.startedAt))
      .limit(recentLimit);

    const summary = summaryRows[0];

    return {
      totalRuns: summary?.totalRuns || 0,
      completedRuns: summary?.completedRuns || 0,
      failedRuns: summary?.failedRuns || 0,
      avgSpeedup: summary?.avgSpeedup || null,
      totalTokens: summary?.totalTokens || 0,
      avgLatencyMs: summary?.avgLatencyMs || null,
      runsByModel: {}, // Not currently tracked in metrics
      recentRuns: recentRows.map((r) => ({
        id: r.id,
        status: r.status,
        startedAt: new Date(r.startedAt).toISOString(),
        totalTokens: r.metrics?.totalTokens,
      })),
    };
  },

  async healthCheck(): Promise<void> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb.select({ one: sql`1` }).from(sql`(SELECT 1)`);
  },

  // ─── Templates ──────────────────────────────────────────────────────────────

  async listTemplates(options) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const s = sqliteSchema;
    const conditions: any[] = [];

    if (options?.categoryId) conditions.push(eq(s.sqliteTemplates.categoryId, options.categoryId));
    if (options?.featured) conditions.push(eq(s.sqliteTemplates.featured, 1));
    if (options?.search)
      conditions.push(sql`${s.sqliteTemplates.name} LIKE ${'%' + options.search + '%'}`);

    let query: any = sqliteDb
      .select()
      .from(s.sqliteTemplates)
      .orderBy(desc(s.sqliteTemplates.downloads));
    if (conditions.length > 0) query = query.where(and(...conditions));

    return await query.limit(options?.limit ?? 50).offset(options?.offset ?? 0);
  },

  async countTemplates(options) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const s = sqliteSchema;
    const conditions: any[] = [];

    if (options?.categoryId) conditions.push(eq(s.sqliteTemplates.categoryId, options.categoryId));
    if (options?.featured) conditions.push(eq(s.sqliteTemplates.featured, 1));
    if (options?.search)
      conditions.push(sql`${s.sqliteTemplates.name} LIKE ${'%' + options.search + '%'}`);

    let query: any = sqliteDb
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(s.sqliteTemplates);
    if (conditions.length > 0) query = query.where(and(...conditions));

    const result = await query;
    return result[0]?.count ?? 0;
  },

  async getTemplate(id: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteTemplates)
      .where(eq(sqliteSchema.sqliteTemplates.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async createTemplate(id: string, data) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb.insert(sqliteSchema.sqliteTemplates).values({
      id,
      name: data.name,
      description: data.description ?? null,
      workflowData: data.workflowData as any,
      categoryId: data.categoryId ?? null,
      tags: data.tags ?? null,
      authorId: data.authorId,
      thumbnail: data.thumbnail ?? null,
      downloads: 0,
      avgRating: 0,
      ratingCount: 0,
      featured: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },

  async deleteTemplate(id: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb
      .delete(sqliteSchema.sqliteTemplates)
      .where(eq(sqliteSchema.sqliteTemplates.id, id));
    return true;
  },

  async incrementTemplateDownloads(id: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb
      .update(sqliteSchema.sqliteTemplates)
      .set({ downloads: sql`${sqliteSchema.sqliteTemplates.downloads} + 1` })
      .where(eq(sqliteSchema.sqliteTemplates.id, id));
  },

  async listTemplateReviews(templateId: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    return await sqliteDb
      .select()
      .from(sqliteSchema.sqliteTemplateReviews)
      .where(eq(sqliteSchema.sqliteTemplateReviews.templateId, templateId))
      .orderBy(desc(sqliteSchema.sqliteTemplateReviews.createdAt));
  },

  async upsertTemplateReview(
    id: string,
    templateId: string,
    userId: string,
    rating: number,
    review?: string | null,
  ) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const existing = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteTemplateReviews)
      .where(
        and(
          eq(sqliteSchema.sqliteTemplateReviews.templateId, templateId),
          eq(sqliteSchema.sqliteTemplateReviews.userId, userId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await sqliteDb
        .update(sqliteSchema.sqliteTemplateReviews)
        .set({ rating, review: review ?? null, createdAt: Date.now() })
        .where(eq(sqliteSchema.sqliteTemplateReviews.id, existing[0].id));

      // Recalculate avg rating
      const stats = await sqliteDb
        .select({
          avg: sql<number>`cast(avg(${sqliteSchema.sqliteTemplateReviews.rating}) as integer)`,
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(sqliteSchema.sqliteTemplateReviews)
        .where(eq(sqliteSchema.sqliteTemplateReviews.templateId, templateId));

      await sqliteDb
        .update(sqliteSchema.sqliteTemplates)
        .set({ avgRating: stats[0]?.avg ?? 0, ratingCount: stats[0]?.count ?? 0 })
        .where(eq(sqliteSchema.sqliteTemplates.id, templateId));
    } else {
      await sqliteDb.insert(sqliteSchema.sqliteTemplateReviews).values({
        id,
        templateId,
        userId,
        rating,
        review: review ?? null,
        createdAt: Date.now(),
      });

      const stats = await sqliteDb
        .select({
          avg: sql<number>`cast(avg(${sqliteSchema.sqliteTemplateReviews.rating}) as integer)`,
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(sqliteSchema.sqliteTemplateReviews)
        .where(eq(sqliteSchema.sqliteTemplateReviews.templateId, templateId));

      await sqliteDb
        .update(sqliteSchema.sqliteTemplates)
        .set({ avgRating: stats[0]?.avg ?? 0, ratingCount: stats[0]?.count ?? 0 })
        .where(eq(sqliteSchema.sqliteTemplates.id, templateId));
    }
  },

  async listTemplateCategories() {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    return await sqliteDb
      .select()
      .from(sqliteSchema.sqliteTemplateCategories)
      .orderBy(sqliteSchema.sqliteTemplateCategories.sortOrder);
  },

  // ─── Credits ─────────────────────────────────────────────────────────────────

  async getUserCredits(userId: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteUserCredits)
      .where(eq(sqliteSchema.sqliteUserCredits.userId, userId))
      .limit(1);
    if (rows.length === 0) return { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 };
    return {
      balance: rows[0].balance,
      lifetimeEarned: rows[0].lifetimeEarned,
      lifetimeSpent: rows[0].lifetimeSpent,
    };
  },

  async grantCredits(
    userId: string,
    amount: number,
    type: string,
    description?: string,
    executionId?: string,
  ) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const existing = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteUserCredits)
      .where(eq(sqliteSchema.sqliteUserCredits.userId, userId))
      .limit(1);

    if (existing.length === 0) {
      await sqliteDb.insert(sqliteSchema.sqliteUserCredits).values({
        userId,
        balance: amount,
        lifetimeEarned: amount,
        lifetimeSpent: 0,
        updatedAt: Date.now(),
      });
    } else {
      await sqliteDb
        .update(sqliteSchema.sqliteUserCredits)
        .set({
          balance: sql`${sqliteSchema.sqliteUserCredits.balance} + ${amount}`,
          lifetimeEarned: sql`${sqliteSchema.sqliteUserCredits.lifetimeEarned} + ${amount}`,
          updatedAt: Date.now(),
        })
        .where(eq(sqliteSchema.sqliteUserCredits.userId, userId));
    }

    await sqliteDb.insert(sqliteSchema.sqliteCreditTransactions).values({
      id: crypto.randomUUID(),
      userId,
      amount,
      type,
      description: description ?? null,
      executionId: executionId ?? null,
      createdAt: Date.now(),
    });
  },

  async deductCredits(userId: string, amount: number, description?: string, executionId?: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb
      .update(sqliteSchema.sqliteUserCredits)
      .set({
        balance: sql`${sqliteSchema.sqliteUserCredits.balance} - ${amount}`,
        lifetimeSpent: sql`${sqliteSchema.sqliteUserCredits.lifetimeSpent} + ${amount}`,
        updatedAt: Date.now(),
      })
      .where(eq(sqliteSchema.sqliteUserCredits.userId, userId));

    await sqliteDb.insert(sqliteSchema.sqliteCreditTransactions).values({
      id: crypto.randomUUID(),
      userId,
      amount: -amount,
      type: 'execution_cost',
      description: description ?? null,
      executionId: executionId ?? null,
      createdAt: Date.now(),
    });
  },

  async listCreditTransactions(userId: string, limit = 50) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteCreditTransactions)
      .where(eq(sqliteSchema.sqliteCreditTransactions.userId, userId))
      .orderBy(desc(sqliteSchema.sqliteCreditTransactions.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      amount: r.amount,
      type: r.type as any,
      description: r.description ?? null,
      executionId: r.executionId ?? null,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  },

  // ─── Workflow limits ─────────────────────────────────────────────────────────

  async countUserWorkflows(userId: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(sqliteSchema.sqliteWorkflows)
      .where(eq(sqliteSchema.sqliteWorkflows.userId, userId));
    return rows[0]?.count ?? 0;
  },
};
