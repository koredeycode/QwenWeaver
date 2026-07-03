# QwenWeaver

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript" alt="TypeScript 5.5" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Hono-4.5-E36002?logo=hono" alt="Hono 4.5" />
  <img src="https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm" alt="pnpm 10" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" />
</p>

<p align="center">
  <strong>Visual multi-agent orchestration platform</strong><br />
  <em>Build, connect, and run AI agent workflows — visually.</em>
</p>

## Overview

QwenWeaver is a TypeScript-native platform for designing and executing multi-agent AI workflows. Arrange agents as a directed acyclic graph (DAG) on a visual canvas, connect them with edges to define data flow, and execute the entire pipeline with automatic parallelization, real-time SSE streaming, and intelligent conflict resolution.

Built for the Qwen Cloud Hackathon Track 3 ("Agent Society").

## Features

- **Visual DAG Canvas** — drag-and-drop workflow editor powered by React Flow v12. Pan, zoom, connect nodes, and inspect outputs in real time.
- **Parallel Execution Engine** — Kahn's Algorithm compiles the DAG into topological batches. Zero-in-degree nodes within each batch run concurrently via `Promise.all`, maximizing throughput.
- **Real-Time SSE Streaming** — every execution streams `token`, `thinking`, `status_update`, `edge_active`, `workspace_write`, `bus_message`, `debate_round`, and `complete` events to the canvas. Nodes glow, edges animate, and output appears token-by-token.
- **Supervisor Nodes** — quality gate agents that review outputs and can reject them with revision feedback. Supports multi-round backtracking with configurable negotiation limits.
- **Debate Arena Nodes** — multi-agent debate with configurable modes (debate, negotiation, consensus). Supports multiple rounds, optional AI arbitrator with scoring.
- **Conversation-Mode Edges** — enable multi-round back-and-forth exchanges between agents on connected edges, simulating natural conversation.
- **Shared Workspace Blackboard** — agents can read/write/append to a shared key-value workspace with optimistic concurrency control, enabling collaborative data sharing.
- **Inter-Agent Message Bus** — topic-based pub/sub DataBus for structured communication between agents. Messages are persisted to DB for audit trails.
- **MCP Tool Integration** — connect any Model Context Protocol server (HTTP Streamable or Stdio) as a node. Tools are automatically discovered and injected into agent prompts.
- **AI Media Generation** — built-in support for image generation (Wanx), audio synthesis (CosyVoice), and video generation (Wanx Video) via Qwen DashScope API.
- **Multi-Output Formats** — agents can output markdown, HTML, JSON, CSV, XML, YAML, plain text, images, audio, or video.
- **AI Copilot** — natural-language workflow builder embedded in the canvas. Describe what you want and the copilot generates or modifies the graph.
- **Dual-Database** — SQLite (better-sqlite3) for local development, PostgreSQL for production. Schema managed via Drizzle ORM with additive-only migrations.
- **Granular Metrics** — per-node timing, token counts, parallel speedup ratio, and efficiency metrics reported after every execution.
- **Template Library** — community workflow templates with fork support. Publish and discover reusable workflows.
- **Prometheus Metrics** — `/api/metrics` endpoint exposes execution counts, LLM token usage, agent durations, and rate limiting stats.

## Architecture

```
qwenweaver/
├── apps/
│   ├── app/          React 19 + Vite + React Flow v12 + Zustand + Tailwind
│   ├── site/         Marketing site — Vite + React + Tailwind v4
│   └── api/          Hono.js backend — SSE streaming, DAG execution, MCP tools
├── packages/
│   ├── types/        Shared Zod schemas & TypeScript interfaces
│   ├── database/     Drizzle ORM — dual dialect (SQLite / PostgreSQL)
│   └── mcp-client/   Model Context Protocol transport (HTTP & Stdio)
```

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development servers (app + site + api concurrently)
pnpm dev

# App:  http://localhost:5173
# Site: http://localhost:5174
# API:  http://localhost:3001
# Docs: http://localhost:3001/api/docs
```

## Available Commands

| Action              | Command          |
| ------------------- | ---------------- |
| Start dev servers   | `pnpm dev`       |
| Build all packages  | `pnpm build`     |
| Run tests           | `pnpm test`      |
| Lint                | `pnpm lint`      |
| Type-check          | `pnpm typecheck` |
| DB migrations (dev) | `pnpm db:push`   |

## Tech Stack

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| **Frontend** | React 19, Vite 8, React Flow v12, Zustand, Tailwind v4, shadcn/ui |
| **Backend**  | Hono.js 4, `@hono/node-server`, SSE streaming                     |
| **Database** | Drizzle ORM, better-sqlite3 (dev) / postgres (prod)               |
| **AI**       | `@ai-sdk/alibaba` — Qwen3-Max / Qwen3-Plus on DashScope           |
| **MCP**      | `@modelcontextprotocol/sdk` — HTTP & Stdio transports             |
| **Auth**     | Better Auth — JWT sessions, email/password, OAuth                 |

## License

[MIT](LICENSE)
