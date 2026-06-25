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

      <h2>High-Level Overview</h2>
      <pre>
        <code>{`┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Site        │     │  App         │     │  API Server   │
│  (site)      │────►│  (app)       │────►│  (api)        │
│  Vite+React  │     │  ReactFlow   │     │  Hono.js      │
└─────────────┘     │  Zustand      │     │  Drizzle ORM  │
                    │  React Router │     │  Vercel AI SDK│
                    └──────────────┘     └──────┬───────┘
                                               │
                    ┌──────────────────────────┼──────────┐
                    │                          │          │
               ┌────▼────┐            ┌────────▼───┐ ┌────▼────┐
               │ Database │            │ MCP Client │ │ Engine  │
               │ SQLite/  │            │ @model-    │ │ Kahn's  │
               │ Postgres │            │ context-   │ │ Algo    │
               └─────────┘            │ protocol   │ │ + Batch │
                                       └────────────┘ └─────────┘`}</code>
      </pre>

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
            <td>Drizzle ORM with triple-dialect support (SQLite, PostgreSQL, MySQL).</td>
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
              <code>packages/cli</code>
            </td>
            <td>
              Self-hosted CLI. Bundles API + Web for <code>qwenweaver start</code>.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Execution Engine</h2>
      <p>
        The engine (<code>apps/api/src/engine/</code>) is the core of {SITE.name}:
      </p>
      <ol>
        <li>
          <strong>dag-compiler.ts</strong> — Kahn's Algorithm: detects cycles, computes topological
          order, groups nodes into parallel batches
        </li>
        <li>
          <strong>agent-runner.ts</strong> — Executes a single node via Vercel AI SDK{' '}
          <code>streamText</code>, handles tool calls, captures token usage
        </li>
        <li>
          <strong>executor.ts</strong> — Main loop: iterates batches, handles supervisor
          backtracking with negotiation rounds
        </li>
        <li>
          <strong>model-router.ts</strong> — Maps node types to default models, lazily initializes
          Alibaba provider
        </li>
        <li>
          <strong>mcp-bridge.ts</strong> — Manages MCP client pool, tool discovery, and tool
          execution
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
  1. compileDag() — topological sort
  2. For each batch (Promise.all):
     a. runAgent() — streamText via Vercel AI SDK
     b. Stream token/status/edge events via SSE
     c. If supervisor rejects → backtrack with feedback
  3. Save logs, update execution record
  4. Emit "complete" event with metrics`}</code>
      </pre>

      <h2>Database Strategy</h2>
      <p>
        Dual-dialect schemas in <code>packages/database/src/schema/</code>:
      </p>
      <ul>
        <li>
          <strong>SQLite</strong> — local dev, self-hosted (zero config)
        </li>
        <li>
          <strong>PostgreSQL</strong> — cloud production (UUID PKs, JSONB, timestamps)
        </li>
        <li>
          <strong>MySQL</strong> — alternative production dialect
        </li>
      </ul>
      <p>
        The connection factory auto-detects the dialect from <code>DATABASE_URL</code>. Queries use
        a provider pattern: <code>getQueryProvider()</code> returns the correct dialect-specific
        implementation.
      </p>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link to="/docs/getting-started">Get started with the cloud version</Link>
        </li>
        <li>
          <Link to="/docs/self-hosted">Deploy your own instance</Link>
        </li>
        <li>
          <Link to="/docs/api">Browse the API</Link>
        </li>
      </ul>
    </div>
  );
}
