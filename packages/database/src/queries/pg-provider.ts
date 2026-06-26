import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getConnection, pgSchema } from '../index.js';
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
    const rows = await pgDb
      .select()
      .from(pgSchema.pgUsers)
      .where(eq(pgSchema.pgUsers.email, email))
      .limit(1);
    return rows[0] || null;
  },

  async getUserById(id: string) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const rows = await pgDb
      .select()
      .from(pgSchema.pgUsers)
      .where(eq(pgSchema.pgUsers.id, id))
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
      iconUrl: input.iconUrl || null,
      registryOrigin: input.registryOrigin || 'manual',
      registryId: input.registryId || null,
      registryMetadata: input.registryMetadata || null,
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
      iconUrl: input.iconUrl ?? undefined,
      registryOrigin: input.registryOrigin ?? undefined,
      registryId: input.registryId ?? undefined,
      registryMetadata: input.registryMetadata ?? undefined,
      createdAt: new Date().toISOString(),
    };
  },

  async getMcpServers(userId: string): Promise<SavedMCPServer[]> {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const rows = await pgDb
      .select()
      .from(pgSchema.pgMcpServers)
      .where(eq(pgSchema.pgMcpServers.userId, userId));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      transport: r.transport,
      url: r.url ?? undefined,
      command: r.command ?? undefined,
      args: r.args ?? undefined,
      iconUrl: r.iconUrl ?? undefined,
      registryOrigin: r.registryOrigin ?? undefined,
      registryId: r.registryId ?? undefined,
      registryMetadata: r.registryMetadata ?? undefined,
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

  async updateMcpServerAuth(
    id: string,
    userId: string,
    authConfig: MCPAuthConfig,
  ): Promise<SavedMCPServer> {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    await pgDb
      .update(pgSchema.pgMcpServers)
      .set({ authConfig })
      .where(and(eq(pgSchema.pgMcpServers.id, id), eq(pgSchema.pgMcpServers.userId, userId)));
    const [r] = await pgDb
      .select()
      .from(pgSchema.pgMcpServers)
      .where(eq(pgSchema.pgMcpServers.id, id))
      .limit(1);
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
      createdAt: r.createdAt.toISOString(),
    };
  },

  async saveWorkflow(userId: string, workflow: WorkflowPayload): Promise<string> {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const workflowId = workflow.id || crypto.randomUUID();

    const payload: WorkflowPayload = {
      ...workflow,
      nodes: workflow.nodes.map((n) => ({ ...n, id: n.id })),
      edges: workflow.edges.map((e) => ({ ...e, id: e.id })),
    };

    await pgDb.insert(pgSchema.pgWorkflows).values({
      id: workflowId,
      userId,
      name: workflow.name,
      description: workflow.description || null,
      isActive: 1,
      nodesEdges: payload,
      createdAt: new Date(),
    });

    return workflowId;
  },

  async updateWorkflow(
    workflowId: string,
    userId: string,
    workflow: WorkflowPayload,
  ): Promise<string> {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;

    const payload: WorkflowPayload = {
      ...workflow,
      nodes: workflow.nodes.map((n) => ({ ...n, id: n.id })),
      edges: workflow.edges.map((e) => ({ ...e, id: e.id })),
    };

    await pgDb
      .update(pgSchema.pgWorkflows)
      .set({
        name: workflow.name,
        description: workflow.description || null,
        nodesEdges: payload,
      })
      .where(
        and(eq(pgSchema.pgWorkflows.id, workflowId), eq(pgSchema.pgWorkflows.userId, userId)),
      );

    return workflowId;
  },

  async listUserWorkflows(userId: string): Promise<WorkflowRow[]> {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const workflows = await pgDb
      .select({
        id: pgSchema.pgWorkflows.id,
        name: pgSchema.pgWorkflows.name,
        description: pgSchema.pgWorkflows.description,
        createdAt: pgSchema.pgWorkflows.createdAt,
        nodesEdges: pgSchema.pgWorkflows.nodesEdges,
      })
      .from(pgSchema.pgWorkflows)
      .where(eq(pgSchema.pgWorkflows.userId, userId))
      .orderBy(desc(pgSchema.pgWorkflows.createdAt));

    return workflows.map((w) => {
      const nodeCounts: Record<string, number> = {};
      if (w.nodesEdges?.nodes) {
        for (const node of w.nodesEdges.nodes) {
          nodeCounts[node.type] = (nodeCounts[node.type] || 0) + 1;
        }
      }
      return { id: w.id, name: w.name, description: w.description, createdAt: w.createdAt, nodeCounts };
    });
  },

  async getWorkflow(id: string, userId: string): Promise<WorkflowDetail | null> {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const wf = await pgDb
      .select({
        id: pgSchema.pgWorkflows.id,
        name: pgSchema.pgWorkflows.name,
        description: pgSchema.pgWorkflows.description,
        createdAt: pgSchema.pgWorkflows.createdAt,
        nodesEdges: pgSchema.pgWorkflows.nodesEdges,
      })
      .from(pgSchema.pgWorkflows)
      .where(and(eq(pgSchema.pgWorkflows.id, id), eq(pgSchema.pgWorkflows.userId, userId)))
      .limit(1);
    if (wf.length === 0 || !wf[0].nodesEdges) return null;

    return wf[0] as WorkflowDetail;
  },

  async deleteWorkflow(id: string, userId: string): Promise<boolean> {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const result = await pgDb
      .delete(pgSchema.pgWorkflows)
      .where(and(eq(pgSchema.pgWorkflows.id, id), eq(pgSchema.pgWorkflows.userId, userId)));
    const rowCount = (result as unknown as { rowCount: number }).rowCount;
    return (rowCount ?? 0) > 0;
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
    metrics?: ExecutionMetrics,
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
    error?: string | null,
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

  async getAnalyticsSummary(userId: string, recentLimit: number = 10) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;

    const summaryRows = await pgDb
      .select({
        totalRuns: sql<number>`cast(count(*) as integer)`,
        completedRuns: sql<number>`cast(sum(case when status = 'completed' then 1 else 0 end) as integer)`,
        failedRuns: sql<number>`cast(sum(case when status = 'failed' then 1 else 0 end) as integer)`,
        avgSpeedup: sql<number | null>`avg(cast(metrics->>'speedupS' as numeric))`,
        totalTokens: sql<number>`cast(sum(cast(metrics->>'totalTokens' as integer)) as integer)`,
        avgLatencyMs: sql<number | null>`avg(cast(metrics->>'totalLatencyMs' as numeric))`,
      })
      .from(pgSchema.pgExecutions)
      .where(eq(pgSchema.pgExecutions.userId, userId));

    const recentRows = await pgDb
      .select({
        id: pgSchema.pgExecutions.id,
        status: pgSchema.pgExecutions.status,
        startedAt: pgSchema.pgExecutions.startedAt,
        metrics: pgSchema.pgExecutions.metrics,
      })
      .from(pgSchema.pgExecutions)
      .where(eq(pgSchema.pgExecutions.userId, userId))
      .orderBy(desc(pgSchema.pgExecutions.startedAt))
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
        startedAt: r.startedAt.toISOString(),
        totalTokens: r.metrics?.totalTokens,
      })),
    };
  },

  async healthCheck(): Promise<void> {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    await pgDb.execute(sql`SELECT 1`);
  },

  // ─── Templates ──────────────────────────────────────────────────────────────

  async listTemplates(options) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const s = pgSchema;
    const conditions: any[] = [];

    if (options?.categoryId) conditions.push(eq(s.pgTemplates.categoryId, options.categoryId));
    if (options?.featured) conditions.push(eq(s.pgTemplates.featured, 1));
    if (options?.search)
      conditions.push(sql`${s.pgTemplates.name} ILIKE ${'%' + options.search + '%'}`);

    let query: any = pgDb.select().from(s.pgTemplates).orderBy(desc(s.pgTemplates.downloads));
    if (conditions.length > 0) query = query.where(and(...conditions));

    return await query.limit(options?.limit ?? 50).offset(options?.offset ?? 0);
  },

  async countTemplates(options) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const s = pgSchema;
    const conditions: any[] = [];

    if (options?.categoryId) conditions.push(eq(s.pgTemplates.categoryId, options.categoryId));
    if (options?.featured) conditions.push(eq(s.pgTemplates.featured, 1));
    if (options?.search)
      conditions.push(sql`${s.pgTemplates.name} ILIKE ${'%' + options.search + '%'}`);

    let query: any = pgDb
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(s.pgTemplates);
    if (conditions.length > 0) query = query.where(and(...conditions));

    const result = await query;
    return result[0]?.count ?? 0;
  },

  async getTemplate(id: string) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const rows = await pgDb
      .select()
      .from(pgSchema.pgTemplates)
      .where(eq(pgSchema.pgTemplates.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async createTemplate(id: string, data) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    await pgDb.insert(pgSchema.pgTemplates).values({
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
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  },

  async deleteTemplate(id: string) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    await pgDb.delete(pgSchema.pgTemplates).where(eq(pgSchema.pgTemplates.id, id));
    return true;
  },

  async incrementTemplateDownloads(id: string) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    await pgDb
      .update(pgSchema.pgTemplates)
      .set({ downloads: sql`${pgSchema.pgTemplates.downloads} + 1` })
      .where(eq(pgSchema.pgTemplates.id, id));
  },

  async listTemplateReviews(templateId: string) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    return await pgDb
      .select()
      .from(pgSchema.pgTemplateReviews)
      .where(eq(pgSchema.pgTemplateReviews.templateId, templateId))
      .orderBy(desc(pgSchema.pgTemplateReviews.createdAt));
  },

  async upsertTemplateReview(
    id: string,
    templateId: string,
    userId: string,
    rating: number,
    review?: string | null,
  ) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const existing = await pgDb
      .select()
      .from(pgSchema.pgTemplateReviews)
      .where(
        and(
          eq(pgSchema.pgTemplateReviews.templateId, templateId),
          eq(pgSchema.pgTemplateReviews.userId, userId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await pgDb
        .update(pgSchema.pgTemplateReviews)
        .set({ rating, review: review ?? null })
        .where(eq(pgSchema.pgTemplateReviews.id, existing[0].id));

      const stats = await pgDb
        .select({
          avg: sql<number>`cast(avg(${pgSchema.pgTemplateReviews.rating}) as integer)`,
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(pgSchema.pgTemplateReviews)
        .where(eq(pgSchema.pgTemplateReviews.templateId, templateId));

      await pgDb
        .update(pgSchema.pgTemplates)
        .set({ avgRating: stats[0]?.avg ?? 0, ratingCount: stats[0]?.count ?? 0 })
        .where(eq(pgSchema.pgTemplates.id, templateId));
    } else {
      await pgDb.insert(pgSchema.pgTemplateReviews).values({
        id,
        templateId,
        userId,
        rating,
        review: review ?? null,
      });

      const stats = await pgDb
        .select({
          avg: sql<number>`cast(avg(${pgSchema.pgTemplateReviews.rating}) as integer)`,
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(pgSchema.pgTemplateReviews)
        .where(eq(pgSchema.pgTemplateReviews.templateId, templateId));

      await pgDb
        .update(pgSchema.pgTemplates)
        .set({ avgRating: stats[0]?.avg ?? 0, ratingCount: stats[0]?.count ?? 0 })
        .where(eq(pgSchema.pgTemplates.id, templateId));
    }
  },

  async listTemplateCategories() {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    return await pgDb
      .select()
      .from(pgSchema.pgTemplateCategories)
      .orderBy(pgSchema.pgTemplateCategories.sortOrder);
  },

  // ─── Credits ─────────────────────────────────────────────────────────────────

  async getUserCredits(userId: string) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const rows = await pgDb
      .select()
      .from(pgSchema.pgUserCredits)
      .where(eq(pgSchema.pgUserCredits.userId, userId))
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
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const existing = await pgDb
      .select()
      .from(pgSchema.pgUserCredits)
      .where(eq(pgSchema.pgUserCredits.userId, userId))
      .limit(1);

    if (existing.length === 0) {
      await pgDb.insert(pgSchema.pgUserCredits).values({
        userId,
        balance: amount,
        lifetimeEarned: amount,
        lifetimeSpent: 0,
        updatedAt: new Date(),
      });
    } else {
      await pgDb
        .update(pgSchema.pgUserCredits)
        .set({
          balance: sql`${pgSchema.pgUserCredits.balance} + ${amount}`,
          lifetimeEarned: sql`${pgSchema.pgUserCredits.lifetimeEarned} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(pgSchema.pgUserCredits.userId, userId));
    }

    await pgDb.insert(pgSchema.pgCreditTransactions).values({
      id: crypto.randomUUID(),
      userId,
      amount,
      type,
      description: description ?? null,
      executionId: executionId ?? null,
      createdAt: new Date(),
    });
  },

  async deductCredits(userId: string, amount: number, description?: string, executionId?: string) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    await pgDb
      .update(pgSchema.pgUserCredits)
      .set({
        balance: sql`${pgSchema.pgUserCredits.balance} - ${amount}`,
        lifetimeSpent: sql`${pgSchema.pgUserCredits.lifetimeSpent} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(pgSchema.pgUserCredits.userId, userId));

    await pgDb.insert(pgSchema.pgCreditTransactions).values({
      id: crypto.randomUUID(),
      userId,
      amount: -amount,
      type: 'execution_cost',
      description: description ?? null,
      executionId: executionId ?? null,
      createdAt: new Date(),
    });
  },

  async listCreditTransactions(userId: string, limit = 50) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const rows = await pgDb
      .select()
      .from(pgSchema.pgCreditTransactions)
      .where(eq(pgSchema.pgCreditTransactions.userId, userId))
      .orderBy(desc(pgSchema.pgCreditTransactions.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      amount: r.amount,
      type: r.type as any,
      description: r.description ?? null,
      executionId: r.executionId ?? null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  },

  // ─── Workflow limits ─────────────────────────────────────────────────────────

  async countUserWorkflows(userId: string) {
    const { db } = getConnection();
    const pgDb = db as PostgresJsDatabase<typeof pgSchema>;
    const rows = await pgDb
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(pgSchema.pgWorkflows)
      .where(eq(pgSchema.pgWorkflows.userId, userId));
    return rows[0]?.count ?? 0;
  },
};
