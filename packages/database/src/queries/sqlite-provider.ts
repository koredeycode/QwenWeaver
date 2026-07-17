import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { getConnection, sqliteSchema } from '../index.js';
import type {
  QueryProvider,
  WorkflowRow,
  WorkflowDetail,
  ExecutionSummaryRow,
} from './provider.js';
import type { SavedMCPServerInput, SavedMCPServer } from './mcp.js';
import type {
  WorkflowPayload,
  ExecutionMetrics,
  AgentLogInput,
  AgentLogOutput,
  MCPAuthConfig,
  CredentialResponse,
  CredentialInput,
  CredentialUpdate,
  CopilotHistoryMessage,
} from '@qwenweaver/types';
import { encrypt, decrypt } from '@qwenweaver/encryption';

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
  async createUser(id: string, email: string, name: string): Promise<void> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const now = Date.now();
    await sqliteDb.insert(sqliteSchema.user).values({
      id,
      email,
      name,
      emailVerified: false,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });
  },

  async getUserByEmail(email: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb
      .select()
      .from(sqliteSchema.user)
      .where(eq(sqliteSchema.user.email, email))
      .limit(1);
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      createdAt: rows[0].createdAt,
    };
  },

  async getUserById(id: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb
      .select()
      .from(sqliteSchema.user)
      .where(eq(sqliteSchema.user.id, id))
      .limit(1);
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      image: rows[0].image,
      createdAt: rows[0].createdAt,
    };
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
      iconUrl: input.iconUrl || null,
      authConfig: input.authConfig || null,
      registryOrigin: input.registryOrigin || 'manual',
      registryId: input.registryId || null,
      registryMetadata: input.registryMetadata || null,
      isFavorite: input.isFavorite ? 1 : 0,
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
      command: undefined,
      args: undefined,
      iconUrl: input.iconUrl ?? undefined,
      authConfig: input.authConfig ?? undefined,
      registryOrigin: input.registryOrigin ?? undefined,
      registryId: input.registryId ?? undefined,
      registryMetadata: input.registryMetadata ?? undefined,
      isFavorite: Boolean(input.isFavorite),
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
      isFavorite: Boolean(r.isFavorite),
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  },

  async toggleFavoriteMcpServer(id: string, userId: string): Promise<SavedMCPServer> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const [current] = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteMcpServers)
      .where(
        and(
          eq(sqliteSchema.sqliteMcpServers.id, id),
          eq(sqliteSchema.sqliteMcpServers.userId, userId),
        ),
      )
      .limit(1);
    if (!current) throw new Error('MCP server not found');
    const newVal = current.isFavorite ? 0 : 1;
    await sqliteDb
      .update(sqliteSchema.sqliteMcpServers)
      .set({ isFavorite: newVal })
      .where(eq(sqliteSchema.sqliteMcpServers.id, id));
    const [updated] = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteMcpServers)
      .where(eq(sqliteSchema.sqliteMcpServers.id, id))
      .limit(1);
    const r = updated;
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
      isFavorite: Boolean(r.isFavorite),
      createdAt: new Date(r.createdAt).toISOString(),
    };
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
      isFavorite: Boolean(r.isFavorite),
      createdAt: new Date(r.createdAt).toISOString(),
    };
  },

  async listCredentials(userId: string): Promise<CredentialResponse[]> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const s = sqliteSchema;
    const rows = await sqliteDb
      .select({
        id: s.sqliteCredentials.id,
        userId: s.sqliteCredentials.userId,
        name: s.sqliteCredentials.name,
        type: s.sqliteCredentials.type,
        description: s.sqliteCredentials.description,
        createdAt: s.sqliteCredentials.createdAt,
        updatedAt: s.sqliteCredentials.updatedAt,
      })
      .from(s.sqliteCredentials)
      .where(eq(s.sqliteCredentials.userId, userId));
    return rows as CredentialResponse[];
  },

  async getCredential(id: string, userId: string): Promise<CredentialResponse | null> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const s = sqliteSchema;
    const rows = await sqliteDb
      .select()
      .from(s.sqliteCredentials)
      .where(and(eq(s.sqliteCredentials.id, id), eq(s.sqliteCredentials.userId, userId)))
      .limit(1);
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      type: row.type as CredentialResponse['type'],
      description: row.description,
      value: decrypt(row.encryptedData),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  async createCredential(userId: string, input: CredentialInput): Promise<CredentialResponse> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const s = sqliteSchema;
    const id = crypto.randomUUID();
    const encrypted = encrypt(input.value);
    const now = Date.now();
    await sqliteDb.insert(s.sqliteCredentials).values({
      id,
      userId,
      name: input.name,
      type: input.type,
      encryptedData: encrypted,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return {
      id,
      userId,
      name: input.name,
      type: input.type,
      description: input.description ?? null,
      value: input.value,
      createdAt: now,
      updatedAt: now,
    };
  },

  async updateCredential(
    id: string,
    userId: string,
    input: CredentialUpdate,
  ): Promise<CredentialResponse> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const s = sqliteSchema;
    const existing = await sqliteDb
      .select()
      .from(s.sqliteCredentials)
      .where(and(eq(s.sqliteCredentials.id, id), eq(s.sqliteCredentials.userId, userId)))
      .limit(1);
    if (existing.length === 0) throw new Error('Credential not found');

    const values: Record<string, unknown> = { updatedAt: Date.now() };
    if (input.name !== undefined) values.name = input.name;
    if (input.description !== undefined) values.description = input.description;
    if (input.value !== undefined) values.encryptedData = encrypt(input.value);

    await sqliteDb.update(s.sqliteCredentials).set(values).where(eq(s.sqliteCredentials.id, id));

    const updated = await sqliteDb
      .select()
      .from(s.sqliteCredentials)
      .where(eq(s.sqliteCredentials.id, id))
      .limit(1);
    const row = updated[0];
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      type: row.type as CredentialResponse['type'],
      description: row.description,
      value: input.value ?? decrypt(row.encryptedData),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  async deleteCredential(id: string, userId: string): Promise<boolean> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const s = sqliteSchema;
    const existing = await sqliteDb
      .select()
      .from(s.sqliteCredentials)
      .where(and(eq(s.sqliteCredentials.id, id), eq(s.sqliteCredentials.userId, userId)))
      .limit(1);
    if (existing.length === 0) return false;
    await sqliteDb
      .delete(s.sqliteCredentials)
      .where(and(eq(s.sqliteCredentials.id, id), eq(s.sqliteCredentials.userId, userId)));
    return true;
  },

  async saveWorkflow(userId: string, workflow: WorkflowPayload): Promise<string> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const workflowId = workflow.id || crypto.randomUUID();

    const { copilotHistory, ...rest } = workflow;
    const payload: WorkflowPayload = {
      ...rest,
      nodes: workflow.nodes.map((n) => ({ ...n, id: n.id })),
      edges: workflow.edges.map((e) => ({ ...e, id: e.id })),
    };

    await sqliteDb.insert(sqliteSchema.sqliteWorkflows).values({
      id: workflowId,
      userId,
      name: workflow.name,
      description: workflow.description || null,
      isActive: 1,
      nodesEdges: payload,
      copilotHistory: copilotHistory || [],
      createdAt: Date.now(),
    });

    return workflowId;
  },

  async updateWorkflow(
    workflowId: string,
    userId: string,
    workflow: WorkflowPayload,
  ): Promise<string> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;

    const { copilotHistory, ...rest } = workflow;
    const payload: WorkflowPayload = {
      ...rest,
      nodes: workflow.nodes.map((n) => ({ ...n, id: n.id })),
      edges: workflow.edges.map((e) => ({ ...e, id: e.id })),
    };

    const updateData: Record<string, any> = {
      name: workflow.name,
      description: workflow.description || null,
      nodesEdges: payload,
    };
    if (copilotHistory) {
      updateData.copilotHistory = copilotHistory;
    }

    await sqliteDb
      .update(sqliteSchema.sqliteWorkflows)
      .set(updateData)
      .where(
        and(
          eq(sqliteSchema.sqliteWorkflows.id, workflowId),
          eq(sqliteSchema.sqliteWorkflows.userId, userId),
        ),
      );

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
        nodesEdges: sqliteSchema.sqliteWorkflows.nodesEdges,
      })
      .from(sqliteSchema.sqliteWorkflows)
      .where(eq(sqliteSchema.sqliteWorkflows.userId, userId))
      .orderBy(desc(sqliteSchema.sqliteWorkflows.createdAt));

    return workflows.map((w) => {
      const nodeCounts: Record<string, number> = {};
      if (w.nodesEdges?.nodes) {
        for (const node of w.nodesEdges.nodes) {
          nodeCounts[node.type] = (nodeCounts[node.type] || 0) + 1;
        }
      }
      return {
        id: w.id,
        name: w.name,
        description: w.description,
        createdAt: w.createdAt,
        nodeCounts,
      };
    });
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
        nodesEdges: sqliteSchema.sqliteWorkflows.nodesEdges,
        copilotHistory: sqliteSchema.sqliteWorkflows.copilotHistory,
      })
      .from(sqliteSchema.sqliteWorkflows)
      .where(
        and(
          eq(sqliteSchema.sqliteWorkflows.id, id),
          eq(sqliteSchema.sqliteWorkflows.userId, userId),
        ),
      )
      .limit(1);
    if (wf.length === 0 || !wf[0].nodesEdges) return null;

    return wf[0] as WorkflowDetail;
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
    return (changes ?? 0) > 0;
  },

  async deleteWorkflows(ids: string[], userId: string): Promise<number> {
    if (ids.length === 0) return 0;
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const result = await sqliteDb
      .delete(sqliteSchema.sqliteWorkflows)
      .where(
        and(
          inArray(sqliteSchema.sqliteWorkflows.id, ids),
          eq(sqliteSchema.sqliteWorkflows.userId, userId),
        ),
      );
    const changes = (result as unknown as { changes: number }).changes;
    return changes ?? 0;
  },

  async updateCopilotHistory(
    workflowId: string,
    userId: string,
    history: CopilotHistoryMessage[],
  ): Promise<void> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb
      .update(sqliteSchema.sqliteWorkflows)
      .set({ copilotHistory: history })
      .where(
        and(
          eq(sqliteSchema.sqliteWorkflows.id, workflowId),
          eq(sqliteSchema.sqliteWorkflows.userId, userId),
        ),
      );
  },

  async createExecution(
    executionId: string,
    workflowId: string,
    userId: string,
    graphSnapshot?: WorkflowPayload,
  ): Promise<void> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb.insert(sqliteSchema.sqliteExecutions).values({
      id: executionId,
      workflowId,
      userId,
      status: 'pending',
      graphSnapshot: graphSnapshot || null,
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

  async listUserExecutions(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    workflowId?: string,
  ): Promise<ExecutionSummaryRow[]> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb
      .select({
        id: sqliteSchema.sqliteExecutions.id,
        workflowId: sqliteSchema.sqliteExecutions.workflowId,
        workflowName: sqliteSchema.sqliteWorkflows.name,
        status: sqliteSchema.sqliteExecutions.status,
        metrics: sqliteSchema.sqliteExecutions.metrics,
        startedAt: sqliteSchema.sqliteExecutions.startedAt,
        completedAt: sqliteSchema.sqliteExecutions.completedAt,
      })
      .from(sqliteSchema.sqliteExecutions)
      .leftJoin(
        sqliteSchema.sqliteWorkflows,
        eq(sqliteSchema.sqliteExecutions.workflowId, sqliteSchema.sqliteWorkflows.id),
      )
      .where(
        workflowId
          ? and(
              eq(sqliteSchema.sqliteExecutions.userId, userId),
              eq(sqliteSchema.sqliteExecutions.workflowId, workflowId),
            )
          : eq(sqliteSchema.sqliteExecutions.userId, userId),
      )
      .orderBy(desc(sqliteSchema.sqliteExecutions.startedAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      id: r.id,
      workflowId: r.workflowId ?? '',
      workflowName: r.workflowName ?? null,
      status: r.status,
      metrics: r.metrics ?? undefined,
      startedAt: new Date(r.startedAt).toISOString(),
      completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : undefined,
    }));
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

  async reserveCredits(userId: string, amount: number): Promise<boolean> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const s = sqliteSchema;
    const result = await sqliteDb
      .update(s.sqliteUserCredits)
      .set({
        balance: sql`${s.sqliteUserCredits.balance} - ${amount}`,
        lifetimeSpent: sql`${s.sqliteUserCredits.lifetimeSpent} + ${amount}`,
        updatedAt: Date.now(),
      })
      .where(
        and(
          eq(s.sqliteUserCredits.userId, userId),
          sql`${s.sqliteUserCredits.balance} >= ${amount}`,
        ),
      );
    const r = result as any;
    const changes = r.changes ?? r.meta?.changes ?? 0;
    return changes > 0;
  },

  async deductCredits(
    userId: string,
    amount: number,
    description?: string,
    executionId?: string,
  ): Promise<boolean> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb
      .update(sqliteSchema.sqliteUserCredits)
      .set({
        balance: sql`MAX(${sqliteSchema.sqliteUserCredits.balance} - ${amount}, 0)`,
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
    return true;
  },

  async refundCredits(
    userId: string,
    amount: number,
    type: string,
    description?: string,
    executionId?: string,
  ) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb
      .update(sqliteSchema.sqliteUserCredits)
      .set({
        balance: sql`${sqliteSchema.sqliteUserCredits.balance} + ${amount}`,
        lifetimeSpent: sql`${sqliteSchema.sqliteUserCredits.lifetimeSpent} - ${amount}`,
        updatedAt: Date.now(),
      })
      .where(eq(sqliteSchema.sqliteUserCredits.userId, userId));

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

  // ─── Workspace blackboard ─────────────────────────────────────────────────────

  async writeWorkspaceEntry(
    executionId: string,
    nodeId: string,
    key: string,
    value: unknown,
    valueType: string = 'text',
    fileUrl?: string,
    expectedRound?: number,
  ): Promise<string> {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const now = Date.now();

    const existing = await sqliteDb
      .select({
        id: sqliteSchema.sqliteWorkspaceEntries.id,
        round: sqliteSchema.sqliteWorkspaceEntries.round,
      })
      .from(sqliteSchema.sqliteWorkspaceEntries)
      .where(
        and(
          eq(sqliteSchema.sqliteWorkspaceEntries.executionId, executionId),
          eq(sqliteSchema.sqliteWorkspaceEntries.key, key),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const row = existing[0];
      if (expectedRound !== undefined && row.round !== expectedRound) {
        throw new Error('CONCURRENT_MODIFICATION');
      }
      await sqliteDb
        .update(sqliteSchema.sqliteWorkspaceEntries)
        .set({
          value,
          valueType,
          fileUrl: fileUrl || null,
          nodeId,
          round: row.round + 1,
          createdAt: now,
        })
        .where(eq(sqliteSchema.sqliteWorkspaceEntries.id, row.id));
      return row.id;
    }

    const id = crypto.randomUUID();
    await sqliteDb.insert(sqliteSchema.sqliteWorkspaceEntries).values({
      id,
      executionId,
      nodeId,
      key,
      value,
      valueType,
      fileUrl: fileUrl || null,
      round: 0,
      createdAt: now,
    });
    return id;
  },

  async readWorkspaceEntry(executionId: string, key: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const rows = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteWorkspaceEntries)
      .where(
        and(
          eq(sqliteSchema.sqliteWorkspaceEntries.executionId, executionId),
          eq(sqliteSchema.sqliteWorkspaceEntries.key, key),
        ),
      )
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      executionId: r.executionId ?? '',
      nodeId: r.nodeId,
      key: r.key,
      value: r.value,
      valueType: (r.valueType as any) ?? 'text',
      fileUrl: r.fileUrl ?? undefined,
      round: r.round,
      createdAt: new Date(r.createdAt).toISOString(),
    };
  },

  async listWorkspaceEntries(executionId: string, nodeId?: string, prefix?: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const conditions = [eq(sqliteSchema.sqliteWorkspaceEntries.executionId, executionId)];
    if (nodeId) {
      conditions.push(eq(sqliteSchema.sqliteWorkspaceEntries.nodeId, nodeId));
    }
    if (prefix) {
      conditions.push(sql`${sqliteSchema.sqliteWorkspaceEntries.key} LIKE ${prefix + '%'}`);
    }

    const rows = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteWorkspaceEntries)
      .where(and(...conditions))
      .orderBy(sqliteSchema.sqliteWorkspaceEntries.createdAt);

    return rows.map((r) => ({
      id: r.id,
      executionId: r.executionId ?? '',
      nodeId: r.nodeId,
      key: r.key,
      value: r.value,
      valueType: (r.valueType as any) ?? 'text',
      fileUrl: r.fileUrl ?? undefined,
      round: r.round,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  },

  async deleteWorkspaceEntry(id: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb
      .delete(sqliteSchema.sqliteWorkspaceEntries)
      .where(eq(sqliteSchema.sqliteWorkspaceEntries.id, id));
  },

  async clearWorkspace(executionId: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb
      .delete(sqliteSchema.sqliteWorkspaceEntries)
      .where(eq(sqliteSchema.sqliteWorkspaceEntries.executionId, executionId));
  },

  // ─── Execution Messages (DataBus) ─────────────────────────────────────────

  async writeExecutionMessage(data) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb.insert(sqliteSchema.sqliteExecutionMessages).values({
      id: data.id,
      executionId: data.executionId,
      topic: data.topic,
      sourceNodeId: data.sourceNodeId,
      messageType: data.messageType,
      payload: data.payload,
      contentType: data.contentType ?? null,
      round: data.round,
      createdAt: data.createdAt,
    });
  },

  async listExecutionMessages(executionId: string, topic?: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const conditions = [eq(sqliteSchema.sqliteExecutionMessages.executionId, executionId)];
    if (topic) {
      conditions.push(eq(sqliteSchema.sqliteExecutionMessages.topic, topic));
    }
    const rows = await sqliteDb
      .select()
      .from(sqliteSchema.sqliteExecutionMessages)
      .where(and(...conditions))
      .orderBy(sqliteSchema.sqliteExecutionMessages.createdAt);
    return rows.map((r) => ({
      id: r.id,
      executionId: r.executionId ?? '',
      topic: r.topic,
      sourceNodeId: r.sourceNodeId,
      messageType: r.messageType,
      payload: r.payload,
      contentType: r.contentType ?? null,
      round: r.round,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  },

  async clearExecutionMessages(executionId: string) {
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    await sqliteDb
      .delete(sqliteSchema.sqliteExecutionMessages)
      .where(eq(sqliteSchema.sqliteExecutionMessages.executionId, executionId));
  },
};
