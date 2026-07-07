# QwenWeaver — Devpost Submission Details

Copy and paste these sections directly into your Devpost project page.

---

### Project Title

`QwenWeaver`

### Tagline

`Visual Multi-Agent Orchestration Platform: Drag, connect, and run parallel AI agent societies with real-time SSE streaming and automated conflict resolution.`

---

### Description

#### 🚀 Inspiration

As a developer, I wanted to build complex multi-agent systems, but I quickly realized how tedious it is to coordinate them in code. Managing state machines, routing payloads between agents, handling parallel executions, and resolving disagreements requires writing vast amounts of boilerplate code. When something fails, diagnosing the error from raw terminal logs is incredibly slow.

I built **QwenWeaver** to bridge this gap. I wanted to make multi-agent societies visual, interactive, and mathematically efficient. By representing agents as nodes and communication channels as edges on a drag-and-drop canvas, developers can visually architect agent networks, see data stream token-by-token in real-time, and observe how conflicts are dynamically resolved.

#### 🛠️ What it does

QwenWeaver is a TypeScript-native visual orchestration platform built for Track 3 (Agent Society). Key features include:

1. **Visual DAG Canvas**: Drag-and-drop workflow builder powered by React Flow v12. Arrange specialist agent roles and define execution flows.
2. **AI Architect Copilot**: A side-panel chat assistant powered by `qwen3.7-max` that proposes visual graph edits (adding nodes, deleting edges, setting up connections) from natural language descriptions.
3. **Kahn's Algorithm Parallel Scheduler**: Compiles the workflow graph into topological batches. Zero-in-degree nodes execute concurrently in parallel batches via `Promise.allSettled`, delivering up to **1.98x wall-clock speedups**.
4. **Three Conflict Resolution Mechanisms**:
   - **Supervisor Backtracking**: A quality gate node can reject upstream output. The engine automatically rolls back the execution queue, wipes affected message paths, and re-runs the upstream agents with the supervisor's feedback.
   - **Debate Arena**: Workers engage in multi-round exchanges (debate, negotiation, or consensus modes) with an impartial AI arbitrator that evaluates arguments and scores participants.
   - **Shared Workspace Blackboard**: Multi-agent parallel reads/writes are protected by **Optimistic Concurrency Control (OCC)** to prevent write collisions.
5. **Real-time SSE Observability**: Stream text tokens, reasoning states (thinking mode), and node active glows to the frontend. Surplus metrics like Speedup ($S$) and Parallel Efficiency ($\eta$) are plotted as Gantt schedule trace charts.
6. **Advanced Extensions**: Built-in support for Model Context Protocol (MCP) servers (with encrypted credential storage) and DashScope multimodal generation pipelines (Wanx Image/Video, CosyVoice Speech).

#### ⚙️ How I built it

- **Frontend**: React 19, Vite, React Flow v12, Tailwind CSS, and Zustand atomic state slices (isolated slices for graph, history, auth, and copilot to minimize re-renders).
- **Backend**: Edge-optimized Hono.js server running on Node, leveraging SSE streaming and asynchronous event emitters.
- **Database**: Drizzle ORM managing a dual-dialect database (SQLite locally for developer efficiency, PostgreSQL/Supabase in production).
- **Authentication**: Better Auth with JWT sessions, email/password, and OAuth providers (Google, GitHub).
- **AI Integration**: `@ai-sdk/alibaba` leveraging `qwen3.7-max` (with reasoning/thinking budget enabled for arbitration/supervision) and `qwen3.7-plus`.
- **Media Pipelines**: CosyVoice API for high-fidelity speech synthesis, Wanx & Qwen Image Pro for image generation, and HappyHorse/Wanx Video for video/animation generation.
- **Deployment**: Production deployment on Alibaba Cloud VPS (SAS/ECS) using Docker multi-stage builds, OSS bucket storage for assets, and a fully automated GitHub Actions CI/CD pipeline.

#### 🛑 Challenges I ran into

1. **Database Race Conditions**: When multiple agents in a parallel batch wrote to the shared workspace simultaneously, data was overwritten. I resolved this by implementing Optimistic Concurrency Control, adding version numbers (rounds) to each database record, and building an exponential backoff retry loop.
2. **Backtracking and State Management**: Rewinding Kahn's topological queue on supervisor rejection required deep state coordination. I had to ensure that the DataBus wiped only the affected intermediate outputs while preserving unrelated parallel branches.
3. **Supabase Migration Issues**: In production, `drizzle-kit push` would crash due to Supabase check constraint introspection bugs. I resolved this by standardizing on `drizzle-kit generate` followed by `drizzle-kit migrate` in the deployment workflow.
4. **Race Conditions in Tests**: SQLite database lockups and foreign key constraints caused test suite failures. I resolved this by wrapping SQLite teardown steps in `PRAGMA foreign_keys = OFF / ON` overrides.

#### 🎉 Accomplishments that I'm proud of

- Designing a **100% green test suite (412 tests passing)** that tests complex visual topologies end-to-end.
- Achieving a highly responsive UI where nodes glow, edges animate, and tokens stream live on the canvas.
- Designing a mathematical speedup tracker that proves the parallel efficiency gains of multi-agent networks over sequential baselines.
- Building a production-grade visual editor that handles complex orchestration patterns (Debates, MCP tool auth, Backtracking, Media pipelines) without resorting to toy demos.

#### 💡 What I learned

- How to configure and throttle the **thinking budget** on Qwen's reasoning models. Providing a reasoning budget to supervisor and arbitrator nodes dramatically improves output quality while keeping overall execution latencies low.
- The power of standardizing on the Model Context Protocol (MCP) to make multi-agent systems extensible by default.

#### 🔮 What's next for QwenWeaver

- **Template Marketplace**: A community platform to share, rate, and fork multi-agent workflow layouts.
- **Cost & Latency Optimization**: Auto-routing nodes to cheaper models (like `qwen3.6-flash`) based on cost ceilings and execution logs.
- **Edge Deployment**: Integrating Track 5 EdgeAgent sensory inputs to trigger canvas workflows locally.
