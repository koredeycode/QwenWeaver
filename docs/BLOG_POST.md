# Weaving the Agent Society: Visual Multi-Agent Orchestration with Qwen Cloud

_Drafted for the Global AI Hackathon Series with Qwen Cloud — Track 3 (Agent Society)_

---

### Introduction: The Multi-Agent Orchestration Problem

As the AI ecosystem transitions from single-turn chat interfaces to autonomous multi-agent systems, engineering teams face a new challenge: **orchestration complexity**.

Building a cooperative network of specialized agents today requires writing hundreds of lines of boilerplate code—managing state machines, handling parallel API calls, routing data payloads, resolving agent disagreements, and preventing race conditions in shared memory. When workflows fail, debugging a complex trace in a terminal is slow and counter-productive.

I built **QwenWeaver** to solve this. QwenWeaver is a visual multi-agent orchestration platform that allows you to design, connect, and run complex agent workflows directly on a drag-and-drop canvas. Behind the scenes, QwenWeaver compiles these visual graphs into topologically scheduled parallel batches, executes them with real-time feedback loops, and provides detailed observability traces.

![QwenWeaver Landing Page](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80)

---

## 1. Visual DAG Choreography & The AI Copilot

At the core of QwenWeaver's user experience is a drag-and-drop canvas powered by **React Flow v12** and **Zustand**. Workflows are designed as Directed Acyclic Graphs (DAGs), where nodes represent triggers, specialist agents, supervisors, or tools, and edges represent communication channels.

To make building even easier, I embedded the **AI Architect Copilot** directly into the canvas side panel. Powered by `qwen3.7-max`, the Copilot acts as a meta-AI. You describe your goal in natural language (e.g., _"Build a content production pipeline that writes a script, generates an image prompt, compiles a voiceover script, and runs it by a quality supervisor"_), and the Copilot evaluates your graph state, proposes a structured plan of canvas modifications (nodes to add, delete, or connect), and lets you apply the layout changes in a single click.

---

## 2. Under the Hood: Kahn's Algorithm & Parallel Batching

Multi-agent pipelines can be painfully slow if executed sequentially. If Agent A, Agent B, and Agent C are independent, they should run concurrently.

QwenWeaver's backend (built on **Hono.js**) compiles the visual graph JSON using **Kahn's Algorithm** for topological sorting. The compiler:

1. Computes the in-degree (number of incoming dependencies) for each node.
2. Identifies all nodes with an in-degree of zero and groups them into a parallel batch.
3. Simulates the execution of that batch, decrementing the in-degree of all downstream dependents.
4. Recursively collects the next set of zero-in-degree nodes until the entire graph is sorted.
5. Detects circular dependencies (cycles) and halts execution gracefully before hitting LLM rate limits.

During execution, QwenWeaver processes each topological batch concurrently using Hono's execution loop and JavaScript’s `Promise.allSettled`. This topological parallelization delivers up to **1.98x mathematical speedup** on standard 6-node topologies (documented in our [Performance Benchmarks](./BENCHMARKS.md)).

---

## 3. Disagreement & Conflict Resolution in the Agent Society

Track 3 ("Agent Society") requires multi-agent systems to demonstrate how they decompose tasks, assign roles, and crucially, **resolve disagreements and execution conflicts**. QwenWeaver tackles this with three core architectural patterns:

### A. Supervisor Backtracking (Sequential Quality Gates)

A `supervisor` node acts as a quality gate. It evaluates upstream outputs against safety, style, or logic rules. If the supervisor detects an issue, it outputs a `[REJECT]` prefix followed by revision feedback.
The execution engine intercepts this keyword, identifies all upstream nodes that contributed input to that supervisor, deletes their stale outputs from the active message bus, appends the supervisor's feedback to the agents' revision history, and **rewinds the Kahn scheduler** to re-run the upstream agents.

### B. Debate Arena (Democratic Consensus)

For subjective tasks where a single supervisor isn't enough, I introduced the `debate_arena` node. Connected worker agents are put into a multi-turn round-robin debate (with modes for `debate`, `negotiation`, or `consensus`).
Each agent generates statements and rebuttals while reading the transcript of previous turns. An optional AI arbitrator (`qwen3.7-max` with reasoning/thinking enabled) evaluates the final transcript, scores the participants based on custom criteria, and issues a final verdict.

### C. Shared Workspace Concurrency (Blackboard Pattern)

When multiple agents in a parallel batch write to the shared key-value blackboard, write conflicts can occur. QwenWeaver uses **Optimistic Concurrency Control (OCC)**:
Each entry has a revision round. If Agent A and Agent B try to update the same key concurrently, the one that writes second will detect a round mismatch, roll back, wait with an exponential backoff, and retry (up to 5 times), ensuring zero data loss.

---

## 4. Multimodal Capabilities & MCP Integration

QwenWeaver is fully integrated with Qwen Cloud's DashScope API and supports a wide array of media generation models:

- **Wanx / Qwen Image Pro** for image synthesis.
- **CosyVoice** for high-fidelity speech synthesis.
- **Wanx Video / HappyHorse** for text-to-video and image-to-video generation.

Additionally, agents can extend their capabilities via the open-standard **Model Context Protocol (MCP)**. QwenWeaver supports HTTP Streamable and Stdio transports, dynamically discovering server tools at runtime and injecting them into the agent's prompts with credential encryption at rest.

---

## 5. Production Infrastructure on Alibaba Cloud

To prove production-readiness, QwenWeaver is fully deployed on **Alibaba Cloud VPS** using a Dockerized multi-stage setup:

- **CI/CD Pipeline**: GitHub Actions runs lints, tests, builds the monorepo, pushes to GHCR, migrates Drizzle PostgreSQL tables, and deploys to our ECS/SAS instance.
- **Observability**: Exposes Prometheus metrics (`executions_total`, `llm_tokens_total`, `agent_duration_ms`, `active_sse_connections`, `mcp_pool_connections`) to monitor execution health and LLM usage.
- **Storage**: Integrates Alibaba Cloud **Object Storage Service (OSS)** for storing generated media and execution logs.

---

## Conclusion & Learnings

Building QwenWeaver for the Qwen Cloud Hackathon showed me the power of pairing advanced reasoning models like `qwen3.7-max` (with configurable thinking budgets) with robust, deterministic engineering like Kahn's algorithm and optimistic concurrency control. By merging the visual clarity of low-code DAGs with the flexibility of multi-agent networks, QwenWeaver provides a state-of-the-art framework for building the Agent Societies of tomorrow.

Check out the code on [GitHub](https://github.com/koredeycode/qwenweaver) and try the live app at [app.qwenweaver.xyz](https://app.qwenweaver.xyz)!
