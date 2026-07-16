import { Link } from 'react-router-dom';
import { SITE } from '../../config.js';

export function Architecture() {
  return (
    <div>
      <h1>Architecture</h1>
      <p>
        {SITE.name} is a TypeScript-native monorepo built with pnpm workspaces. Here's how the
        pieces fit together.
      </p>

      <h2>Workspace Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>apps/site</code>
            </td>
            <td>Marketing site. Vite + React + Tailwind. Deployed to root domain.</td>
          </tr>
          <tr>
            <td>
              <code>apps/app</code>
            </td>
            <td>Main application SPA. React Flow canvas, Zustand state, Tailwind UI.</td>
          </tr>
          <tr>
            <td>
              <code>apps/api</code>
            </td>
            <td>Hono.js backend. Routes, engine, auth, SSE streaming, MCP bridging.</td>
          </tr>
          <tr>
            <td>
              <code>packages/database</code>
            </td>
            <td>Drizzle ORM with dual-dialect support (SQLite for dev, PostgreSQL for prod).</td>
          </tr>
          <tr>
            <td>
              <code>packages/types</code>
            </td>
            <td>Shared Zod schemas + TypeScript interfaces for nodes, edges, execution.</td>
          </tr>
          <tr>
            <td>
              <code>packages/mcp-client</code>
            </td>
            <td>MCP transport layer — HTTP Streamable and Stdio clients.</td>
          </tr>
          <tr>
            <td>
              <code>packages/encryption</code>
            </td>
            <td>AES-256-GCM credential encryption (API keys, tokens, auth secrets).</td>
          </tr>
        </tbody>
      </table>

      <h2>Execution Engine</h2>
      <p>
        The core of {SITE.name} lives in <code>apps/api/src/engine/</code>:
      </p>
      <ol>
        <li>
          <strong>dag-compiler.ts</strong> — Kahn's Algorithm: detects cycles, computes topological
          order, groups nodes into parallel batches
        </li>
        <li>
          <strong>agent-runner.ts</strong> — Executes a single node via Vercel AI SDK{' '}
          <code>streamText</code>, handles tool calls (MCP + workspace), captures token usage,
          supports media generation (image, audio, video)
        </li>
        <li>
          <strong>executor.ts</strong> — Main loop: iterates batches, handles supervisor
          backtracking with negotiation rounds, runs conversation exchanges on conversation-mode
          edges
        </li>
        <li>
          <strong>debate-runner.ts</strong> — Multi-agent debate arena with configurable modes
          (debate, negotiation, consensus) and optional AI arbitrator
        </li>
        <li>
          <strong>message-bus.ts</strong> — Topic-based DataBus for inter-agent communication.
          Supports output topics and conversation-mode channels
        </li>
        <li>
          <strong>model-router.ts</strong> — Maps node types to default models, lazily initializes
          Alibaba provider (DashScope)
        </li>
        <li>
          <strong>mcp-bridge.ts</strong> — Manages MCP client pool, tool discovery, and tool
          execution
        </li>
        <li>
          <strong>workspace-tools.ts</strong> — Injects workspace blackboard tools (read, write,
          append, list) with optimistic concurrency
        </li>
        <li>
          <strong>prompt-builder.ts</strong> — Assembles system prompts and user messages from
          DataBus context
        </li>
        <li>
          <strong>credential-resolver.ts</strong> — Resolves encrypted credentials from the database
          for MCP auth and DashScope API keys
        </li>
      </ol>

      <h2>Data Flow</h2>
      <pre>
        <code>{`User clicks "Run"
  │
  ▼
Frontend sends DAG JSON → POST /api/workflow/execute
  │
  ▼
API creates execution record in DB, returns executionId
  │
  ▼
Frontend opens GET /api/workflow/{id}/stream (SSE)
  │
  ▼
Engine:
  1. compileDag() — topological sort, detect cycles
  2. Clear workspace blackboard and execution messages
  3. For each batch (Promise.all):
     a. runAgent() — streamText via Vercel AI SDK
        - MCP tool discovery + injection
        - Workspace tool injection
        - Token/thinking streaming via SSE
     b. Edge activation events emitted
     c. If supervisor rejects → backtrack with feedback
     d. Conversation exchange on conversation-mode edges
  4. Save logs, update execution record
  5. Emit "complete" event with metrics`}</code>
      </pre>

      <h2>Database Strategy</h2>
      <p>
        Dual-dialect schemas in <code>packages/database/src/schema/</code>:
      </p>
      <ul>
        <li>
          <strong>SQLite</strong> — local dev (zero config, better-sqlite3)
        </li>
        <li>
          <strong>PostgreSQL</strong> — cloud production (UUID PKs, JSONB, timestamps)
        </li>
      </ul>
      <p>
        The connection factory auto-detects the dialect from <code>DATABASE_URL</code>. Queries use
        a provider pattern: <code>getQueryProvider()</code> returns the correct dialect-specific
        implementation. All migrations are additive-only.
      </p>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link to="/docs/getting-started">Get started with the cloud version</Link>
        </li>
        <li>
          <Link to="/docs/api">Browse the API</Link>
        </li>
      </ul>
    </div>
  );
}
