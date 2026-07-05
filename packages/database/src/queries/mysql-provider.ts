import { type MySql2Database } from 'drizzle-orm/mysql2';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getConnection, mysqlSchema } from '../index.js';
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

export const mysqlProvider: QueryProvider = {
  async createUser(id: string, email: string, name: string): Promise<void> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const now = new Date();
    await mysqlDb.insert(mysqlSchema.user).values({
      id,
      email,
      name,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });
  },

  async getUserByEmail(email: string) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const rows = await mysqlDb
      .select()
      .from(mysqlSchema.user)
      .where(eq(mysqlSchema.user.email, email))
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
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const rows = await mysqlDb
      .select()
      .from(mysqlSchema.user)
      .where(eq(mysqlSchema.user.id, id))
      .limit(1);
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      createdAt: rows[0].createdAt,
    };
  },

  async saveMcpServer(
    id: string,
    userId: string,
    input: SavedMCPServerInput,
  ): Promise<SavedMCPServer> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const baseValues = {
      id,
      userId,
      name: input.name,
      description: input.description || null,
      transport: input.transport,
      url: input.url || null,
      iconUrl: input.iconUrl || null,
      registryOrigin: input.registryOrigin || 'manual',
      registryId: input.registryId || null,
      registryMetadata: input.registryMetadata || null,
      isFavorite: input.isFavorite ? 1 : 0,
    };
    await mysqlDb.insert(mysqlSchema.mysqlMcpServers).values({
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
      command: undefined,
      args: undefined,
      iconUrl: input.iconUrl ?? undefined,
      registryOrigin: input.registryOrigin ?? undefined,
      registryId: input.registryId ?? undefined,
      registryMetadata: input.registryMetadata ?? undefined,
      isFavorite: Boolean(input.isFavorite),
      createdAt: new Date().toISOString(),
    };
  },

  async getMcpServers(userId: string): Promise<SavedMCPServer[]> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const rows = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlMcpServers)
      .where(eq(mysqlSchema.mysqlMcpServers.userId, userId));
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
      isFavorite: Boolean(r.isFavorite),
      createdAt: r.createdAt.toISOString(),
    }));
  },

  async toggleFavoriteMcpServer(id: string, userId: string): Promise<SavedMCPServer> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const [current] = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlMcpServers)
      .where(
        and(eq(mysqlSchema.mysqlMcpServers.id, id), eq(mysqlSchema.mysqlMcpServers.userId, userId)),
      )
      .limit(1);
    if (!current) throw new Error('MCP server not found');
    const newVal = current.isFavorite ? 0 : 1;
    await mysqlDb
      .update(mysqlSchema.mysqlMcpServers)
      .set({ isFavorite: newVal })
      .where(eq(mysqlSchema.mysqlMcpServers.id, id));
    const [r] = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlMcpServers)
      .where(eq(mysqlSchema.mysqlMcpServers.id, id))
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
      isFavorite: Boolean(r.isFavorite),
      createdAt: r.createdAt.toISOString(),
    };
  },

  async deleteMcpServer(id: string, userId: string): Promise<boolean> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const existing = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlMcpServers)
      .where(
        and(eq(mysqlSchema.mysqlMcpServers.id, id), eq(mysqlSchema.mysqlMcpServers.userId, userId)),
      )
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    await mysqlDb
      .delete(mysqlSchema.mysqlMcpServers)
      .where(
        and(eq(mysqlSchema.mysqlMcpServers.id, id), eq(mysqlSchema.mysqlMcpServers.userId, userId)),
      );

    return true;
  },

  async updateMcpServerAuth(
    id: string,
    userId: string,
    authConfig: MCPAuthConfig,
  ): Promise<SavedMCPServer> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    await mysqlDb
      .update(mysqlSchema.mysqlMcpServers)
      .set({ authConfig })
      .where(
        and(eq(mysqlSchema.mysqlMcpServers.id, id), eq(mysqlSchema.mysqlMcpServers.userId, userId)),
      );
    const [r] = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlMcpServers)
      .where(eq(mysqlSchema.mysqlMcpServers.id, id))
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
      isFavorite: Boolean(r.isFavorite),
      createdAt: r.createdAt.toISOString(),
    };
  },

  // ─── Credentials ─────────────────────────────────────────────────────────────

  async listCredentials(userId: string): Promise<CredentialResponse[]> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const s = mysqlSchema;
    const rows = await mysqlDb
      .select({
        id: s.mysqlCredentials.id,
        userId: s.mysqlCredentials.userId,
        name: s.mysqlCredentials.name,
        type: s.mysqlCredentials.type,
        description: s.mysqlCredentials.description,
        createdAt: s.mysqlCredentials.createdAt,
        updatedAt: s.mysqlCredentials.updatedAt,
      })
      .from(s.mysqlCredentials)
      .where(eq(s.mysqlCredentials.userId, userId));
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.name,
      type: r.type as CredentialResponse['type'],
      description: r.description ?? null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : Number(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.getTime() : Number(r.updatedAt),
    }));
  },

  async getCredential(id: string, userId: string): Promise<CredentialResponse | null> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const s = mysqlSchema;
    const rows = await mysqlDb
      .select()
      .from(s.mysqlCredentials)
      .where(and(eq(s.mysqlCredentials.id, id), eq(s.mysqlCredentials.userId, userId)))
      .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      userId: r.userId,
      name: r.name,
      type: r.type as CredentialResponse['type'],
      value: decrypt(r.encryptedData),
      description: r.description ?? null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : Number(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.getTime() : Number(r.updatedAt),
    };
  },

  async createCredential(userId: string, input: CredentialInput): Promise<CredentialResponse> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const s = mysqlSchema;
    const id = crypto.randomUUID();
    await mysqlDb.insert(s.mysqlCredentials).values({
      id,
      userId,
      name: input.name,
      type: input.type,
      encryptedData: encrypt(input.value),
      description: input.description ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return {
      id,
      userId,
      name: input.name,
      type: input.type,
      value: input.value,
      description: input.description ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  },

  async updateCredential(
    id: string,
    userId: string,
    input: CredentialUpdate,
  ): Promise<CredentialResponse> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const s = mysqlSchema;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.value !== undefined) updateData.encryptedData = encrypt(input.value);
    await mysqlDb
      .update(s.mysqlCredentials)
      .set(updateData)
      .where(and(eq(s.mysqlCredentials.id, id), eq(s.mysqlCredentials.userId, userId)));
    const [r] = await mysqlDb
      .select()
      .from(s.mysqlCredentials)
      .where(and(eq(s.mysqlCredentials.id, id), eq(s.mysqlCredentials.userId, userId)))
      .limit(1);
    return {
      id: r.id,
      userId: r.userId,
      name: r.name,
      type: r.type as CredentialResponse['type'],
      value: r.encryptedData ? decrypt(r.encryptedData) : undefined,
      description: r.description ?? null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : Number(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.getTime() : Number(r.updatedAt),
    };
  },

  async deleteCredential(id: string, userId: string): Promise<boolean> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const s = mysqlSchema;
    const result = await mysqlDb
      .delete(s.mysqlCredentials)
      .where(and(eq(s.mysqlCredentials.id, id), eq(s.mysqlCredentials.userId, userId)));
    const affectedRows = (result as unknown as { affectedRows: number }).affectedRows;
    return (affectedRows ?? 0) > 0;
  },

  async saveWorkflow(userId: string, workflow: WorkflowPayload): Promise<string> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const workflowId = workflow.id || crypto.randomUUID();

    const { copilotHistory, ...rest } = workflow;
    const payload: WorkflowPayload = {
      ...rest,
      nodes: workflow.nodes.map((n) => ({ ...n, id: n.id })),
      edges: workflow.edges.map((e) => ({ ...e, id: e.id })),
    };

    await mysqlDb.insert(mysqlSchema.mysqlWorkflows).values({
      id: workflowId,
      userId,
      name: workflow.name,
      description: workflow.description || null,
      isActive: 1,
      nodesEdges: payload,
      copilotHistory: copilotHistory || [],
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
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;

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

    await mysqlDb
      .update(mysqlSchema.mysqlWorkflows)
      .set(updateData)
      .where(
        and(
          eq(mysqlSchema.mysqlWorkflows.id, workflowId),
          eq(mysqlSchema.mysqlWorkflows.userId, userId),
        ),
      );

    return workflowId;
  },

  async listUserWorkflows(userId: string): Promise<WorkflowRow[]> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const workflows = await mysqlDb
      .select({
        id: mysqlSchema.mysqlWorkflows.id,
        name: mysqlSchema.mysqlWorkflows.name,
        description: mysqlSchema.mysqlWorkflows.description,
        createdAt: mysqlSchema.mysqlWorkflows.createdAt,
        nodesEdges: mysqlSchema.mysqlWorkflows.nodesEdges,
      })
      .from(mysqlSchema.mysqlWorkflows)
      .where(eq(mysqlSchema.mysqlWorkflows.userId, userId))
      .orderBy(desc(mysqlSchema.mysqlWorkflows.createdAt));

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
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const wf = await mysqlDb
      .select({
        id: mysqlSchema.mysqlWorkflows.id,
        name: mysqlSchema.mysqlWorkflows.name,
        description: mysqlSchema.mysqlWorkflows.description,
        createdAt: mysqlSchema.mysqlWorkflows.createdAt,
        nodesEdges: mysqlSchema.mysqlWorkflows.nodesEdges,
        copilotHistory: mysqlSchema.mysqlWorkflows.copilotHistory,
      })
      .from(mysqlSchema.mysqlWorkflows)
      .where(
        and(eq(mysqlSchema.mysqlWorkflows.id, id), eq(mysqlSchema.mysqlWorkflows.userId, userId)),
      )
      .limit(1);
    if (wf.length === 0 || !wf[0].nodesEdges) return null;

    return wf[0] as WorkflowDetail;
  },

  async deleteWorkflow(id: string, userId: string): Promise<boolean> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const result = await mysqlDb
      .delete(mysqlSchema.mysqlWorkflows)
      .where(
        and(eq(mysqlSchema.mysqlWorkflows.id, id), eq(mysqlSchema.mysqlWorkflows.userId, userId)),
      );
    const affectedRows = (result as unknown as { affectedRows: number }).affectedRows;
    return (affectedRows ?? 0) > 0;
  },

  async updateCopilotHistory(
    workflowId: string,
    userId: string,
    history: CopilotHistoryMessage[],
  ): Promise<void> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    await mysqlDb
      .update(mysqlSchema.mysqlWorkflows)
      .set({ copilotHistory: history })
      .where(
        and(
          eq(mysqlSchema.mysqlWorkflows.id, workflowId),
          eq(mysqlSchema.mysqlWorkflows.userId, userId),
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
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    await mysqlDb.insert(mysqlSchema.mysqlExecutions).values({
      id: executionId,
      workflowId,
      userId,
      status: 'pending',
      graphSnapshot: graphSnapshot || null,
      startedAt: new Date(),
    });
  },

  async updateExecution(
    executionId: string,
    status: string,
    metrics?: ExecutionMetrics,
  ): Promise<void> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    await mysqlDb
      .update(mysqlSchema.mysqlExecutions)
      .set({
        status,
        metrics: metrics || null,
        completedAt: new Date(),
      })
      .where(eq(mysqlSchema.mysqlExecutions.id, executionId));
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
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const id = crypto.randomUUID();
    await mysqlDb.insert(mysqlSchema.mysqlAgentLogs).values({
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

  async listUserExecutions(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    workflowId?: string,
  ): Promise<ExecutionSummaryRow[]> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const rows = await mysqlDb
      .select({
        id: mysqlSchema.mysqlExecutions.id,
        workflowId: mysqlSchema.mysqlExecutions.workflowId,
        workflowName: mysqlSchema.mysqlWorkflows.name,
        status: mysqlSchema.mysqlExecutions.status,
        metrics: mysqlSchema.mysqlExecutions.metrics,
        startedAt: mysqlSchema.mysqlExecutions.startedAt,
        completedAt: mysqlSchema.mysqlExecutions.completedAt,
      })
      .from(mysqlSchema.mysqlExecutions)
      .leftJoin(
        mysqlSchema.mysqlWorkflows,
        eq(mysqlSchema.mysqlExecutions.workflowId, mysqlSchema.mysqlWorkflows.id),
      )
      .where(
        workflowId
          ? and(
              eq(mysqlSchema.mysqlExecutions.userId, userId),
              eq(mysqlSchema.mysqlExecutions.workflowId, workflowId),
            )
          : eq(mysqlSchema.mysqlExecutions.userId, userId),
      )
      .orderBy(desc(mysqlSchema.mysqlExecutions.startedAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      id: r.id,
      workflowId: r.workflowId ?? '',
      workflowName: r.workflowName ?? null,
      status: r.status,
      metrics: r.metrics ?? undefined,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt ? r.completedAt.toISOString() : undefined,
    }));
  },

  async getExecution(executionId: string) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const rows = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlExecutions)
      .where(eq(mysqlSchema.mysqlExecutions.id, executionId))
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
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const rows = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlAgentLogs)
      .where(eq(mysqlSchema.mysqlAgentLogs.executionId, executionId));

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
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;

    const summaryRows = await mysqlDb
      .select({
        totalRuns: sql<number>`cast(count(*) as unsigned)`,
        completedRuns: sql<number>`cast(sum(case when status = 'completed' then 1 else 0 end) as unsigned)`,
        failedRuns: sql<number>`cast(sum(case when status = 'failed' then 1 else 0 end) as unsigned)`,
        avgSpeedup: sql<number | null>`avg(json_extract(metrics, '$.speedupS'))`,
        totalTokens: sql<number>`cast(sum(json_extract(metrics, '$.totalTokens')) as unsigned)`,
        avgLatencyMs: sql<number | null>`avg(json_extract(metrics, '$.totalLatencyMs'))`,
      })
      .from(mysqlSchema.mysqlExecutions)
      .where(eq(mysqlSchema.mysqlExecutions.userId, userId));

    const recentRows = await mysqlDb
      .select({
        id: mysqlSchema.mysqlExecutions.id,
        status: mysqlSchema.mysqlExecutions.status,
        startedAt: mysqlSchema.mysqlExecutions.startedAt,
        metrics: mysqlSchema.mysqlExecutions.metrics,
      })
      .from(mysqlSchema.mysqlExecutions)
      .where(eq(mysqlSchema.mysqlExecutions.userId, userId))
      .orderBy(desc(mysqlSchema.mysqlExecutions.startedAt))
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
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    await mysqlDb.execute(sql`SELECT 1`);
  },

  // ─── Templates ──────────────────────────────────────────────────────────────

  async listTemplates(options) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const s = mysqlSchema;
    const conditions: any[] = [];

    if (options?.categoryId) conditions.push(eq(s.mysqlTemplates.categoryId, options.categoryId));
    if (options?.featured) conditions.push(eq(s.mysqlTemplates.featured, 1));
    if (options?.search)
      conditions.push(sql`${s.mysqlTemplates.name} LIKE ${'%' + options.search + '%'}`);

    let query: any = mysqlDb
      .select()
      .from(s.mysqlTemplates)
      .orderBy(desc(s.mysqlTemplates.downloads));
    if (conditions.length > 0) query = query.where(and(...conditions));

    return await query.limit(options?.limit ?? 50).offset(options?.offset ?? 0);
  },

  async countTemplates(options) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const s = mysqlSchema;
    const conditions: any[] = [];

    if (options?.categoryId) conditions.push(eq(s.mysqlTemplates.categoryId, options.categoryId));
    if (options?.featured) conditions.push(eq(s.mysqlTemplates.featured, 1));
    if (options?.search)
      conditions.push(sql`${s.mysqlTemplates.name} LIKE ${'%' + options.search + '%'}`);

    let query: any = mysqlDb
      .select({ count: sql<number>`cast(count(*) as unsigned)` })
      .from(s.mysqlTemplates);
    if (conditions.length > 0) query = query.where(and(...conditions));

    const result = await query;
    return result[0]?.count ?? 0;
  },

  async getTemplate(id: string) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const rows = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlTemplates)
      .where(eq(mysqlSchema.mysqlTemplates.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async createTemplate(id: string, data) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    await mysqlDb.insert(mysqlSchema.mysqlTemplates).values({
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
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    await mysqlDb.delete(mysqlSchema.mysqlTemplates).where(eq(mysqlSchema.mysqlTemplates.id, id));
    return true;
  },

  async incrementTemplateDownloads(id: string) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    await mysqlDb
      .update(mysqlSchema.mysqlTemplates)
      .set({ downloads: sql`${mysqlSchema.mysqlTemplates.downloads} + 1` })
      .where(eq(mysqlSchema.mysqlTemplates.id, id));
  },

  async listTemplateReviews(templateId: string) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    return await mysqlDb
      .select()
      .from(mysqlSchema.mysqlTemplateReviews)
      .where(eq(mysqlSchema.mysqlTemplateReviews.templateId, templateId))
      .orderBy(desc(mysqlSchema.mysqlTemplateReviews.createdAt));
  },

  async upsertTemplateReview(
    id: string,
    templateId: string,
    userId: string,
    rating: number,
    review?: string | null,
  ) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const existing = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlTemplateReviews)
      .where(
        and(
          eq(mysqlSchema.mysqlTemplateReviews.templateId, templateId),
          eq(mysqlSchema.mysqlTemplateReviews.userId, userId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await mysqlDb
        .update(mysqlSchema.mysqlTemplateReviews)
        .set({ rating, review: review ?? null })
        .where(eq(mysqlSchema.mysqlTemplateReviews.id, existing[0].id));

      const stats = await mysqlDb
        .select({
          avg: sql<number>`cast(avg(${mysqlSchema.mysqlTemplateReviews.rating}) as unsigned)`,
          count: sql<number>`cast(count(*) as unsigned)`,
        })
        .from(mysqlSchema.mysqlTemplateReviews)
        .where(eq(mysqlSchema.mysqlTemplateReviews.templateId, templateId));

      await mysqlDb
        .update(mysqlSchema.mysqlTemplates)
        .set({ avgRating: stats[0]?.avg ?? 0, ratingCount: stats[0]?.count ?? 0 })
        .where(eq(mysqlSchema.mysqlTemplates.id, templateId));
    } else {
      await mysqlDb.insert(mysqlSchema.mysqlTemplateReviews).values({
        id,
        templateId,
        userId,
        rating,
        review: review ?? null,
      });

      const stats = await mysqlDb
        .select({
          avg: sql<number>`cast(avg(${mysqlSchema.mysqlTemplateReviews.rating}) as unsigned)`,
          count: sql<number>`cast(count(*) as unsigned)`,
        })
        .from(mysqlSchema.mysqlTemplateReviews)
        .where(eq(mysqlSchema.mysqlTemplateReviews.templateId, templateId));

      await mysqlDb
        .update(mysqlSchema.mysqlTemplates)
        .set({ avgRating: stats[0]?.avg ?? 0, ratingCount: stats[0]?.count ?? 0 })
        .where(eq(mysqlSchema.mysqlTemplates.id, templateId));
    }
  },

  async listTemplateCategories() {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    return await mysqlDb
      .select()
      .from(mysqlSchema.mysqlTemplateCategories)
      .orderBy(mysqlSchema.mysqlTemplateCategories.sortOrder);
  },

  // ─── Credits ─────────────────────────────────────────────────────────────────

  async getUserCredits(userId: string) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const rows = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlUserCredits)
      .where(eq(mysqlSchema.mysqlUserCredits.userId, userId))
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
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const existing = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlUserCredits)
      .where(eq(mysqlSchema.mysqlUserCredits.userId, userId))
      .limit(1);

    if (existing.length === 0) {
      await mysqlDb.insert(mysqlSchema.mysqlUserCredits).values({
        userId,
        balance: amount,
        lifetimeEarned: amount,
        lifetimeSpent: 0,
        updatedAt: new Date(),
      });
    } else {
      await mysqlDb
        .update(mysqlSchema.mysqlUserCredits)
        .set({
          balance: sql`${mysqlSchema.mysqlUserCredits.balance} + ${amount}`,
          lifetimeEarned: sql`${mysqlSchema.mysqlUserCredits.lifetimeEarned} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(mysqlSchema.mysqlUserCredits.userId, userId));
    }

    await mysqlDb.insert(mysqlSchema.mysqlCreditTransactions).values({
      id: crypto.randomUUID(),
      userId,
      amount,
      type,
      description: description ?? null,
      executionId: executionId ?? null,
      createdAt: new Date(),
    });
  },

  async reserveCredits(userId: string, amount: number): Promise<boolean> {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const s = mysqlSchema;
    const result = await mysqlDb
      .update(s.mysqlUserCredits)
      .set({
        balance: sql`${s.mysqlUserCredits.balance} - ${amount}`,
        lifetimeSpent: sql`${s.mysqlUserCredits.lifetimeSpent} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(eq(s.mysqlUserCredits.userId, userId), sql`${s.mysqlUserCredits.balance} >= ${amount}`),
      );
    const r = result as any;
    return (r.affectedRows ?? r.meta?.affectedRows ?? 0) > 0;
  },

  async deductCredits(userId: string, amount: number, description?: string, executionId?: string) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    await mysqlDb
      .update(mysqlSchema.mysqlUserCredits)
      .set({
        balance: sql`${mysqlSchema.mysqlUserCredits.balance} - ${amount}`,
        lifetimeSpent: sql`${mysqlSchema.mysqlUserCredits.lifetimeSpent} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(mysqlSchema.mysqlUserCredits.userId, userId));

    await mysqlDb.insert(mysqlSchema.mysqlCreditTransactions).values({
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
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const rows = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlCreditTransactions)
      .where(eq(mysqlSchema.mysqlCreditTransactions.userId, userId))
      .orderBy(desc(mysqlSchema.mysqlCreditTransactions.createdAt))
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
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const rows = await mysqlDb
      .select({ count: sql<number>`cast(count(*) as signed)` })
      .from(mysqlSchema.mysqlWorkflows)
      .where(eq(mysqlSchema.mysqlWorkflows.userId, userId));
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
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const now = new Date();

    const existing = await mysqlDb
      .select({
        id: mysqlSchema.mysqlWorkspaceEntries.id,
        round: mysqlSchema.mysqlWorkspaceEntries.round,
      })
      .from(mysqlSchema.mysqlWorkspaceEntries)
      .where(
        and(
          eq(mysqlSchema.mysqlWorkspaceEntries.executionId, executionId),
          eq(mysqlSchema.mysqlWorkspaceEntries.key, key),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const row = existing[0];
      if (expectedRound !== undefined && row.round !== expectedRound) {
        throw new Error('CONCURRENT_MODIFICATION');
      }
      await mysqlDb
        .update(mysqlSchema.mysqlWorkspaceEntries)
        .set({
          value,
          valueType,
          fileUrl: fileUrl || null,
          nodeId,
          round: row.round + 1,
          createdAt: now,
        })
        .where(eq(mysqlSchema.mysqlWorkspaceEntries.id, row.id));
      return row.id;
    }

    const id = crypto.randomUUID();
    await mysqlDb.insert(mysqlSchema.mysqlWorkspaceEntries).values({
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
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const rows = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlWorkspaceEntries)
      .where(
        and(
          eq(mysqlSchema.mysqlWorkspaceEntries.executionId, executionId),
          eq(mysqlSchema.mysqlWorkspaceEntries.key, key),
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
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    };
  },

  async listWorkspaceEntries(executionId: string, nodeId?: string, prefix?: string) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const conditions = [eq(mysqlSchema.mysqlWorkspaceEntries.executionId, executionId)];
    if (nodeId) {
      conditions.push(eq(mysqlSchema.mysqlWorkspaceEntries.nodeId, nodeId));
    }
    if (prefix) {
      conditions.push(sql`${mysqlSchema.mysqlWorkspaceEntries.key} LIKE ${prefix + '%'}`);
    }

    const rows = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlWorkspaceEntries)
      .where(and(...conditions))
      .orderBy(mysqlSchema.mysqlWorkspaceEntries.createdAt);

    return rows.map((r) => ({
      id: r.id,
      executionId: r.executionId ?? '',
      nodeId: r.nodeId,
      key: r.key,
      value: r.value,
      valueType: (r.valueType as any) ?? 'text',
      fileUrl: r.fileUrl ?? undefined,
      round: r.round,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  },

  async deleteWorkspaceEntry(id: string) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    await mysqlDb
      .delete(mysqlSchema.mysqlWorkspaceEntries)
      .where(eq(mysqlSchema.mysqlWorkspaceEntries.id, id));
  },

  async clearWorkspace(executionId: string) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    await mysqlDb
      .delete(mysqlSchema.mysqlWorkspaceEntries)
      .where(eq(mysqlSchema.mysqlWorkspaceEntries.executionId, executionId));
  },

  // ─── Execution Messages (DataBus) ─────────────────────────────────────────

  async writeExecutionMessage(data) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    await mysqlDb.insert(mysqlSchema.mysqlExecutionMessages).values({
      id: data.id,
      executionId: data.executionId,
      topic: data.topic,
      sourceNodeId: data.sourceNodeId,
      messageType: data.messageType,
      payload: data.payload as any,
      contentType: data.contentType ?? null,
      round: data.round,
      createdAt: new Date(data.createdAt),
    });
  },

  async listExecutionMessages(executionId: string, topic?: string) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    const conditions = [eq(mysqlSchema.mysqlExecutionMessages.executionId, executionId)];
    if (topic) {
      conditions.push(eq(mysqlSchema.mysqlExecutionMessages.topic, topic));
    }
    const rows = await mysqlDb
      .select()
      .from(mysqlSchema.mysqlExecutionMessages)
      .where(and(...conditions))
      .orderBy(mysqlSchema.mysqlExecutionMessages.createdAt);
    return rows.map((r) => ({
      id: r.id,
      executionId: r.executionId ?? '',
      topic: r.topic,
      sourceNodeId: r.sourceNodeId,
      messageType: r.messageType,
      payload: r.payload,
      contentType: r.contentType ?? null,
      round: r.round,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  },

  async clearExecutionMessages(executionId: string) {
    const { db } = getConnection();
    const mysqlDb = db as MySql2Database<typeof mysqlSchema>;
    await mysqlDb
      .delete(mysqlSchema.mysqlExecutionMessages)
      .where(eq(mysqlSchema.mysqlExecutionMessages.executionId, executionId));
  },
};
