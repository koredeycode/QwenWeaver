import { Link } from 'react-router-dom';

export function WorkflowGuide() {
  return (
    <div>
      <h1>Building Workflows</h1>
      <p>
        QwenWeaver workflows are directed acyclic graphs (DAGs). Nodes are agents, supervisors,
        debate arenas, or tools. Edges define data flow between them.
      </p>

      <h2>The Canvas</h2>
      <p>The canvas is built on React Flow v12. Key interactions:</p>
      <ul>
        <li>
          <strong>Pan</strong> — click and drag the background
        </li>
        <li>
          <strong>Zoom</strong> — scroll wheel or pinch
        </li>
        <li>
          <strong>Add nodes</strong> — drag from the left sidebar palette onto the canvas
        </li>
        <li>
          <strong>Connect nodes</strong> — drag from a node's handle (dot) to another node
        </li>
        <li>
          <strong>Select</strong> — click a node or edge; use Shift for multi-select
        </li>
        <li>
          <strong>Delete</strong> — select and press Delete/Backspace
        </li>
        <li>
          <strong>Inspect</strong> — click a node to open the inspector panel on the right
        </li>
        <li>
          <strong>AI Copilot</strong> — click the copilot icon (or press Cmd+K) to describe changes
          in natural language
        </li>
      </ul>

      <h2>Data Flow</h2>
      <p>
        When a workflow executes, each node receives the outputs of all its upstream nodes as
        context. The trigger node provides the initial user input. The engine:
      </p>
      <ol>
        <li>
          Compiles the DAG using <strong>Kahn's Algorithm</strong> to detect cycles and compute
          topological order
        </li>
        <li>
          Groups zero-in-degree nodes into <strong>parallel batches</strong>
        </li>
        <li>
          Executes each batch concurrently with <strong>Promise.all</strong>
        </li>
        <li>
          Streams <code>token</code>, <code>thinking</code>, <code>status_update</code>,{' '}
          <code>edge_active</code>, <code>workspace_write</code>, <code>bus_message</code>, and{' '}
          <code>debate_round</code> events via SSE
        </li>
        <li>
          If a <strong>Supervisor</strong> rejects output, the engine backtracks and re-executes
          with feedback
        </li>
        <li>
          If <strong>conversation-mode edges</strong> are detected, runs multi-round exchanges
          between the connected agents
        </li>
      </ol>

      <h2>Conversation-Mode Edges</h2>
      <p>
        Standard edges pass data downstream once. Conversation-mode edges enable multi-round
        back-and-forth exchanges between agents. When enabled on an edge:
      </p>
      <ul>
        <li>
          Agents exchange messages in rounds (configurable <code>maxRounds</code>, default: 5)
        </li>
        <li>Each agent responds to the other's previous message</li>
        <li>The transcript of all rounds is available as context</li>
        <li>Ideal for collaborative tasks, brainstorming, or negotiation between two agents</li>
      </ul>

      <h2>Shared Workspace Blackboard</h2>
      <p>
        Every execution has a shared key-value workspace accessible by all agents. Agents can use
        built-in tools to collaborate:
      </p>
      <ul>
        <li>
          <code>workspace_write(key, value)</code> — write or update a key (upsert)
        </li>
        <li>
          <code>workspace_read(key)</code> — read a value by key
        </li>
        <li>
          <code>workspace_list(prefix?)</code> — list all keys with an optional prefix filter
        </li>
        <li>
          <code>workspace_append(key, item)</code> — append to an array (with optimistic
          concurrency)
        </li>
      </ul>
      <p>
        The workspace uses optimistic concurrency control to prevent data loss when multiple agents
        write concurrently. The <code>workspace_append</code> function automatically retries on
        conflict.
      </p>

      <h2>Execution Metrics</h2>
      <p>After execution, the engine reports:</p>
      <ul>
        <li>
          <strong>Speedup</strong> — ratio of sequential time to parallel wall-clock time
        </li>
        <li>
          <strong>Total Tokens</strong> — sum of all tokens across all agent calls
        </li>
        <li>
          <strong>Latency</strong> — total wall-clock execution time
        </li>
        <li>
          <strong>Parallel Efficiency</strong> — average node utilization across batches
        </li>
        <li>
          <strong>Node Timings</strong> — per-node duration and token count
        </li>
      </ul>

      <h2>Import / Export</h2>
      <p>
        Workflows can be exported as JSON and re-imported later. This makes it easy to share
        workflows, version control them, or use community templates.
      </p>
      <p>
        You can also publish workflows as templates to the community library for others to fork and
        use.
      </p>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link to="/docs/node-types">Learn about each node type</Link>
        </li>
        <li>
          <Link to="/docs/mcp">Connect MCP tools to your agents</Link>
        </li>
      </ul>
    </div>
  );
}
