# QwenWeaver — Devpost Submission Details

Copy and paste these sections directly into your Devpost project page.

---

### Project Title

`QwenWeaver`

### Tagline

`Visual Multi-Agent Orchestration Platform: Drag, connect, and run parallel AI agent societies with real-time SSE streaming and automated conflict resolution.`

---

### Description

## Inspiration

As a developer, I wanted to build complex multi-agent systems, but I quickly realized how tedious it is to coordinate them in code. Managing state machines, routing payloads between agents, handling parallel executions, and resolving disagreements requires writing vast amounts of boilerplate code. When something fails, diagnosing the error from raw terminal logs is incredibly slow.

I built **QwenWeaver** to bridge this gap. I wanted to make multi-agent societies visual, interactive, and mathematically efficient. By representing agents as nodes and communication channels as edges on a drag-and-drop canvas, developers can visually architect agent networks, see data stream token-by-token in real-time, and observe how conflicts are dynamically resolved.

## What it does

QwenWeaver is a TypeScript-native visual orchestration platform built for Track 3 (Agent Society):

1. **Visual DAG Canvas**: Drag-and-drop editor (React Flow v12) to visually design agent workflows and coordinate communication edges.
2. **AI Architect Copilot**: Natural-language assistant (`qwen3.7-max`) that automatically proposes and applies canvas layout modifications.
3. **Parallel Scheduler**: Uses Kahn's Algorithm to sort and run independent agents concurrently, delivering up to **1.98x wall-clock speedups**.
4. **Three Conflict Resolution Modes**: Features **Supervisor Backtracking** (rewinding and re-running rejected workflows), **Debate Arena** (multi-agent dialogue with AI arbitration), and a **Shared Blackboard** protected by Optimistic Concurrency Control (OCC).
5. **Real-time SSE Observability**: Streams live tokens, reasoning states (thinking budgets), and active node glows, plotting performance metrics as Gantt charts.
6. **Extensible Extensions**: Built-in support for encrypted Model Context Protocol (MCP) servers and DashScope media pipelines (Wanx Image/Video, CosyVoice TTS).

## How I built it

- **Frontend**: React 19, Vite, React Flow v12, and Zustand atomic state slices to prevent unnecessary canvas re-renders.
- **Backend**: Edge-optimized Hono.js server (Node.js) leveraging Server-Sent Events (SSE) for live agent output streaming.
- **Database**: Drizzle ORM managing a dual-dialect schema (SQLite for local development, PostgreSQL/Supabase in production).
- **Authentication**: Better Auth supporting JWT sessions, email/password, and OAuth (Google, GitHub).
- **AI Integration**: `@ai-sdk/alibaba` utilizing `qwen3.7-max` (reasoning/thinking budget) and `qwen3.7-plus`.
- **Media Pipelines**: DashScope APIs for multimodal outputs (CosyVoice TTS, Wanx Image Pro, HappyHorse Video).
- **Deployment**: Hosted on Alibaba Cloud ECS VPS via Docker multi-stage builds, with OSS asset storage and a GitHub Actions CI/CD pipeline.

## Challenges I ran into

1. **Database Race Conditions**: Concurrent writes to the shared workspace caused data overwrites. Resolved by implementing Optimistic Concurrency Control (OCC) with versioned records and an exponential backoff retry loop.
2. **Backtracking & State Management**: Rewinding Kahn's topological queue on supervisor rejection required precise state coordination. I isolated the DataBus to wipe only affected downstream outputs while preserving unrelated parallel branches.

## Accomplishments that I'm proud of

- **100% Green Test Suite**: Writing **412 end-to-end and simulation tests** ensuring complex visual topologies run deterministically.
- **Highly Responsive UX**: Achieving smooth, real-time node glows, animated data flow edges, and token-by-token streaming on the canvas.
- **Mathematical Validation**: SURFACED live execution speedups and parallel efficiency metrics directly in the UI as Gantt schedule trace charts.
- **Production-Grade Architecture**: Building a visual editor that handles advanced orchestration patterns (Debates, Backtracking, OCC, MCP tool auth) beyond simple toy demos.

## What I learned

- **Thinking Budget Configuration**: Providing reasoning budgets on supervisor and arbitrator nodes dramatically improves output quality and conflict resolution accuracy while maintaining low overall latencies.
- **Extensible Integration Standards**: The power of standardizing on the Model Context Protocol (MCP) to make multi-agent societies modular and tool-equipped by default.

## What's next for QwenWeaver

- **Self-Hosted Distribution**: Releasing a fully self-hosted, open-source package downloadable via Docker or initialized locally via npm.
- **BYOK (Bring Your Own Key) for Cloud**: Allowing users on the hosted platform (`app.qwenweaver.xyz`) to configure their own DashScope API keys for direct, credit-free execution.
- **Cost & Latency Optimization**: Auto-routing nodes to cheaper models (like `qwen3.6-flash`) based on cost ceilings and execution logs.
- **Edge Agent Integration**: Connecting Track 5 EdgeAgent sensory inputs to trigger and direct canvas workflows locally.
