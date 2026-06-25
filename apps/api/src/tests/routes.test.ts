import { describe, it, expect, vi } from 'vitest';
import app from '../index.js';

// Mock database for route tests
vi.mock('@qwenweaver/database', () => {
  const mockProvider = {
    createUser: vi.fn(),
    getUserByEmail: vi.fn().mockResolvedValue(null),
    getUserById: vi.fn().mockResolvedValue(null),
    saveMcpServer: vi.fn().mockResolvedValue({ id: 'test', name: 'test' }),
    getMcpServers: vi.fn().mockResolvedValue([]),
    deleteMcpServer: vi.fn().mockResolvedValue(false),
    saveWorkflow: vi.fn().mockResolvedValue('wf-1'),
    createExecution: vi.fn(),
    updateExecution: vi.fn(),
    saveAgentLog: vi.fn(),
    getExecution: vi.fn().mockResolvedValue(null),
    getAgentLogs: vi.fn().mockResolvedValue([]),
    getAnalyticsSummary: vi.fn().mockResolvedValue({
      totalRuns: 0, completedRuns: 0, failedRuns: 0,
      avgSpeedup: null, totalTokens: 0, avgLatencyMs: null,
      runsByModel: {}, recentRuns: [],
    }),
    healthCheck: vi.fn(),
  };

  return {
    getConnection: vi.fn().mockReturnValue({ db: {}, dialect: 'sqlite' }),
    getQueryProvider: vi.fn().mockReturnValue(mockProvider),
    getExecution: vi.fn(),
    getAgentLogs: vi.fn(),
    sqliteSchema: {},
    pgSchema: {},
    mysqlSchema: {},
  };
});

describe('route-level integration tests', () => {
  // ─── Health ─────────────────────────────────────────────────────────────
  describe('GET /api/health', () => {
    it('returns 200 when database is healthy', async () => {
      const res = await app.request('/api/health');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
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

  // ─── Auth ───────────────────────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('returns 400 on invalid input', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', password: '12' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when body is empty', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 401 for non-existent user', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@test.com', password: 'password123' }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 400 on invalid input', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bad', password: '' }),
      });
      expect(res.status).toBe(400);
    });
  });

  // ─── Protected routes without auth ────────────────────────────────────
  describe('Protected routes without auth', () => {
    it('GET /api/workflow/:id returns 401 without JWT', async () => {
      const res = await app.request('/api/workflow/fake-id');
      expect(res.status).toBe(401);
    });

    it('POST /api/copilot returns 401 without JWT', async () => {
      const res = await app.request('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'hello' }),
      });
      expect(res.status).toBe(401);
    });

    it('GET /api/analytics returns 401 without JWT', async () => {
      const res = await app.request('/api/analytics');
      expect(res.status).toBe(401);
    });

    it('GET /api/mcp/servers returns 401 without JWT', async () => {
      const res = await app.request('/api/mcp/servers');
      expect(res.status).toBe(401);
    });
  });

  // ─── Metrics ──────────────────────────────────────────────────────────
  describe('GET /api/metrics', () => {
    it('returns metrics (no METRICS_TOKEN configured)', async () => {
      const res = await app.request('/api/metrics');
      // Should succeed since METRICS_TOKEN is not set in test env
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('http_request_duration_ms');
    });
  });

  // ─── OpenAPI (removed — now returns 404) ──────────────────────────────
  describe('GET /api/openapi.json', () => {
    it('returns 404 — OpenAPI spec endpoint removed', async () => {
      const res = await app.request('/api/openapi.json');
      expect(res.status).toBe(404);
    });
  });

  // ─── Body limit ───────────────────────────────────────────────────────
  describe('POST /api/auth/register with oversized body', () => {
    it('returns 413 for payload exceeding 5MB', async () => {
      const largeBody = JSON.stringify({ email: 'a'.repeat(6 * 1024 * 1024) });
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: largeBody,
      });
      expect(res.status).toBe(413);
    });
  });
});
