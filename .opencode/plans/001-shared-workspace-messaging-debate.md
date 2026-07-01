# Multi-Agent Enhancement Plan

## Overview

Three sequential phases to upgrade QwenWeaver's agent orchestration capabilities:

| Phase | Feature                           | Description                                                        | Status         |
| ----- | --------------------------------- | ------------------------------------------------------------------ | -------------- |
| 2a    | Shared Workspace (Foundation)     | DB schema, types, query provider, API routes                       | ✅ Implemented |
| 2b    | Shared Workspace (Engine)         | workspace-tools.ts, agent-runner injection, SSE emission           | ✅ Implemented |
| 2c    | Shared Workspace (Frontend)       | SSE handler, WorkspacePanel, MaximizedNodeOverlay tab              | ✅ Implemented |
| 1     | Agent-to-Agent Messaging          | Message channels on edges, in-memory message bus, agent inbox loop | ✅ Implemented |
| 6     | Symmetric Multi-Agent Negotiation | Debate Arena node type, structured rounds, arbitrator verdict      | ✅ Implemented |

Phase 1 builds on Phase 2's MessageBus for cross-examination. Phase 6 builds on Phase 1's message channels.

---

## Phase 2: Shared Persistent Workspace (Blackboard)

### Problem

Agents share context only through DAG edges — upstream outputs fed downstream when batches execute. There is no persistent, structured, shared data store agents can read/write during execution.

### Design

An execution-scoped key-value blackboard with file storage, exposed to agents as built-in tools.

### Phase 2a — Foundation (Schema + Types + Queries + API)

#### DB Schema (3 dialects)

New table `workspace_entries`:

| Column       | Type (PG)                      | Type (SQLite)             | Type (MySQL)            |
| ------------ | ------------------------------ | ------------------------- | ----------------------- |
| id           | uuid PK                        | text PK                   | varchar(36) PK          |
| execution_id | uuid FK → executions (cascade) | text FK                   | varchar(36) FK          |
| node_id      | text NOT NULL                  | text NOT NULL             | text NOT NULL           |
| key          | text NOT NULL                  | text NOT NULL             | text NOT NULL           |
| value        | jsonb NOT NULL                 | text {mode:json} NOT NULL | json NOT NULL           |
| value_type   | text DEFAULT 'text'            | text DEFAULT 'text'       | text DEFAULT 'text'     |
| file_url     | text                           | text                      | text                    |
| round        | integer DEFAULT 0              | integer DEFAULT 0         | int DEFAULT 0           |
| created_at   | timestamp DEFAULT now()        | integer                   | timestamp DEFAULT now() |

Indexes: `(execution_id, key)` unique, `(execution_id, node_id)`.

**Files:**

- `packages/database/src/schema/pg.ts` — add `pgWorkspaceEntries`
- `packages/database/src/schema/sqlite.ts` — add `sqliteWorkspaceEntries`
- `packages/database/src/schema/mysql.ts` — add `mysqlWorkspaceEntries`
- `packages/database/src/schema/relations.ts` — link workspace entries to executions

#### Types

New file `packages/types/src/workspace.ts` with Zod schemas:

- `WorkspaceEntryType` enum: `text | json | file_ref | image_ref | audio_ref`
- `WorkspaceEntry` object schema
- `WriteWorkspaceRequest` schema

Add `workspace_write` to `SSEEventType` enum in `graph.ts`.

#### Query Provider

Add to `QueryProvider` interface:

- `writeWorkspaceEntry(executionId, nodeId, key, value, valueType?, fileUrl?) → Promise<string>`
- `readWorkspaceEntry(executionId, key) → Promise<WorkspaceEntry | null>`
- `listWorkspaceEntries(executionId, nodeId?, prefix?) → Promise<WorkspaceEntry[]>`
- `deleteWorkspaceEntry(id) → Promise<void>`
- `clearWorkspace(executionId) → Promise<void>`

Implement in all 3 dialect providers.

#### API Routes

`apps/api/src/routes/workspace/handlers.ts`:

- `POST /api/workspace/:executionId/write` — write entry
- `GET /api/workspace/:executionId/read/:key` — read by key
- `GET /api/workspace/:executionId/list` — list (filters: `?nodeId=&prefix=`)
- `DELETE /api/workspace/:executionId/clear` — clear all

Register route at `/api/workspace` in `apps/api/src/index.ts`.

---

### Phase 2b — Engine Integration

#### Workspace Tools (`apps/api/src/engine/workspace-tools.ts`)

Four built-in tools injected into every agent's toolset during execution:

```
workspace_write(key: string, value: any)  →  Write to blackboard (upsert by key)
workspace_read(key: string)               →  Read value by key
workspace_list(prefix?: string)            →  List all keys, optionally filtered
workspace_append(key: string, item: any)   →  Append to array (creates if missing)
```

Each tool wraps the query provider + emits `workspace_write` SSE event for live frontend updates.

#### Agent Runner Changes (`apps/api/src/engine/agent-runner.ts`)

- Import `createWorkspaceTools` from workspace-tools.ts
- In `runAgent()`, after MCP tools are injected (~line 218), merge workspace tools into the `tools` record
- `executionId` is already passed to `runAgent()` — use it for scoping

#### Executor Changes (`apps/api/src/engine/executor.ts`)

- At the start of `executeWorkflow()`, call `provider.clearWorkspace(executionId)` to reset the blackboard for a fresh run
- No new loop logic needed — workspace tools are agent-facing and invoked during `streamText()`

---

### Phase 2c — Frontend

#### SSE Handler (`apps/app/src/store/execution-slice.ts`)

- Add `workspace_write` to the `eventTypes` array and the switch statement
- On event, fetch updated workspace entries via API

#### Zustand Store (`apps/app/src/store/types.ts`)

- Add `workspaceEntries: WorkspaceEntry[]` to `ExecutionSlice`
- Add `workspaceLoading: boolean`

#### WorkspacePanel (`apps/app/src/components/panels/WorkspacePanel.tsx`)

New sidebar panel with:

- Tree view (keys grouped by `/` prefix)
- Search/filter input
- Real-time updates during execution
- Click to expand entry values
- File preview for `file_ref` types

#### MaximizedNodeOverlay (`apps/app/src/components/MaximizedNodeOverlay.tsx`)

- Add "Workspace" tab showing all entries
- Highlight entries written by this node
- Allow inline value editing (human-in-the-loop)

---

## Phase 1: Agent-to-Agent Messaging (Message Channels)

### Problem

Agents communicate only unidirectionally through DAG edges — an upstream agent's final output is injected into a downstream agent's prompt. There is no runtime message exchange or multi-turn conversation.

### Design

Any DAG edge can be flagged `messageChannel: true`. Instead of a data dependency, this creates a live message stream between the connected agents. Agents can exchange multiple rounds of messages during execution.

### Key Components

#### 1. Edge Payload Extension (`packages/types/src/graph.ts`)

Add to `EdgePayload.data`:

```typescript
messageChannel: z.boolean().optional();
channelConfig: z.object({
  maxRounds: z.number().optional(),
  turnBased: z.boolean().optional(),
}).optional();
```

#### 2. SSE Events (`apps/api/src/engine/types.ts`)

```typescript
message: {
  fromNodeId: string;
  toNodeId: string;
  content: string;
  round: number;
  channelId: string;
  timestamp: number;
}
```

#### 3. Message Bus (`apps/api/src/engine/message-bus.ts`) — NEW

Execution-scoped in-memory pub/sub:

- `createChannel(channelId, participantIds, config)` — create a channel between agents
- `send(senderId, channelId, content)` — agent sends a message
- `receive(agentId, channelId, sinceRound?)` — poll inbox
- `waitForMessages(agentId, timeoutMs)` — block until new messages arrive

#### 4. Executor Changes (`apps/api/src/engine/executor.ts`)

- Create a `MessageBus` per execution (alongside `allOutputs`)
- After each batch, run message exchange loop for agents connected by channel edges:
  - Detect channel edges between agents in current/parallel batches
  - Run turn-based exchange (configurable rounds)
  - Each turn: agent receives inbox → agent responds → SSE `message` event emitted
  - Store accumulated conversation transcripts in `allOutputs`

#### 5. Agent Runner Changes (`apps/api/src/engine/agent-runner.ts`)

- Receive `messageBus` and `channelConfig` in extended context
- After main output, enter message loop:
  - Check `messageBus.receive()` for new messages
  - If messages, re-invoke agent with conversation transcript prompt
  - Send response via `messageBus.send()`
  - Repeat up to `maxRounds`

#### 6. Prompt Builder (`apps/api/src/engine/prompt-builder.ts`)

New function `buildMessagePrompt(node, incomingMessages, channelContext)`:

```
You are participating in a multi-agent discussion on channel "{channelName}".
Other participants: Agent B (researcher), Agent C (critic).

Message history:
[Round 1] Agent B: Here are my findings...
[Round 1] You: I think we should...
[Round 2] Agent C: I disagree because...

Your turn. Respond to the latest messages.
```

#### 7. DAG Compiler (`apps/api/src/engine/dag-compiler.ts`)

- Skip acyclicity enforcement for edges with `messageChannel: true`
- These edges don't create execution dependencies — they create conversation channels

#### 8. Frontend

- SSE handler: store messages per channel in Zustand
- Edge visual: dashed double-line style for channel edges
- MaximizedNodeOverlay: "Messages" tab with chat-like transcript
- Connection validation: allow agent↔agent when `messageChannel: true`

### Files to Create/Modify (Phase 1)

| File                                               | Change                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `packages/types/src/graph.ts`                      | Extend `EdgePayload.data` with `messageChannel`, `channelConfig` |
| `apps/api/src/engine/types.ts`                     | Add `message` to `SSEPayloadMap`                                 |
| `apps/api/src/engine/message-bus.ts`               | **NEW** — In-memory pub/sub per execution                        |
| `apps/api/src/engine/executor.ts`                  | Message bus lifecycle, channel exchange loop                     |
| `apps/api/src/engine/agent-runner.ts`              | Message loop within `runAgent()`                                 |
| `apps/api/src/engine/prompt-builder.ts`            | `buildMessagePrompt()` function                                  |
| `apps/api/src/engine/dag-compiler.ts`              | Skip acyclicity for channel edges                                |
| `apps/app/src/store/execution-slice.ts`            | Handle `message` SSE events                                      |
| `apps/app/src/store/types.ts`                      | Add `channelMessages` state                                      |
| `apps/app/src/utils/connection-validation.ts`      | Allow agent↔agent with `messageChannel: true`                    |
| `apps/app/src/components/AnimatedEdge.tsx`         | Dashed double-line style                                         |
| `apps/app/src/components/MaximizedNodeOverlay.tsx` | "Messages" tab with chat transcript                              |
| `apps/app/src/components/panels/AgentPanel.tsx`    | Toggle "Enable Message Channel" on edges                         |

---

## Phase 6: Symmetric Multi-Agent Negotiation (Debate Arena)

### Problem

The current `[REJECT]` mechanism is one-directional (supervisor → worker). Agents cannot negotiate as peers. There is no structured debate, scoring, or consensus-building.

### Design

A `debate_arena` node orchestrates 2+ agents through structured rounds (opening → rebuttals → cross-examination via MessageBus → arbitrator verdict).

### Key Components

#### 1. New Node Type (`packages/types/src/graph.ts`)

```typescript
NodeType.enum([..., 'debate_arena']);

const DebateArenaConfig = z.object({
  participants: z.array(z.string()),       // node IDs
  mode: z.enum(['debate', 'negotiation', 'consensus']),
  maxRounds: z.number().default(3),
  hasArbitrator: z.boolean().default(false),
  arbitratorNodeId: z.string().optional(),
  scoringCriteria: z.string().optional(),
  outputFormat: z.enum(['verdict', 'transcript', 'score']).default('verdict'),
});
```

#### 2. SSE Events

```typescript
debate_round: {
  arenaId: string;
  round: number;
  statements: Array<{ participantId: string; content: string }>;
  timestamp: number;
};
debate_verdict: {
  arenaId: string;
  verdict: string;
  scores?: Record<string, number>;
  rationale?: string;
  timestamp: number;
};
```

#### 3. Debate Runner (`apps/api/src/engine/debate-runner.ts`) — NEW

```
runDebate(arena, participantNodes, allOutputs, emitter, executionId, userId)
→ AgentResult
```

Flow:

1. **Preparation** — Each participant receives the debate prompt + upstream context
2. **Round 1 (Opening)** — All participants generate positions concurrently (`Promise.all`)
3. **Round 2..N (Rebuttals)** — Each participant receives all others' previous statements and responds
4. **Cross-examination** (optional) — Participants ask/answer each other via MessageBus (depends on Phase 1)
5. **Arbitration** — If `hasArbitrator`, the arbitrator receives full transcript and produces verdict/scores
6. **Output** — Full transcript + arbitrator verdict + per-round scores

#### 4. Executor Changes (`apps/api/src/engine/executor.ts`)

- Detect `debate_arena` nodes in batch
- Route them to `runDebate()` instead of `runAgent()`
- Supervisor `[REJECT]` can restart a debate

#### 5. Frontend

- `DebateArenaNode` component in `CustomNodes.tsx`: container with round counter, participant icons, animated indicators
- `DebateTranscript` in MaximizedNodeOverlay: color-coded chat + verdict summary
- "Debate Club" workflow template in `workflow-templates.ts`

### Files to Create/Modify (Phase 6)

| File                                               | Change                                               |
| -------------------------------------------------- | ---------------------------------------------------- |
| `packages/types/src/graph.ts`                      | `debate_arena` node type, `DebateArenaConfig` schema |
| `apps/api/src/engine/types.ts`                     | `debate_round`, `debate_verdict` SSE events          |
| `apps/api/src/engine/debate-runner.ts`             | **NEW** — Orchestrate structured debate              |
| `apps/api/src/engine/executor.ts`                  | Route arena nodes to `runDebate()`                   |
| `apps/app/src/store/execution-slice.ts`            | Handle debate SSE events                             |
| `apps/app/src/store/types.ts`                      | `debateState` state                                  |
| `apps/app/src/components/CustomNodes.tsx`          | `DebateArenaNode` component                          |
| `apps/app/src/components/MaximizedNodeOverlay.tsx` | `DebateTranscript` tab                               |
| `apps/app/src/components/AnimatedEdge.tsx`         | Debate-specific edge style                           |
| `apps/app/src/utils/connection-validation.ts`      | Arena connection rules                               |
| `apps/app/src/data/worker-options.ts`              | "Debate Arena" palette entry                         |
| `apps/app/src/data/workflow-templates.ts`          | "Debate Club" template                               |
| `apps/app/src/components/panels/AgentPanel.tsx`    | Add to Orchestration section                         |
