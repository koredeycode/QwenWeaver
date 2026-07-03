# QwenWeaver Architecture

QwenWeaver is a TypeScript-native, pnpm monorepo that combines a visual DAG editor (React Flow v12) with a parallel execution engine (Hono.js) and Qwen AI models (DashScope) to orchestrate multi-agent workflows.

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph "Frontend (apps/app)"
        Canvas["React Flow v12 Canvas<br/>Visual DAG Editor"]
        Store["Zustand Store<br/>Atomic State Slices"]
        API_Client["Hono RPC Client<br/>hc"]
    end

    subgraph "Marketing Site (apps/site)"
        Pages["Marketing Pages<br/>Home, Pricing, Docs"]
    end

    subgraph "API Server (apps/api)"
        Hono["Hono.js Server<br/>@hono/node-server"]
        Auth["Better Auth<br/>JWT Sessions"]
        Routes["Route Modules<br/>workflow, execution, copilot<br/>mcp, analytics, credits"]
        Engine["Execution Engine<br/>Kahn's Algorithm + Parallel Exec"]
        SSE["SSE Streaming<br/>streamSSE"]
    end

    subgraph "Shared Packages"
        Types["@qwenweaver/types<br/>Zod Schemas + TS Types"]
        DB["@qwenweaver/database<br/>Drizzle ORM"]
        MCP["@qwenweaver/mcp-client<br/>MCP Transports"]
    end

    subgraph "Data Stores"
        SQLite["SQLite (dev)<br/>better-sqlite3"]
        PostgreSQL["PostgreSQL (prod)"]
    end

    subgraph "AI Providers"
        DashScope["DashScope API<br/>Qwen3-Max / Qwen3-Plus"]
        MCP_Servers["MCP Servers<br/>HTTP & Stdio"]
    end

    Canvas -->|"DAG JSON"| API_Client
    API_Client -->|"REST + SSE"| Hono
    Hono --> Routes
    Routes --> Engine
    Engine --> SSE
    SSE -->|"events"| API_Client
    Routes --> Auth
    Engine --> Types
    Engine --> DB
    Engine --> MCP
    DB --> SQLite
    DB --> PostgreSQL
    Engine -->|"streamText"| DashScope
    Engine -->|"tool calls"| MCP_Servers

    Pages -->|"React Router"| Canvas
    Pages -->|"links"| Hono
```

---

## 2. Frontend Architecture

### 2.1 React Flow Canvas & Zustand Store

```mermaid
flowchart LR
    subgraph "Zustand Store"
        Graph["graph-slice.ts<br/>nodes, edges, selectedIds"]
        Execution["execution-slice.ts<br/>executionId, status, metrics<br/>streaming tokens"]
        Auth["auth-slice.ts<br/>user, session, tokens"]
        Copilot["copilot-slice.ts<br/>history, pending proposal"]
        History["history-slice.ts<br/>undo/redo stack"]
        Templates["templates-slice.ts<br/>gallery, fork"]
        Tour["tour-slice.ts<br/>onboarding step"]
    end

    subgraph "React Components"
        Canvas["CanvasWorkspace.tsx<br/><ReactFlow />"]
        Nodes["CustomNodes.tsx<br/>Agent, Supervisor, Trigger<br/>MCP, Debate Arena, Logic"]
        Edges["AnimatedEdge.tsx<br/>Data + Conversation"]
        Sidebar["Sidebar.tsx<br/>Node Palette"]
        Inspector["Inspector.tsx<br/>Node Config Panel"]
        CopilotOverlay["CopilotOverlay.tsx<br/>AI Copilot"]
    end

    subgraph "Services"
        WS["workflow-service.ts<br/>execute, stream"]
        MCP_Service["mcp-service.ts<br/>servers, discover"]
        Copilot_Service["copilot-service.ts<br/>graph actions"]
    end

    Graph --> Canvas
    Execution --> Canvas
    Canvas --> Nodes
    Canvas --> Edges
    Sidebar -->|"drag & drop"| Graph
    Inspector --> Graph
    CopilotOverlay --> Copilot
    CopilotOverlay --> Graph
    WS -->|"SSE events"| Execution
    MCP_Service --> MCP
    Copilot_Service --> Copilot
```

**State design principles:**

- **Granular selectors** — components subscribe to specific slices (e.g., `useStore(s => s.nodes)`) not the full store, preventing unnecessary re-renders.
- **Atomic slices** — each domain concern has its own slice file (`graph-slice.ts`, `execution-slice.ts`, etc.), composed in `store.ts`.
- **Auto-save** — graph mutations are debounced and persisted to the API via `auto-save.ts`.

### 2.2 SSE Event Handling

```mermaid
sequenceDiagram
    participant Canvas as React Flow Canvas
    participant Store as Zustand Store
    participant WS as workflow-service.ts
    participant API as Hono API
    participant Engine as Execution Engine

    Canvas->>WS: executeWorkflow(dagJson)
    WS->>API: POST /api/workflow/execute
    API->>Engine: executeWorkflow()
    Engine->>API: return executionId
    API->>WS: { executionId }
    WS->>API: GET /api/workflow/{id}/stream (SSE)

    loop Stream Events
        Engine->>API: token { nodeId, chunk }
        API->>WS: event: token
        WS->>Store: appendToken(nodeId, chunk)
        Store->>Canvas: re-render node output

        Engine->>API: status_update { nodeId, status }
        API->>WS: event: status_update
        WS->>Store: updateNodeStatus(nodeId, status)
        Store->>Canvas: node glow/color change

        Engine->>API: edge_active { sourceId, targetId }
        API->>WS: event: edge_active
        WS->>Store: setEdgeActive(edgeId)
        Store->>Canvas: edge animation

        Engine->>API: workspace_write { nodeId, key }
        API->>WS: event: workspace_write
        WS->>Store: logWorkspaceWrite(nodeId, key)

        Engine->>API: bus_message { message }
        API->>WS: event: bus_message
        WS->>Store: logBusMessage(message)

        Engine->>API: debate_round { arenaId, round, statements }
        API->>WS: event: debate_round
        WS->>Store: addDebateRound(arenaId, round, statements)

        Engine->>API: debate_verdict { arenaId, verdict, scores }
        API->>WS: event: debate_verdict
    end

    Engine->>API: complete { executionId, metrics }
    API->>WS: event: complete
    WS->>Store: setComplete(metrics)
    WS->>Canvas: show completion summary
```

---

## 3. Backend Architecture

### 3.1 API Route Modules

```mermaid
flowchart TB
    Hono["Hono.js App<br/>index.ts"] --> Security["Security Middleware<br/>CORS, HSTS, BodyLimit"]
    Hono --> AuthMiddleware["Better Auth + Session<br/>JWT enforcement"]
    Hono --> RateLimiter["Rate Limiter<br/>copilot + general API"]

    Hono --> WorkflowRoutes["/api/workflow<br/>execute, CRUD"]
    Hono --> ExecutionRoutes["/api/execution<br/>status, history"]
    Hono --> CopilotRoutes["/api/copilot<br/>AI graph builder"]
    Hono --> MCPRoutes["/api/mcp<br/>servers, tools, registry"]
    Hono --> AnalyticsRoutes["/api/analytics<br/>usage stats"]
    Hono --> CreditsRoutes["/api/credits<br/>billing"]
    Hono --> CredentialsRoutes["/api/credentials<br/>encrypted API keys"]
    Hono --> TemplateRoutes["/api/templates<br/>community workflows"]
    Hono --> FileRoutes["/api/files<br/>asset upload/download"]
    Hono --> WorkspaceRoutes["/api/workspace<br/>blackboard CRUD"]

    WorkflowRoutes --> Engine
    ExecutionRoutes --> Engine
```

### 3.2 Execution Engine

```mermaid
flowchart TB
    subgraph "Engine (apps/api/src/engine/)"
        Compiler["dag-compiler.ts<br/>Kahn's Algorithm<br/>Topological Sort"]
        Executor["executor.ts<br/>Main Loop<br/>Batch Iteration + Supervisor Backtrack"]
        AgentRunner["agent-runner.ts<br/>streamText + Tool Calls<br/>Media Generation"]
        DebateRunner["debate-runner.ts<br/>Multi-Round Debate<br/>Arbitration"]
        DataBus["message-bus.ts<br/>Topic-based Pub/Sub"]
        ModelRouter["model-router.ts<br/>Model Selection<br/>DashScope Provider"]
        MCPBridge["mcp-bridge.ts<br/>Tool Discovery<br/>Remote Execution"]
        PromptBuilder["prompt-builder.ts<br/>Bus-to-Prompt Assembly"]
        WorkspaceTools["workspace-tools.ts<br/>Blackboard R/W/A"]
        CredentialResolver["credential-resolver.ts<br/>Encrypted Auth Resolution"]
        Generators["generators/<br/>wanx-image, wanx-video<br/>cosyvoice"]
    end

    Executor --> Compiler
    Executor --> AgentRunner
    Executor --> DebateRunner
    Executor --> DataBus
    Executor --> WorkspaceTools
    AgentRunner --> ModelRouter
    AgentRunner --> MCPBridge
    AgentRunner --> PromptBuilder
    AgentRunner --> CredentialResolver
    AgentRunner --> Generators
    DebateRunner --> ModelRouter
    DataBus --> PromptBuilder
```

### 3.3 DAG Compilation (Kahn's Algorithm)

```mermaid
flowchart LR
    Input["WorkflowPayload<br/>nodes[] + edges[]"] --> Filter["Filter conversation-mode edges<br/>(not data-flow dependencies)"]
    Filter --> BuildGraph["Build adjacency list<br/>Compute in-degrees"]
    BuildGraph --> InitQueue["Queue = zero-in-degree nodes"]
    InitQueue --> Loop{"Queue empty?"}

    Loop -->|No| Batch["Pop entire queue as batch"]
    Batch --> ProcessBatch["For each node in batch:<br/>decrement dependent in-degrees<br/>add newly zero-degree nodes to next queue"]
    ProcessBatch --> Loop

    Loop -->|Yes| Check{"processedCount<br/>= nodeCount?"}

    Check -->|No| Cycle["Cycle detected!<br/>Return hasCycle=true<br/>cycleNodeIds"]
    Check -->|Yes| Output["Return batches[]<br/>hasCycle=false"]

    subgraph "Execution"
        BatchExec["For each batch:<br/>Promise.all batch nodes"]
        Supervisor["Supervisor rejects?<br/>[REJECT] detected?"]
        Backtrack["Backtrack to worker's batch<br/>Inject feedback<br/>Re-execute"]
        Complete["All batches done<br/>Emit complete event<br/>Return metrics"]
    end

    Output --> BatchExec
    BatchExec --> Supervisor
    Supervisor -->|Yes + rounds < max| Backtrack
    Backtrack --> BatchExec
    Supervisor -->|No| NextBatch["Next batch"]
    NextBatch --> BatchExec
    NextBatch -->|No more batches| Complete
```

### 3.4 Inter-Agent Communication (DataBus)

```mermaid
flowchart TB
    subgraph "DataBus"
        Topics["Topic Registry<br/>node:A.output<br/>node:B.output<br/>conversation:X|Y"]
        Pub["publish(topic, payload)"]
        Sub["getMessagesForNode(nodeId)"]
    end

    subgraph "Node A"
        A["Agent Node A"]
        A_Output["Output Published"]
    end

    subgraph "Node B"
        B["Agent Node B"]
        B_Consumes["Consumes A's output"]
    end

    subgraph "Conversation Edge"
        Conv["conversation:X|Y<br/>Multi-round exchange"]
    end

    A -->|"publish(node:A.output)"| Pub
    Pub --> Topics
    B -->|"getMessagesForNode(B)"| Sub
    Topics --> Sub
    Sub --> B_Consumes

    A -->|"publish(conversation:A|B, round=1)"| Conv
    B -->|"publish(conversation:A|B, round=1)"| Conv
    Conv -->|"getConversationChannelMessages"| A
    Conv -->|"getConversationChannelMessages"| B
```

The DataBus (`message-bus.ts`) is a topic-based pub/sub system:

| Topic Pattern              | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `node:{nodeId}.output`     | Default subscription — downstream agents consume via incoming edges |
| `node:{nodeId}.error`      | Error notifications                                                 |
| `conversation:{channelId}` | Multi-round conversation exchange between paired agents             |

Messages are persisted to the `execution_messages` table for audit trails when `persistLogs` is enabled.

---

## 4. Node Types

```mermaid
flowchart TB
    Trigger["Trigger / Input Trigger<br/>Entry point, passthrough"]
    Agent["Agent Node<br/>LLM-powered<br/>System prompt + tools"]
    Supervisor["Supervisor Node<br/>Quality gate<br/>[REJECT]+feedback"]
    MCP["MCP Tool Node<br/>External tool connector<br/>HTTP or Stdio"]
    Debate["Debate Arena<br/>Multi-agent debate<br/>Arbitration + scoring"]
    Logic["Logic Node<br/>Routing, merging<br/>Conditional branching"]

    Trigger --> Agent
    Agent --> Supervisor
    Agent --> MCP
    Agent --> Debate
    Agent --> Logic
    Supervisor --> Agent
    Supervisor --> Logic
    MCP --> Agent
    MCP --> Supervisor
```

### Agent Node Configuration

| Parameter        | Description                                | Default     |
| ---------------- | ------------------------------------------ | ----------- |
| `systemPrompt`   | Defines agent behavior and role            | —           |
| `model`          | LLM model identifier                       | `qwen3-max` |
| `enableThinking` | Chain-of-thought reasoning                 | `false`     |
| `thinkingBudget` | Max tokens for reasoning                   | `4096`      |
| `outputFormat`   | Output format (markdown, html, json, etc.) | `markdown`  |
| `mcpTools`       | Attached MCP tool configurations           | —           |

### Supervisor Node Negotiation

```mermaid
sequenceDiagram
    participant Worker as Agent Node
    participant Supervisor as Supervisor Node
    participant Engine as Execution Engine

    Worker->>Engine: Agent output completed
    Engine->>Supervisor: Review output
    Supervisor->>Engine: [REJECT] + feedback
    alt Rounds < maxNegotiationRounds
        Engine->>Worker: Backtrack + inject feedback
        Worker->>Engine: Revised output
        Engine->>Supervisor: Re-review
        Supervisor->>Engine: [APPROVE] or [REJECT]
    else Max rounds reached
        Engine->>Engine: Accept current output
    end
    Engine->>Engine: Continue to next batch
```

### Debate Arena Modes

| Mode          | Description                                         |
| ------------- | --------------------------------------------------- |
| `debate`      | Participants argue positions, address counterpoints |
| `negotiation` | Find common ground, propose compromises             |
| `consensus`   | Work toward unified conclusion                      |

Output formats: `verdict` (transcript + verdict + scores), `transcript` (raw transcript only), `score` (numeric scores only).

---

## 5. Database Strategy

### 5.1 Dual-Dialect Schema

```mermaid
flowchart LR
    subgraph "packages/database/src/schema/"
        SQLite["sqlite.ts<br/>INTEGER PKs, TEXT fields"]
        PG["pg.ts<br/>UUID PKs, JSONB, timestamps"]
        Relations["relations.ts<br/>Drizzle relations"]
        Index["index.ts<br/>Dynamic connection factory"]
    end

    subgraph "Runtime"
        Env["DATABASE_URL<br/>env var"]
        Factory["Connection Factory"]
    end

    Env --> Factory
    Factory -->|"file:./data.db"| SQLite
    Factory -->|"postgresql://..."| PG
    Factory -->|"mysql://..."| MySQL["mysql.ts<br/>Alternative dialect"]
```

**Schema design rules:**

- **Additive only** — never drop or rename columns. Prevents breaking production.
- **Provider pattern** — `getQueryProvider()` returns the correct dialect-specific implementation.
- **Shared migrations** — Drizzle Kit generates dialect-aware SQL.

### 5.2 Key Tables

| Table                | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `users`              | Auth + profile                                     |
| `workflows`          | DAG definitions (nodes + edges JSON)               |
| `executions`         | Run state, metrics, timing                         |
| `agent_logs`         | Per-node execution logs (prompts, outputs, tokens) |
| `execution_messages` | DataBus message persistence                        |
| `workspace_entries`  | Blackboard key-value store per execution           |
| `mcp_servers`        | Registered MCP server configurations               |
| `credentials`        | Encrypted API keys and auth tokens                 |
| `credits`            | Usage billing (cloud only)                         |

---

## 6. MCP Integration

```mermaid
flowchart LR
    subgraph "MCP Client Pool"
        HTTP["HTTP Streamable Transport<br/>Remote MCP Server"]
        Stdio["Stdio Transport<br/>Local Process (npx)"]
    end

    subgraph "Tool Lifecycle"
        Discover["listTools() → Tool[]"]
        Cache["Cache per execution"]
        Execute["callTool(name, args) → Result"]
        Cleanup["Disconnect after execution"]
    end

    AgentRunner --> Discover
    AgentRunner --> Execute
    AgentRunner --> Cache
    AgentRunner --> Cleanup
    Discover --> HTTP
    Discover --> Stdio
    Execute --> HTTP
    Execute --> Stdio
```

**Auth methods:** `none`, `api_key` (header), `bearer` (token), `basic` (username+password). Credentials are stored encrypted in the `credentials` table and resolved at execution time via `credential-resolver.ts`.

---

## 7. Media Generation Pipeline

```mermaid
flowchart TB
    Agent["Agent Node<br/>outputFormat=image|audio|video"] --> CheckFormat{"outputFormat?"}

    CheckFormat -->|image| WanxImage["wanx-image.ts<br/>generateWanxImage(prompt)"]
    CheckFormat -->|audio| CosyVoice["cosyvoice.ts<br/>generateCosyVoiceAudio(text)"]
    CheckFormat -->|video| WanxVideo["wanx-video.ts<br/>generateWanxVideo(prompt)"]

    WanxImage --> File["writeBinaryAsset()<br/>→ public/assets/"]
    CosyVoice --> File
    WanxVideo --> File

    File --> Output["outputs: [{ type, contentType, value: fileUrl }]"]
```

All generated assets are written to the `public/assets/` directory and served statically. The frontend renders them via `OutputRenderer.tsx` which handles `image/*`, `audio/*`, `video/*`, and `text/*` content types.

---

## 8. Workspace Blackboard

The shared workspace is a key-value store scoped to a single execution, optimized for concurrent agent access:

- **`workspace_write(key, value)`** — upsert with optimistic concurrency (version `round` field)
- **`workspace_read(key)`** — read by key
- **`workspace_list(prefix?)`** — list keys with optional prefix filter
- **`workspace_append(key, item)`** — append to array with retry-on-conflict

```mermaid
sequenceDiagram
    participant A as Agent A
    participant B as Agent B
    participant WB as Workspace (DB)

    A->>WB: workspace_write("research.findings", {...}) round=0
    WB->>A: OK round=1

    B->>WB: workspace_read("research.findings")
    WB->>B: { value: {...}, round: 1 }

    B->>WB: workspace_write("research.findings", {...}) round=1
    WB->>B: OK round=2

    A->>WB: workspace_append("logs", "step1")
    WB->>A: OK length=1

    B->>WB: workspace_append("logs", "step2")
    WB->>B: OK length=2 (no conflict — uses array semantics)
```

---

## 9. Prometheus Metrics

The engine exposes operational metrics at `/api/metrics` (authenticated via `METRICS_TOKEN`):

| Metric              | Type      | Labels               | Description                  |
| ------------------- | --------- | -------------------- | ---------------------------- |
| `executions_total`  | Counter   | `status`             | Total workflow executions    |
| `llm_tokens_total`  | Counter   | `model`, `node_type` | Total LLM tokens consumed    |
| `agent_duration_ms` | Histogram | `node_type`          | Per-agent execution duration |

---

## 10. Project Map

```
qwenweaver/
├── apps/
│   ├── app/                          # Main SPA (React 19 + Vite + React Flow v12)
│   │   └── src/
│   │       ├── store/                # Zustand atomic slices
│   │       ├── components/           # React Flow nodes, edges, panels
│   │       ├── services/             # API service wrappers
│   │       ├── hooks/                # React hooks (shortcuts, auto-save)
│   │       ├── lib/                  # API client, templates, example workflows
│   │       ├── data/                 # Worker options, templates data
│   │       └── utils/                # DAG layout, graph actions, validation
│   │
│   ├── site/                         # Marketing site (Vite + React + Tailwind v4)
│   │   └── src/
│   │       ├── pages/                # Home, Pricing
│   │       ├── docs/                 # MDX/React documentation pages
│   │       └── components/           # Shared site components
│   │
│   └── api/                          # Hono.js backend
│       └── src/
│           ├── engine/               # Core execution engine
│           │   ├── dag-compiler.ts    # Kahn's Algorithm
│           │   ├── executor.ts        # Main execution loop
│           │   ├── agent-runner.ts    # LLM agent execution
│           │   ├── debate-runner.ts   # Multi-agent debate
│           │   ├── message-bus.ts     # Inter-agent pub/sub
│           │   ├── mcp-bridge.ts      # MCP tool discovery/calling
│           │   ├── model-router.ts    # Model selection + provider
│           │   ├── prompt-builder.ts  # Prompt assembly from bus messages
│           │   ├── workspace-tools.ts # Blackboard tools
│           │   ├── credential-resolver.ts
│           │   ├── file-asset.ts      # Binary asset storage
│           │   └── generators/        # Media generation (Wanx, CosyVoice)
│           ├── routes/               # API route modules
│           ├── middleware/           # Rate limiter
│           ├── auth.ts               # Better Auth integration
│           ├── logger.ts             # Pino structured logging
│           ├── metrics.ts            # Prometheus metrics
│           └── config.ts             # Environment configuration
│
├── packages/
│   ├── types/                        # Shared Zod schemas + TypeScript
│   │   └── src/
│   │       ├── graph.ts              # Node/Edge/Execution schemas
│   │       └── mcp.ts                # MCP tool definitions
│   │
│   ├── database/                     # Drizzle ORM dual-dialect
│   │   └── src/
│   │       └── schema/               # sqlite.ts, pg.ts, mysql.ts, relations.ts
│   │
│   └── mcp-client/                   # MCP transport layer
│       └── src/
│           └── index.ts              # HTTP & Stdio clients
└── ...config files
```
