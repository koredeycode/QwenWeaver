# QwenWeaver

You are an AI coding assistant working on **QwenWeaver**, a TypeScript-native visual multi-agent orchestration platform built for the Qwen Cloud Hackathon Track 3 ("Agent Society"). This is a `pnpm` monorepo.

Before writing code or running commands, follow the rules and conventions below.

---

## 1. Commands

Use exact flags. Never `npm` or `yarn`.

| Action | Command |
|---|---|
| Install all dependencies | `pnpm install` |
| Start dev servers (all) | `pnpm dev` |
| Run tests (all) | `pnpm test` |
| Lint all packages | `pnpm lint` |
| Type-check workspace | `pnpm typecheck` (runs `build` in every workspace) |
| Execute one workspace | `pnpm --filter <name> <cmd>` |
| DB migrations (SQLite dev) | `pnpm db:push` |

Workspace names: `@qwenweaver/app`, `@qwenweaver/api`, `@qwenweaver/database`, `@qwenweaver/types`, `@qwenweaver/mcp-client`, `@qwenweaver/site`.

### Before committing

Run `pnpm lint && pnpm test` and fix any failures first.

### Commit style

Use conventional commits. Scope must match a workspace or package name. Examples:

```
feat(api): add SSE execution stream endpoint
fix(web): prevent crash on empty graph canvas
feat(database): add agent_logs table
chore: bump hono to 4.12
```

---

## 2. Project Structure

```
apps/app/          React 19 + Vite + @xyflow/react v12 + Zustand + Tailwind + shadcn/ui
  src/store/       Zustand atomic state slices
  src/components/  React Flow custom nodes & edges
  App.tsx          Main visual canvas

apps/site/          React 19 + Vite + Tailwind v4
  src/docs/         MDX documentation pages
  src/pages/        Marketing pages (home, pricing, self-hosted)

apps/api/          Hono.js edge-optimized backend
  src/engine/      Kahn's Algorithm DAG compiler, parallel execution
  src/routes/      API endpoints (SSE, execution, copilot)
  index.ts         Hono app entry point

packages/database/  Drizzle ORM — dual dialect (SQLite local, PostgreSQL cloud)
  src/schema/
    pg.ts          PostgreSQL schema
    sqlite.ts      SQLite schema
  index.ts         Dynamic connection factory

packages/types/    Shared Zod schemas + TypeScript interfaces
  src/graph.ts     Node/Edge payload schemas
  src/mcp.ts       MCP tool definitions

packages/mcp-client/  Model Context Protocol connection logic
  src/index.ts     HTTP & Stdio transport initialization
```

---

## 3. Architecture Rules

### Frontend (React Flow v12 + Zustand)

- **Memoize everything.** Wrap custom node/edge components in `React.memo`. Callbacks to `<ReactFlow />` must use `useCallback`. Config arrays must use `useMemo`.
- **Centralized state.** Never use local component state for graph elements. Use the Zustand store for all graph state.
- **Granular selectors.** Never access the full `nodes` array if you only need one value. Use `useStore((s) => s.selectedNodeIds)` to prevent re-renders.
- **shadcn/ui only.** Do not install Material-UI, Chakra, or any other UI library.

### Backend (Hono.js)

- **Structured responses.** Always `c.json()` or `c.text()`. Never use Express.js `res.send()`.
- **Validate payloads.** Every incoming request must be validated with `@hono/zod-validator`.
- **SSE streaming.** Use Hono's `streamSSE` helper. Always emit both `event` type and `data` payload. Custom events: `token`, `status_update`, `edge_active`, `complete`.
- **Parallel execution.** Group zero-in-degree nodes and fire with `Promise.all`.
- **Logging.** Use `pino` via `apps/api/src/logger.ts`. For file-scoped loggers, use `createModuleLogger('path/to/file')` to get a child logger with a `"module"` field in every JSON log line. Request logging is automatic via the `requestLogger()` middleware (includes method, path, status, duration, requestId).
- **API docs.** Swagger UI at `GET /api/docs`, OpenAPI spec at `GET /api/openapi.json`. Update the spec when adding new endpoints.

### Database (Drizzle ORM)

- **Dual schemas.** Maintain separate `schema/pg.ts` and `schema/sqlite.ts`. Never conflate them.
- **Connection factory.** Use the dynamic factory that switches between `better-sqlite3` (file path in `DATABASE_URL`) and `postgres` (URI).
- **Additive migrations only.** Never drop or rename columns.

### AI & MCP (Vercel AI SDK)

- **Alibaba provider.** Use `@ai-sdk/alibaba`. For Supervisor nodes, use `qwen3-max` with `enableThinking: true` and a `thinkingBudget` in `providerOptions`.
- **MCP tools.** Use `@modelcontextprotocol/sdk` via `createMCPClient()`. Inject discovered tools into agent prompts.

---

## 4. Execution Workflow

When the user clicks "Run Workflow":

1. Frontend sends DAG JSON to `POST /api/workflow/execute`
2. Backend runs Kahn's Algorithm — detects cycles, computes in-degree, pushes zero-in-degree nodes to parallel queue
3. Frontend opens `GET /api/workflow/:id/stream` (SSE via `streamSSE`)
4. Engine groups independent agents, executes concurrently with `Promise.all`
5. For MCP-connected agents, initialize `@modelcontextprotocol/sdk` client and inject tools into prompt
6. Backend streams `token`, `status_update`, `edge_active` events to SSE
7. Zustand store intercepts events, triggers node glow + edge animations on canvas
8. If conflicting outputs detected, Supervisor node (`qwen3-max` with thinking) resolves

---

## 5. Boundaries

- **Secrets.** Never hardcode API keys. Never commit `.env` files.
- **pnpm-lock.yaml.** Never edit manually. Only update via `pnpm add`.
- **External libs.** Only shadcn/ui + Tailwind for UI. No MUI, Chakra, etc.
- **DB.** Prefer additive DDL. Never drop/rename columns in migrations.
