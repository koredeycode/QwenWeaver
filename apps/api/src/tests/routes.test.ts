import { describe, it, expect, vi, beforeAll, afterEach, beforeEach } from 'vitest';
import app from '../index.js';
import { auth as mockAuthModule } from '../auth.js';

// ─── Auth helpers ──────────────────────────────────────────────────────────

const { USER_ID, USER_EMAIL, USER_NAME } = vi.hoisted(() => {
  process.env.METRICS_TOKEN = 'test-token';
  return {
    USER_ID: 'test-user-123',
    USER_EMAIL: 'test@test.com',
    USER_NAME: 'Test User',
  };
});

// ─── Mock database ─────────────────────────────────────────────────────────

const mockProvider = vi.hoisted(() => ({}) as Record<string, ReturnType<typeof vi.fn>>);

vi.mock('@qwenweaver/database', () => {
  const mock = {
    createUser: vi.fn(),
    getUserByEmail: vi.fn().mockResolvedValue(null),
    getUserById: vi.fn(),
    saveMcpServer: vi.fn().mockResolvedValue({ id: 'mcp-1', name: 'test-server' }),
    getMcpServers: vi.fn().mockResolvedValue([]),
    deleteMcpServer: vi.fn().mockResolvedValue(false),
    updateMcpServerAuth: vi.fn().mockResolvedValue({ id: 'mcp-1', name: 'test-server' }),
    saveWorkflow: vi.fn().mockResolvedValue('wf-1'),
    updateWorkflow: vi.fn(),
    listUserWorkflows: vi.fn().mockResolvedValue([]),
    getWorkflow: vi.fn(),
    deleteWorkflow: vi.fn().mockResolvedValue(true),
    updateCopilotHistory: vi.fn(),
    createExecution: vi.fn(),
    updateExecution: vi.fn(),
    saveAgentLog: vi.fn(),
    getExecution: vi.fn().mockResolvedValue(null),
    getAgentLogs: vi.fn().mockResolvedValue([]),
    listUserExecutions: vi.fn().mockResolvedValue([]),
    getAnalyticsSummary: vi.fn().mockResolvedValue({
      totalRuns: 0,
      completedRuns: 0,
      failedRuns: 0,
      avgSpeedup: null,
      totalTokens: 0,
      avgLatencyMs: null,
      runsByModel: {},
      recentRuns: [],
    }),
    getUserCredits: vi
      .fn()
      .mockResolvedValue({ balance: 1000, lifetimeEarned: 1000, lifetimeSpent: 0 }),
    grantCredits: vi.fn(),
    deductCredits: vi.fn(),
    reserveCredits: vi.fn().mockResolvedValue(true),
    listCreditTransactions: vi.fn().mockResolvedValue([]),
    listCredentials: vi.fn().mockResolvedValue([]),
    getCredential: vi.fn(),
    createCredential: vi.fn().mockResolvedValue({ id: 'cred-1' }),
    updateCredential: vi.fn(),
    deleteCredential: vi.fn().mockResolvedValue(true),
    listTemplates: vi.fn().mockResolvedValue([]),
    countTemplates: vi.fn().mockResolvedValue(0),
    getTemplate: vi.fn(),
    getTemplateById: vi.fn(),
    createTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    incrementTemplateDownloads: vi.fn(),
    listTemplateReviews: vi.fn().mockResolvedValue([]),
    upsertTemplateReview: vi.fn(),
    listTemplateCategories: vi.fn().mockResolvedValue([]),
    healthCheck: vi.fn(),
    countUserWorkflows: vi.fn().mockResolvedValue(0),
  };

  Object.assign(mockProvider, mock);

  return {
    getConnection: vi.fn().mockReturnValue({ db: {}, dialect: 'sqlite' }),
    getQueryProvider: vi.fn().mockReturnValue(mock),
    sqliteSchema: { user: {}, session: {}, account: {}, verification: {} },
    pgSchema: {},
    mysqlSchema: {},
  };
});

// ─── Mock AI SDK for copilot ───────────────────────────────────────────────
vi.mock('ai', () => ({
  streamText: vi.fn(() => ({
    fullStream: (async function* () {
      yield { type: 'text-delta', textDelta: 'Hello' };
      yield { type: 'text-delta', textDelta: ' world' };
    })(),
  })),
  tool: vi.fn((def: any) => def),
}));

// ─── Mock Better Auth ──────────────────────────────────────────────────────
vi.mock('../auth.js', () => ({
  auth: {
    handler: vi.fn((req: Request) => {
      // Return 404 for non-Better-Auth paths so the request falls through to
      // app routes. The index.ts middleware checks for 404 and calls next().
      return new Response(null, { status: 404 });
    }),
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: USER_ID, email: USER_EMAIL, name: USER_NAME },
        session: {
          id: 'sess-1',
          userId: USER_ID,
          token: 'test-token',
          expiresAt: new Date(Date.now() + 3600000),
        },
      }),
    },
  },
}));

// Set env for tests
process.env.DASHSCOPE_API_KEY = 'test-key';
process.env.CREDENTIALS_ENCRYPTION_KEY = 'test-encryption-key-32bytes!';
process.env.BETTER_AUTH_SECRET = 'test-better-auth-secret';
process.env.BETTER_AUTH_URL = 'http://localhost:3001';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function authHeaders() {
  return { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' };
}

// ─── Test suites ───────────────────────────────────────────────────────────

describe('route-level integration tests', () => {
  // ─── Health ─────────────────────────────────────────────────────────────
  describe('GET /api/health', () => {
    it('returns 200 when database is healthy', async () => {
      const res = await app.request('/api/health');
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.status).toBe('ok');
      expect(body.service).toBe('qwenweaver-api');
      expect(body.database).toBe('connected');
    });
  });

  // ─── Root ───────────────────────────────────────────────────────────────
  describe('GET /', () => {
    it('returns root message', async () => {
      const res = await app.request('/');
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe('QwenWeaver API');
    });
  });

  // ─── Protected routes without auth ──────────────────────────────────────
  describe('Protected routes without auth', () => {
    beforeEach(() => {
      (mockAuthModule.api as any).getSession.mockResolvedValue(null as any);
    });

    afterEach(() => {
      (mockAuthModule.api as any).getSession.mockResolvedValue({
        user: { id: USER_ID, email: USER_EMAIL, name: USER_NAME },
        session: {
          id: 'sess-1',
          userId: USER_ID,
          token: 'test-token',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
    });

    it('GET /api/workflow/:id returns 401', async () => {
      const res = await app.request('/api/workflow/fake-id');
      expect(res.status).toBe(401);
    });

    it('POST /api/copilot returns 401', async () => {
      const res = await app.request('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'hello' }),
      });
      expect(res.status).toBe(401);
    });

    it('GET /api/analytics returns 401', async () => {
      const res = await app.request('/api/analytics');
      expect(res.status).toBe(401);
    });

    it('GET /api/mcp/servers returns 401', async () => {
      const res = await app.request('/api/mcp/servers');
      expect(res.status).toBe(401);
    });

    it('GET /api/execution returns 401', async () => {
      const res = await app.request('/api/execution');
      expect(res.status).toBe(401);
    });

    it('GET /api/credentials returns 401', async () => {
      const res = await app.request('/api/credentials');
      expect(res.status).toBe(401);
    });
  });

  // ─── Metrics ────────────────────────────────────────────────────────────
  describe('GET /api/metrics', () => {
    it('returns prometheus metrics', async () => {
      const res = await app.request('/api/metrics', { headers: authHeaders() });
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('http_request_duration_ms');
    });
  });

  // ─── Workflow routes ────────────────────────────────────────────────────
  describe('Workflow routes', () => {
    it('GET /api/workflow lists workflows', async () => {
      mockProvider.listUserWorkflows.mockResolvedValueOnce([
        {
          id: 'wf-1',
          name: 'Test WF',
          description: null,
          createdAt: Date.now(),
          nodeCounts: { agent: 2 },
        },
      ]);
      const res = await app.request('/api/workflow', { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.workflows).toHaveLength(1);
      expect(body.workflows[0].name).toBe('Test WF');
    });

    it('GET /api/workflow/detail/:id returns workflow', async () => {
      mockProvider.getWorkflow.mockResolvedValueOnce({
        id: 'wf-1',
        name: 'Detail WF',
        description: null,
        createdAt: Date.now(),
        nodesEdges: { name: 'Detail WF', nodes: [], edges: [] },
      });
      const res = await app.request('/api/workflow/detail/wf-1', { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.name).toBe('Detail WF');
    });

    it('GET /api/workflow/detail/:id returns 404 for missing', async () => {
      mockProvider.getWorkflow.mockResolvedValueOnce(null);
      const res = await app.request('/api/workflow/detail/missing', { headers: authHeaders() });
      expect(res.status).toBe(404);
    });

    it('POST /api/workflow saves a new workflow', async () => {
      mockProvider.saveWorkflow.mockResolvedValueOnce('new-wf-id');
      const payload = { name: 'New WF', nodes: [], edges: [] };
      const res = await app.request('/api/workflow', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.workflowId).toBe('new-wf-id');
    });

    it('POST /api/workflow returns 400 for invalid payload', async () => {
      const res = await app.request('/api/workflow', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('DELETE /api/workflow/detail/:id deletes workflow', async () => {
      mockProvider.deleteWorkflow.mockResolvedValueOnce(true);
      const res = await app.request('/api/workflow/detail/wf-1', {
        method: 'DELETE',
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
    });

    it('DELETE /api/workflow/detail/:id returns 404 for missing', async () => {
      mockProvider.deleteWorkflow.mockResolvedValueOnce(false);
      const res = await app.request('/api/workflow/detail/missing', {
        method: 'DELETE',
        headers: authHeaders(),
      });
      expect(res.status).toBe(404);
    });

    it('PUT /api/workflow/detail/:id updates workflow', async () => {
      mockProvider.getWorkflow.mockResolvedValueOnce({ id: 'wf-1', name: 'Old' });
      const payload = { name: 'Updated', nodes: [], edges: [] };
      const res = await app.request('/api/workflow/detail/wf-1', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(200);
      expect(mockProvider.updateWorkflow).toHaveBeenCalled();
    });

    it('PUT /api/workflow/detail/:id returns 404 for missing', async () => {
      mockProvider.getWorkflow.mockResolvedValueOnce(null);
      const res = await app.request('/api/workflow/detail/missing', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ name: 'Updated', nodes: [], edges: [] }),
      });
      expect(res.status).toBe(404);
    });

    it('GET /api/workflow/:executionId returns execution status', async () => {
      mockProvider.getExecution.mockResolvedValueOnce({
        id: 'exec-1',
        workflowId: 'wf-1',
        userId: USER_ID,
        status: 'completed',
        startedAt: new Date().toISOString(),
      });
      const res = await app.request('/api/workflow/exec-1', { headers: authHeaders() });
      expect(res.status).toBe(200);
    });

    it('GET /api/workflow/:executionId returns 404 for missing', async () => {
      mockProvider.getExecution.mockResolvedValueOnce(null);
      const res = await app.request('/api/workflow/exec-missing', { headers: authHeaders() });
      expect(res.status).toBe(404);
    });
  });

  // ─── Execution routes ───────────────────────────────────────────────────
  describe('Execution routes', () => {
    it('GET /api/execution lists executions', async () => {
      mockProvider.listUserExecutions.mockResolvedValueOnce([
        {
          id: 'exec-1',
          workflowId: 'wf-1',
          workflowName: 'Test',
          status: 'completed',
          startedAt: new Date().toISOString(),
        },
      ]);
      const res = await app.request('/api/execution', { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.executions).toHaveLength(1);
    });

    it('GET /api/execution/:id returns execution detail', async () => {
      mockProvider.getExecution.mockResolvedValueOnce({
        id: 'exec-1',
        workflowId: 'wf-1',
        userId: USER_ID,
        status: 'completed',
        startedAt: new Date().toISOString(),
      });
      const res = await app.request('/api/execution/exec-1', { headers: authHeaders() });
      expect(res.status).toBe(200);
    });

    it('GET /api/execution/:id returns 404 for wrong user', async () => {
      mockProvider.getExecution.mockResolvedValueOnce({
        id: 'exec-1',
        workflowId: 'wf-1',
        userId: 'other-user',
        status: 'completed',
        startedAt: new Date().toISOString(),
      });
      const res = await app.request('/api/execution/exec-1', { headers: authHeaders() });
      expect(res.status).toBe(404);
    });

    it('GET /api/execution/:id/logs returns agent logs', async () => {
      mockProvider.getExecution.mockResolvedValueOnce({
        id: 'exec-1',
        workflowId: 'wf-1',
        userId: USER_ID,
        status: 'completed',
        startedAt: new Date().toISOString(),
      });
      mockProvider.getAgentLogs.mockResolvedValueOnce([
        {
          id: 'log-1',
          executionId: 'exec-1',
          nodeId: 'A',
          status: 'completed',
          startedAt: new Date().toISOString(),
        },
      ]);
      const res = await app.request('/api/execution/exec-1/logs', { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.logs).toHaveLength(1);
    });
  });

  // ─── MCP routes ─────────────────────────────────────────────────────────
  describe('MCP routes', () => {
    it('GET /api/mcp/servers lists servers', async () => {
      mockProvider.getMcpServers.mockResolvedValueOnce([
        { id: 'mcp-1', name: 'My Server', transport: 'http', url: 'http://localhost:3000' },
      ]);
      const res = await app.request('/api/mcp/servers', { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.servers).toHaveLength(1);
      expect(body.count).toBe(1);
    });

    it('POST /api/mcp/servers saves a server', async () => {
      mockProvider.saveMcpServer.mockResolvedValueOnce({ id: 'mcp-1', name: 'New Server' });
      const res = await app.request('/api/mcp/servers', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: 'New Server',
          transport: 'http',
          url: 'http://localhost:3000',
        }),
      });
      expect(res.status).toBe(201);
    });

    it('POST /api/mcp/servers returns 400 for invalid body', async () => {
      const res = await app.request('/api/mcp/servers', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('DELETE /api/mcp/servers/:id deletes server', async () => {
      mockProvider.deleteMcpServer.mockResolvedValueOnce(true);
      const res = await app.request('/api/mcp/servers/mcp-1', {
        method: 'DELETE',
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
    });

    it('DELETE /api/mcp/servers/:id returns 404 for missing', async () => {
      mockProvider.deleteMcpServer.mockResolvedValueOnce(false);
      const res = await app.request('/api/mcp/servers/missing', {
        method: 'DELETE',
        headers: authHeaders(),
      });
      expect(res.status).toBe(404);
    });

    it('POST /api/mcp/servers/:id/auth updates server auth', async () => {
      mockProvider.updateMcpServerAuth.mockResolvedValueOnce({ id: 'mcp-1', name: 'Test' });
      const res = await app.request('/api/mcp/servers/mcp-1/auth', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ authConfig: { type: 'bearer', token: 'abc' } }),
      });
      expect(res.status).toBe(200);
    });

    it('GET /api/mcp/registry/search returns search results', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ servers: [], metadata: {} }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );
      const res = await app.request('/api/mcp/registry/search?q=test', {
        headers: { Authorization: `Bearer test-token` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.servers).toEqual([]);
    });
  });

  // ─── Analytics routes ───────────────────────────────────────────────────
  describe('Analytics routes', () => {
    it('GET /api/analytics returns summary', async () => {
      const res = await app.request('/api/analytics', { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.totalRuns).toBe(0);
    });
  });

  // ─── Credits routes ─────────────────────────────────────────────────────
  describe('Credits routes', () => {
    it('GET /api/credits returns user credits', async () => {
      mockProvider.getUserCredits.mockResolvedValueOnce({
        balance: 500,
        lifetimeEarned: 1000,
        lifetimeSpent: 500,
      });
      const res = await app.request('/api/credits', { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.balance).toBe(500);
      expect(body.lowBalance).toBe(false);
    });

    it('GET /api/credits shows lowBalance warning', async () => {
      mockProvider.getUserCredits.mockResolvedValueOnce({
        balance: 50,
        lifetimeEarned: 1000,
        lifetimeSpent: 950,
      });
      const res = await app.request('/api/credits', { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.balance).toBe(50);
      expect(body.lowBalance).toBe(true);
    });

    it('GET /api/credits/transactions lists transactions', async () => {
      mockProvider.listCreditTransactions.mockResolvedValueOnce([
        {
          id: 'tx-1',
          userId: USER_ID,
          amount: 100,
          type: 'signup_bonus',
          description: 'Welcome',
          executionId: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      const res = await app.request('/api/credits/transactions', { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.transactions).toHaveLength(1);
    });
  });

  // ─── Credentials routes ─────────────────────────────────────────────────
  describe('Credentials routes', () => {
    it('GET /api/credentials lists credentials', async () => {
      mockProvider.listCredentials.mockResolvedValueOnce([
        {
          id: 'cred-1',
          userId: USER_ID,
          name: 'My Key',
          type: 'api_key',
          description: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);
      const res = await app.request('/api/credentials', { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.credentials).toHaveLength(1);
    });

    it('POST /api/credentials creates credential', async () => {
      const res = await app.request('/api/credentials', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: 'My Key', type: 'dashscope_api_key', value: 'sk-123' }),
      });
      expect(res.status).toBe(201);
    });

    it('GET /api/credentials/:id returns credential', async () => {
      mockProvider.getCredential.mockResolvedValueOnce({
        id: 'cred-1',
        userId: USER_ID,
        name: 'My Key',
        type: 'api_key',
        value: 'sk-123',
        description: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const res = await app.request('/api/credentials/cred-1', { headers: authHeaders() });
      expect(res.status).toBe(200);
    });

    it('GET /api/credentials/:id returns 404 for missing', async () => {
      mockProvider.getCredential.mockResolvedValueOnce(null);
      const res = await app.request('/api/credentials/missing', { headers: authHeaders() });
      expect(res.status).toBe(404);
    });

    it('DELETE /api/credentials/:id deletes credential', async () => {
      mockProvider.deleteCredential.mockResolvedValueOnce(true);
      const res = await app.request('/api/credentials/cred-1', {
        method: 'DELETE',
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
    });

    it('DELETE /api/credentials/:id returns 404 for missing', async () => {
      mockProvider.deleteCredential.mockResolvedValueOnce(false);
      const res = await app.request('/api/credentials/missing', {
        method: 'DELETE',
        headers: authHeaders(),
      });
      expect(res.status).toBe(404);
    });
  });

  // ─── Template routes ────────────────────────────────────────────────────
  describe('Template routes', () => {
    it('GET /api/templates lists templates', async () => {
      mockProvider.listTemplates.mockResolvedValueOnce([
        {
          id: 'tpl-1',
          name: 'Research Agent',
          description: null,
          workflowData: { nodes: [], edges: [] },
          authorId: USER_ID,
          downloads: 10,
          avgRating: 4,
          ratingCount: 2,
          featured: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);
      mockProvider.countTemplates.mockResolvedValueOnce(1);
      mockProvider.getUserById.mockResolvedValueOnce({
        id: 'author-1',
        email: 'author@test.com',
        name: 'Author',
        createdAt: Date.now(),
      });
      const res = await app.request('/api/templates', { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.templates).toHaveLength(1);
      expect(body.total).toBe(1);
    });

    it('GET /api/templates/:id returns template', async () => {
      mockProvider.getTemplate.mockResolvedValueOnce({
        id: 'tpl-1',
        name: 'Test Template',
        workflowData: { nodes: [], edges: [] },
        authorId: 'author-1',
        downloads: 10,
        avgRating: 4,
        ratingCount: 2,
        featured: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      mockProvider.getUserById.mockResolvedValueOnce({
        id: 'author-1',
        email: 'author@test.com',
        name: 'Author',
        createdAt: Date.now(),
      });
      mockProvider.listTemplateCategories.mockResolvedValueOnce([]);
      const res = await app.request('/api/templates/tpl-1', { headers: authHeaders() });
      expect(res.status).toBe(200);
    });

    it('GET /api/templates/:id returns 404 for missing', async () => {
      mockProvider.getTemplate.mockResolvedValueOnce(null);
      const res = await app.request('/api/templates/missing', { headers: authHeaders() });
      expect(res.status).toBe(404);
    });

    it('GET /api/templates/categories lists categories', async () => {
      mockProvider.listTemplateCategories
        .mockReset()
        .mockResolvedValue([{ id: 'cat-1', name: 'Research', slug: 'research', sortOrder: 0 }]);
      const res = await app.request('/api/templates/categories', { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.categories).toHaveLength(1);
    });

    it('POST /api/templates creates template (auth required)', async () => {
      const payload = {
        name: 'New Template',
        workflowData: {
          name: 'test',
          nodes: [{ id: 'n1', type: 'agent', position: { x: 0, y: 0 }, data: {} }],
          edges: [],
        },
      };
      const res = await app.request('/api/templates', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(201);
    });

    it('POST /api/templates returns 400 for invalid payload', async () => {
      const res = await app.request('/api/templates', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('DELETE /api/templates/:id deletes template (auth required)', async () => {
      mockProvider.getTemplate.mockResolvedValueOnce({
        id: 'tpl-1',
        name: 'Test',
        workflowData: { nodes: [], edges: [] },
        authorId: USER_ID,
        downloads: 0,
        avgRating: 0,
        ratingCount: 0,
        featured: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const res = await app.request('/api/templates/tpl-1', {
        method: 'DELETE',
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
    });
  });

  // ─── Workflow execute ───────────────────────────────────────────────────
  describe('POST /api/workflow/execute', () => {
    it('returns 400 for invalid payload', async () => {
      const res = await app.request('/api/workflow/execute', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('starts execution and returns pending status', async () => {
      mockProvider.saveWorkflow.mockResolvedValueOnce('wf-new');
      const payload = {
        name: 'Execute Test',
        nodes: [{ id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      };
      const res = await app.request('/api/workflow/execute', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.status).toBe('pending');
      expect(body.executionId).toBeDefined();
      expect(body.workflowId).toBeDefined();
      expect(mockProvider.createExecution).toHaveBeenCalled();
    });
  });

  // ─── Workflow stream ────────────────────────────────────────────────────
  describe('GET /api/workflow/:executionId/stream', () => {
    it('returns 404 when execution does not exist', async () => {
      const res = await app.request('/api/workflow/missing/stream', {
        headers: { Authorization: `Bearer test-token` },
      });
      expect(res.status).toBe(404);
    });
  });
});
