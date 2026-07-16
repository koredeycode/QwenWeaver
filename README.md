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

QwenWeaver is a TypeScript-native platform for designing, orchestrating, and executing multi-agent AI workflows. Built as a submission for the **Qwen Cloud Hackathon Track 3 ("Agent Society")**, QwenWeaver enables developers to visually arrange agents as directed acyclic graphs (DAGs) on a canvas, configure their communication channels, and run them with automatic topological parallelization, real-time streaming, and robust conflict resolution.

---

## 🤖 Track 3 "Agent Society" Features

### 1. Task Decomposition & Role Assignment

- **Visual DAG Canvas** — Pan, zoom, drag-and-drop workflow editor powered by React Flow v12. Orchestrate specialist agent roles and task dependencies visually.
- **AI Copilot** — Natural-language workflow builder embedded in the canvas. Describe a complex goal, and the Copilot automatically generates or modifies the graph layout (proposing node addition, deletion, or connection changes).

### 2. Disagreement & Conflict Resolution

- **Supervisor Nodes & Backtracking** — Review agents' outputs using a quality gate. If the Supervisor outputs a `[REJECT]` prefix with feedback, the execution engine dynamically wipes affected intermediate state from the bus and reruns the upstream agents with the new feedback context (supporting multi-round backtracking).
- **Debate Arena Nodes** — Let multiple agents debate, negotiate, or align via 3 distinct modes (`debate`, `negotiation`, `consensus`). Features an optional AI arbitrator (`qwen3.7-max` with reasoning/thinking enabled) that evaluates arguments, scores participants, and issues a final verdict.
- **Shared Workspace Blackboard** — Agents read/write/append to a shared key-value store using **optimistic concurrency control** with retry backoffs to prevent write conflicts.

### 3. Parallel Execution & Observability

- **Kahn's Algorithm Compiler** — Compiles the DAG into topological batches. Zero-in-degree nodes in each batch execute concurrently via `Promise.allSettled`, maximizing throughput.
- **Real-Time SSE Streaming** — Streams `token`, `thinking` (reasoning states), `status_update`, `edge_active`, `workspace_write`, and `debate_round` events. Nodes glow, and edges animate live.
- **Observability Summary Panel** — Visualizes Kahn scheduling execution as a Gantt chart, tracking total wall-clock time, LLM inference token volume, and **mathematical speedup/parallel efficiency** metrics.

For detailed formulas, performance numbers, and topology math, see [BENCHMARKS.md](./docs/BENCHMARKS.md).

### 4. Advanced Capabilities & Integrations

- **Conversation-Mode Edges** — Enable multi-round back-and-forth dialogue exchanges between two agents on a connected edge, simulating natural conversation.
- **MCP Tool Integration** — Connect any Model Context Protocol server (HTTP or Stdio). Tools are discovered on-the-fly and injected into the agent's prompt context.
- **DashScope Media Pipelines** — Native support for image generation (Wanx/Qwen Image Pro), speech synthesis (CosyVoice), and video generation (Wanx Video/HappyHorse) to build multimodal pipelines.
- **Template Library** — Publish and fork reusable multi-agent workflows.

## Architecture

![QwenWeaver Architecture](./docs/architecture.png)

The frontend canvas serializes the workflow DAG as JSON and sends it to the API. The backend compiles the graph into topological batches using Kahn's Algorithm and executes independent agents concurrently. Results stream back in real time via Server-Sent Events, with tokens, status updates, and edge activations animating on the canvas.

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full architecture documentation.

## Proof of Alibaba Cloud Deployment

The backend runs on Alibaba Cloud ECS, stores assets in Alibaba Cloud OSS, and performs all AI inference via Qwen models on DashScope. See [PROOF_OF_DEPLOYMENT.md](./docs/PROOF_OF_DEPLOYMENT.md) for deployment screenshots and links to every Alibaba Cloud code file.

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
| **AI**       | `@ai-sdk/alibaba` — Qwen3.7-Max / Qwen3.7-Plus on DashScope       |
| **MCP**      | `@modelcontextprotocol/sdk` — HTTP & Stdio transports             |
| **Auth**     | Better Auth — JWT sessions, email/password, OAuth                 |

## License

[MIT](LICENSE)
