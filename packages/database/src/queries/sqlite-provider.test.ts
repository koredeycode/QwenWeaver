import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createConnection, getConnection, sqliteSchema } from '../index.js';
import { sqliteProvider } from './sqlite-provider.js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { WorkflowPayload, CopilotHistoryMessage } from '@qwenweaver/types';
import * as fs from 'node:fs';
import * as path from 'node:path';
const TEST_DB_PATH = path.resolve('/tmp/qwenweaver-test.db');

let userId: string;
let workflowId: string;
let executionId: string;

function createTables() {
  const { db: rawDb } = getConnection();
  const db = rawDb as BetterSQLite3Database<any>;
  db.run(`CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL,
    image TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS "session" (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    expiresAt INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    ipAddress TEXT,
    userAgent TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS "account" (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt INTEGER,
    refreshTokenExpiresAt INTEGER,
    scope TEXT,
    password TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1 NOT NULL,
    nodes_edges TEXT,
    copilot_history TEXT,
    created_at INTEGER NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT REFERENCES workflows(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    metrics TEXT,
    started_at INTEGER NOT NULL,
    completed_at INTEGER
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS agent_logs (
    id TEXT PRIMARY KEY,
    execution_id TEXT REFERENCES executions(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    status TEXT NOT NULL,
    input TEXT,
    output TEXT,
    tokens_used INTEGER,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    error TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS mcp_servers (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    transport TEXT DEFAULT 'http' NOT NULL,
    url TEXT,
    command TEXT,
    args TEXT,
    auth_config TEXT,
    icon_url TEXT,
    registry_origin TEXT DEFAULT 'manual' NOT NULL,
    registry_id TEXT,
    registry_metadata TEXT,
    is_favorite INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS template_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    sort_order INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    workflow_data TEXT NOT NULL,
    category_id TEXT REFERENCES template_categories(id),
    tags TEXT,
    author_id TEXT NOT NULL REFERENCES "user"(id),
    thumbnail TEXT,
    downloads INTEGER DEFAULT 0 NOT NULL,
    avg_rating INTEGER DEFAULT 0 NOT NULL,
    rating_count INTEGER DEFAULT 0 NOT NULL,
    featured INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS template_reviews (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "user"(id),
    rating INTEGER NOT NULL,
    review TEXT,
    created_at INTEGER NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS user_credits (
    user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0 NOT NULL,
    lifetime_earned INTEGER DEFAULT 0 NOT NULL,
    lifetime_spent INTEGER DEFAULT 0 NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    encrypted_data TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    execution_id TEXT,
    created_at INTEGER NOT NULL
  )`);
}

beforeAll(() => {
  // Clean up any previous test DB
  for (const f of [TEST_DB_PATH, TEST_DB_PATH + '-wal', TEST_DB_PATH + '-shm']) {
    try {
      fs.unlinkSync(f);
    } catch {
      /* ok */
    }
  }

  createConnection(TEST_DB_PATH);
  createTables();
});

afterAll(() => {
  for (const f of [TEST_DB_PATH, TEST_DB_PATH + '-wal', TEST_DB_PATH + '-shm']) {
    try {
      fs.unlinkSync(f);
    } catch {
      /* ok */
    }
  }
});

function makeWorkflow(overrides?: Partial<WorkflowPayload>): WorkflowPayload {
  return {
    name: 'Test Workflow',
    description: 'A test workflow',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
      {
        id: 'n2',
        type: 'agent',
        position: { x: 200, y: 0 },
        data: { label: 'Process', model: 'qwen3.7-plus' },
      },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    ...overrides,
  };
}

describe('sqlite-provider', () => {
  beforeEach(async () => {
    // Clean all tables
    const { db } = getConnection();
    const sqliteDb = db as BetterSQLite3Database<any>;
    const s = sqliteSchema;
    sqliteDb.delete(s.sqliteAgentLogs).run();
    sqliteDb.delete(s.sqliteExecutions).run();
    sqliteDb.delete(s.sqliteCredentials).run();
    sqliteDb.delete(s.sqliteMcpServers).run();
    sqliteDb.delete(s.sqliteWorkflows).run();
    sqliteDb.delete(s.sqliteCreditTransactions).run();
    sqliteDb.delete(s.sqliteUserCredits).run();
    sqliteDb.delete(s.sqliteTemplateReviews).run();
    sqliteDb.delete(s.sqliteTemplates).run();
    sqliteDb.delete(s.sqliteTemplateCategories).run();
    sqliteDb.delete(s.user).run();

    // Create a test user
    userId = crypto.randomUUID();
    await sqliteProvider.createUser(userId, 'test@test.com', 'Test User');
  });

  // ─── User / Auth ──────────────────────────────────────────────────────────
  describe('users', () => {
    it('creates and retrieves a user by email', async () => {
      const user = await sqliteProvider.getUserByEmail('test@test.com');
      expect(user).not.toBeNull();
      expect(user!.email).toBe('test@test.com');
    });

    it('returns null for non-existent email', async () => {
      const user = await sqliteProvider.getUserByEmail('nobody@test.com');
      expect(user).toBeNull();
    });

    it('retrieves a user by id', async () => {
      const user = await sqliteProvider.getUserById(userId);
      expect(user).not.toBeNull();
      expect(user!.email).toBe('test@test.com');
    });

    it('returns null for non-existent id', async () => {
      const user = await sqliteProvider.getUserById('non-existent');
      expect(user).toBeNull();
    });
  });

  // ─── Workflows ────────────────────────────────────────────────────────────
  describe('workflows', () => {
    it('saves a workflow and returns its id', async () => {
      workflowId = await sqliteProvider.saveWorkflow(userId, makeWorkflow());
      expect(workflowId).toBeDefined();
    });

    it('lists user workflows with node counts', async () => {
      await sqliteProvider.saveWorkflow(userId, makeWorkflow({ name: 'WF 1' }));
      await new Promise((r) => setTimeout(r, 5));
      await sqliteProvider.saveWorkflow(userId, makeWorkflow({ name: 'WF 2' }));
      const workflows = await sqliteProvider.listUserWorkflows(userId);
      expect(workflows).toHaveLength(2);
      expect(workflows[0].name).toBe('WF 2'); // most recent first
      expect(workflows[0].nodeCounts).toEqual({ trigger: 1, agent: 1 });
    });

    it('retrieves a workflow by id', async () => {
      const wfId = await sqliteProvider.saveWorkflow(userId, makeWorkflow());
      const wf = await sqliteProvider.getWorkflow(wfId, userId);
      expect(wf).not.toBeNull();
      expect(wf!.name).toBe('Test Workflow');
    });

    it('returns null for non-existent workflow', async () => {
      const wf = await sqliteProvider.getWorkflow('non-existent', userId);
      expect(wf).toBeNull();
    });

    it('updates a workflow', async () => {
      const wfId = await sqliteProvider.saveWorkflow(userId, makeWorkflow());
      await sqliteProvider.updateWorkflow(wfId, userId, makeWorkflow({ name: 'Updated' }));
      const wf = await sqliteProvider.getWorkflow(wfId, userId);
      expect(wf!.name).toBe('Updated');
    });

    it('deletes a workflow', async () => {
      const wfId = await sqliteProvider.saveWorkflow(userId, makeWorkflow());
      const deleted = await sqliteProvider.deleteWorkflow(wfId, userId);
      expect(deleted).toBe(true);
      const wf = await sqliteProvider.getWorkflow(wfId, userId);
      expect(wf).toBeNull();
    });

    it('deleting a non-existent workflow returns false', async () => {
      const deleted = await sqliteProvider.deleteWorkflow('non-existent', userId);
      expect(deleted).toBe(false);
    });

    it('counts user workflows', async () => {
      await sqliteProvider.saveWorkflow(userId, makeWorkflow());
      await sqliteProvider.saveWorkflow(userId, makeWorkflow());
      const count = await sqliteProvider.countUserWorkflows(userId);
      expect(count).toBe(2);
    });

    it('updates copilot history', async () => {
      const wfId = await sqliteProvider.saveWorkflow(userId, makeWorkflow());
      const history: CopilotHistoryMessage[] = [
        { role: 'user', content: 'Create a research workflow' },
        {
          role: 'assistant',
          content: 'Here is the workflow',
          thinking: 'thinking...',
        },
      ];
      await sqliteProvider.updateCopilotHistory(wfId, userId, history);
      const wf = await sqliteProvider.getWorkflow(wfId, userId);
      expect(wf!.copilotHistory).toEqual(history);
    });
  });

  // ─── Executions ───────────────────────────────────────────────────────────
  describe('executions', () => {
    it('creates and retrieves an execution', async () => {
      const wfId = await sqliteProvider.saveWorkflow(userId, makeWorkflow());
      const execId = crypto.randomUUID();
      await sqliteProvider.createExecution(execId, wfId, userId);
      const exec = await sqliteProvider.getExecution(execId);
      expect(exec).not.toBeNull();
      expect(exec!.status).toBe('pending');
    });

    it('lists user executions', async () => {
      const wfId = await sqliteProvider.saveWorkflow(userId, makeWorkflow({ name: 'Exec WF' }));
      const eid = crypto.randomUUID();
      await sqliteProvider.createExecution(eid, wfId, userId);

      const executions = await sqliteProvider.listUserExecutions(userId);
      expect(executions).toHaveLength(1);
      expect(executions[0].workflowName).toBe('Exec WF');
    });

    it('updates execution status and metrics', async () => {
      const wfId = await sqliteProvider.saveWorkflow(userId, makeWorkflow());
      const execId = crypto.randomUUID();
      await sqliteProvider.createExecution(execId, wfId, userId);
      await sqliteProvider.updateExecution(execId, 'completed', {
        speedupS: 2.5,
        totalTokens: 500,
        totalLatencyMs: 200,
        parallelEfficiency: 1.5,
        nodeTimings: [],
      });
      const exec = await sqliteProvider.getExecution(execId);
      expect(exec!.status).toBe('completed');
      expect(exec!.metrics?.speedupS).toBe(2.5);
    });

    it('saves and retrieves agent logs', async () => {
      const wfId = await sqliteProvider.saveWorkflow(userId, makeWorkflow());
      const execId = crypto.randomUUID();
      await sqliteProvider.createExecution(execId, wfId, userId);
      await sqliteProvider.saveAgentLog(
        execId,
        'n2',
        'completed',
        { prompt: 'test', upstreamOutputs: {} },
        { text: 'output' },
        100,
      );

      const logs = await sqliteProvider.getAgentLogs(execId);
      expect(logs).toHaveLength(1);
      expect(logs[0].nodeId).toBe('n2');
      expect(logs[0].tokensUsed).toBe(100);
    });
  });

  // ─── MCP Servers ──────────────────────────────────────────────────────────
  describe('MCP servers', () => {
    it('saves and retrieves MCP servers', async () => {
      await sqliteProvider.saveMcpServer('mcp-1', userId, {
        name: 'My Server',
        transport: 'http',
        url: 'http://localhost:3000',
      });
      const servers = await sqliteProvider.getMcpServers(userId);
      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe('My Server');
    });

    it('only returns servers for the correct user', async () => {
      await sqliteProvider.saveMcpServer('mcp-1', userId, {
        name: 'Mine',
        transport: 'http',
        url: 'http://a:3000',
      });
      const otherServers = await sqliteProvider.getMcpServers('other-user');
      expect(otherServers).toHaveLength(0);
    });

    it('deletes a server', async () => {
      await sqliteProvider.saveMcpServer('mcp-1', userId, {
        name: 'To Delete',
        transport: 'http',
        url: 'http://a:3000',
      });
      const deleted = await sqliteProvider.deleteMcpServer('mcp-1', userId);
      expect(deleted).toBe(true);
      const servers = await sqliteProvider.getMcpServers(userId);
      expect(servers).toHaveLength(0);
    });

    it('delete returns false for non-owned servers', async () => {
      const deleted = await sqliteProvider.deleteMcpServer('non-existent', userId);
      expect(deleted).toBe(false);
    });

    it('updates server auth config', async () => {
      await sqliteProvider.saveMcpServer('mcp-1', userId, {
        name: 'Auth Test',
        transport: 'http',
        url: 'http://a:3000',
      });
      const updated = await sqliteProvider.updateMcpServerAuth('mcp-1', userId, {
        type: 'bearer',
        token: 'abc',
      });
      expect(updated.authConfig).toEqual({ type: 'bearer', token: 'abc' });
    });
  });

  // ─── Credentials ──────────────────────────────────────────────────────────
  describe('credentials', () => {
    it('creates and retrieves a credential', async () => {
      const created = await sqliteProvider.createCredential(userId, {
        name: 'My API Key',
        type: 'dashscope_api_key',
        value: 'sk-123456',
      });
      expect(created.value).toBe('sk-123456');

      const fetched = await sqliteProvider.getCredential(created.id, userId);
      expect(fetched).not.toBeNull();
      expect(fetched!.value).toBe('sk-123456');
    });

    it('lists credentials without exposing values', async () => {
      await sqliteProvider.createCredential(userId, {
        name: 'Key 1',
        type: 'dashscope_api_key',
        value: 'sk-111',
      });
      await sqliteProvider.createCredential(userId, {
        name: 'Key 2',
        type: 'custom',
        value: 'bt-222',
      });

      const list = await sqliteProvider.listCredentials(userId);
      expect(list).toHaveLength(2);
    });

    it('updates a credential', async () => {
      const created = await sqliteProvider.createCredential(userId, {
        name: 'Old Name',
        type: 'dashscope_api_key',
        value: 'sk-old',
      });
      const updated = await sqliteProvider.updateCredential(created.id, userId, {
        name: 'New Name',
      });
      expect(updated.name).toBe('New Name');
    });

    it('deletes a credential', async () => {
      const created = await sqliteProvider.createCredential(userId, {
        name: 'To Delete',
        type: 'dashscope_api_key',
        value: 'sk-del',
      });
      const deleted = await sqliteProvider.deleteCredential(created.id, userId);
      expect(deleted).toBe(true);
      const fetched = await sqliteProvider.getCredential(created.id, userId);
      expect(fetched).toBeNull();
    });

    it('returns null for non-owned credential', async () => {
      const fetched = await sqliteProvider.getCredential('non-existent', userId);
      expect(fetched).toBeNull();
    });

    it('delete returns false for non-existent credential', async () => {
      const deleted = await sqliteProvider.deleteCredential('non-existent', userId);
      expect(deleted).toBe(false);
    });
  });

  // ─── Credits ──────────────────────────────────────────────────────────────
  describe('credits', () => {
    it('returns zero balance for new user', async () => {
      const credits = await sqliteProvider.getUserCredits('new-user');
      expect(credits.balance).toBe(0);
      expect(credits.lifetimeEarned).toBe(0);
      expect(credits.lifetimeSpent).toBe(0);
    });

    it('grants credits and tracks lifetime earned', async () => {
      await sqliteProvider.grantCredits(userId, 500, 'signup_bonus', 'Welcome!');
      const credits = await sqliteProvider.getUserCredits(userId);
      expect(credits.balance).toBe(500);
      expect(credits.lifetimeEarned).toBe(500);
    });

    it('accumulates multiple grants', async () => {
      await sqliteProvider.grantCredits(userId, 200, 'bonus', 'First');
      await sqliteProvider.grantCredits(userId, 300, 'bonus', 'Second');
      const credits = await sqliteProvider.getUserCredits(userId);
      expect(credits.balance).toBe(500);
    });

    it('deducts credits and tracks lifetime spent', async () => {
      await sqliteProvider.grantCredits(userId, 1000, 'signup', 'Welcome');
      await sqliteProvider.deductCredits(userId, 300, 'Execution cost', 'exec-1');
      const credits = await sqliteProvider.getUserCredits(userId);
      expect(credits.balance).toBe(700);
      expect(credits.lifetimeSpent).toBe(300);
    });

    it('lists credit transactions in reverse chronological order', async () => {
      await sqliteProvider.grantCredits(userId, 1000, 'signup', 'Welcome');
      await new Promise((r) => setTimeout(r, 5));
      await sqliteProvider.deductCredits(userId, 100, 'Execution 1', 'exec-1');
      const txns = await sqliteProvider.listCreditTransactions(userId);
      expect(txns).toHaveLength(2);
      expect(txns[0].amount).toBe(-100); // most recent first
    });
  });

  // ─── Templates ────────────────────────────────────────────────────────────
  describe('templates', () => {
    let catId: string;

    beforeEach(() => {
      const { db } = getConnection();
      const sqliteDb = db as BetterSQLite3Database<any>;
      const s = sqliteSchema;
      catId = crypto.randomUUID();
      sqliteDb
        .insert(s.sqliteTemplateCategories)
        .values({
          id: catId,
          name: 'Research',
          slug: 'research',
          sortOrder: 0,
        })
        .run();
    });

    it('creates and retrieves a template', async () => {
      const tplId = crypto.randomUUID();
      const wf = makeWorkflow({ name: 'Research Template' });
      await sqliteProvider.createTemplate(tplId, {
        name: 'Research Template',
        workflowData: wf,
        authorId: userId,
        categoryId: catId,
      });
      const tpl = await sqliteProvider.getTemplate(tplId);
      expect(tpl).not.toBeNull();
      expect(tpl!.name).toBe('Research Template');
    });

    it('lists templates', async () => {
      await sqliteProvider.createTemplate(crypto.randomUUID(), {
        name: 'Tpl 1',
        workflowData: makeWorkflow(),
        authorId: userId,
      });
      await sqliteProvider.createTemplate(crypto.randomUUID(), {
        name: 'Tpl 2',
        workflowData: makeWorkflow(),
        authorId: userId,
      });
      const templates = await sqliteProvider.listTemplates();
      expect(templates).toHaveLength(2);
    });

    it('counts templates', async () => {
      await sqliteProvider.createTemplate(crypto.randomUUID(), {
        name: 'Tpl',
        workflowData: makeWorkflow(),
        authorId: userId,
      });
      const count = await sqliteProvider.countTemplates();
      expect(count).toBe(1);
    });

    it('filters templates by search', async () => {
      await sqliteProvider.createTemplate(crypto.randomUUID(), {
        name: 'Research Agent',
        workflowData: makeWorkflow(),
        authorId: userId,
      });
      await sqliteProvider.createTemplate(crypto.randomUUID(), {
        name: 'Blog Writer',
        workflowData: makeWorkflow(),
        authorId: userId,
      });
      const results = await sqliteProvider.listTemplates({ search: 'Research' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Research Agent');
    });

    it('deletes a template', async () => {
      const tplId = crypto.randomUUID();
      await sqliteProvider.createTemplate(tplId, {
        name: 'To Delete',
        workflowData: makeWorkflow(),
        authorId: userId,
      });
      await sqliteProvider.deleteTemplate(tplId);
      const tpl = await sqliteProvider.getTemplate(tplId);
      expect(tpl).toBeNull();
    });

    it('increments download count', async () => {
      const tplId = crypto.randomUUID();
      await sqliteProvider.createTemplate(tplId, {
        name: 'Download Test',
        workflowData: makeWorkflow(),
        authorId: userId,
      });
      await sqliteProvider.incrementTemplateDownloads(tplId);
      const tpl = await sqliteProvider.getTemplate(tplId);
      expect(tpl!.downloads).toBe(1);
    });

    it('creates and lists template reviews', async () => {
      const tplId = crypto.randomUUID();
      await sqliteProvider.createTemplate(tplId, {
        name: 'Review Test',
        workflowData: makeWorkflow(),
        authorId: userId,
      });
      await sqliteProvider.upsertTemplateReview(crypto.randomUUID(), tplId, userId, 5, 'Great!');
      const reviews = await sqliteProvider.listTemplateReviews(tplId);
      expect(reviews).toHaveLength(1);
      expect(reviews[0].rating).toBe(5);
    });

    it('upserts a review (update existing)', async () => {
      const tplId = crypto.randomUUID();
      await sqliteProvider.createTemplate(tplId, {
        name: 'Upsert Test',
        workflowData: makeWorkflow(),
        authorId: userId,
      });
      const reviewId = crypto.randomUUID();
      await sqliteProvider.upsertTemplateReview(reviewId, tplId, userId, 3, 'Okay');
      await sqliteProvider.upsertTemplateReview(crypto.randomUUID(), tplId, userId, 5, 'Amazing!');

      const reviews = await sqliteProvider.listTemplateReviews(tplId);
      expect(reviews).toHaveLength(1);
      expect(reviews[0].rating).toBe(5);
    });

    it('lists categories', async () => {
      const cats = await sqliteProvider.listTemplateCategories();
      expect(cats.length).toBeGreaterThanOrEqual(1);
      expect(cats[0].name).toBe('Research');
    });
  });

  // ─── Health check ─────────────────────────────────────────────────────────
  describe('health check', () => {
    it('passes health check', async () => {
      await expect(sqliteProvider.healthCheck()).resolves.toBeUndefined();
    });
  });

  // ─── Analytics ────────────────────────────────────────────────────────────
  describe('analytics', () => {
    it('returns empty analytics for user with no executions', async () => {
      const summary = await sqliteProvider.getAnalyticsSummary(userId);
      expect(summary.totalRuns).toBe(0);
      expect(summary.completedRuns).toBe(0);
    });

    it('returns analytics with execution data', async () => {
      const wfId = await sqliteProvider.saveWorkflow(userId, makeWorkflow());
      const execId = crypto.randomUUID();
      await sqliteProvider.createExecution(execId, wfId, userId);
      await sqliteProvider.updateExecution(execId, 'completed', {
        speedupS: 3,
        totalTokens: 1000,
        totalLatencyMs: 500,
        parallelEfficiency: 1.5,
        nodeTimings: [],
      });

      const summary = await sqliteProvider.getAnalyticsSummary(userId);
      expect(summary.totalRuns).toBe(1);
      expect(summary.completedRuns).toBe(1);
      expect(summary.totalTokens).toBe(1000);
    });
  });
});
