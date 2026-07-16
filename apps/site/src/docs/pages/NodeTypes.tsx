import { Link } from 'react-router-dom';

const nodeTypes = [
  {
    name: 'Trigger Node',
    type: 'trigger',
    description: 'Entry point for the workflow. Passes user input to downstream nodes.',
    model: 'None (passthrough)',
    config: 'Label, input schema',
  },
  {
    name: 'Input Trigger Node',
    type: 'input_trigger',
    description: 'Like Trigger Node but allows custom input formatting and validation.',
    model: 'None (passthrough)',
    config: 'Label, input schema, validation rules',
  },
  {
    name: 'File Trigger Node',
    type: 'file_trigger',
    description:
      'Entry point that passes an uploaded file (image, audio, video) to downstream nodes.',
    model: 'qwen3.6-flash',
    config: 'Label, file upload, output format',
  },
  {
    name: 'Agent Node',
    type: 'agent',
    description:
      'An LLM-powered agent with a system prompt. Processes upstream data and generates output.',
    model: 'qwen3.7-max, qwen3.7-plus, or custom',
    config:
      'System prompt, model selection, temperature, thinking budget, output format, MCP tools',
  },
  {
    name: 'Supervisor Node',
    type: 'supervisor',
    description:
      'Reviews agent outputs and can reject them with feedback. Supports multi-round backtracking.',
    model: 'qwen3.7-max with thinking enabled',
    config: 'System prompt, thinking budget, max negotiation rounds',
  },
  {
    name: 'Debate Arena Node',
    type: 'debate_arena',
    description:
      'Multi-agent debate with configurable modes (debate, negotiation, consensus). Supports optional AI arbitrator with scoring.',
    model: 'qwen3.7-max (arbitrator)',
    config:
      'Mode (debate/negotiation/consensus), max rounds, has arbitrator, arbitrator model, scoring criteria, output format (verdict/transcript/score)',
  },
  {
    name: 'MCP Tool Node',
    type: 'mcp_tool',
    description: 'Connects to an MCP server and exposes its tools to the workflow.',
    model: 'None (tool execution)',
    config: 'MCP server URL or ID, tool selection, auth config (api_key, bearer, basic)',
  },
  {
    name: 'Logic Node',
    type: 'logic',
    description: 'Basic logic operations (routing, merging, conditional branching).',
    model: 'None',
    config: 'Operation type, conditions',
  },
];

export function NodeTypes() {
  return (
    <div>
      <h1>Node Types</h1>
      <p>QwenWeaver provides several node types. Each serves a distinct role in your workflow.</p>

      <table>
        <thead>
          <tr>
            <th>Node</th>
            <th>Type Identifier</th>
            <th>Description</th>
            <th>Default Model</th>
          </tr>
        </thead>
        <tbody>
          {nodeTypes.map((n) => (
            <tr key={n.type}>
              <td>
                <strong>{n.name}</strong>
              </td>
              <td>
                <code>{n.type}</code>
              </td>
              <td>{n.description}</td>
              <td>{n.model}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Agent Node Configuration</h2>
      <p>Each agent node can be customized:</p>
      <ul>
        <li>
          <strong>System Prompt</strong> — instructions that define the agent's behavior and role
        </li>
        <li>
          <strong>Model</strong> — choose from available LLM models (defaults to qwen3.7-plus)
        </li>
        <li>
          <strong>Enable Thinking</strong> — enables chain-of-thought reasoning (qwen3.7-max)
        </li>
        <li>
          <strong>Thinking Budget</strong> — max tokens allocated to reasoning (default: 4096)
        </li>
        <li>
          <strong>Output Format</strong> — markdown, html, json, csv, xml, yaml, plain text, image,
          audio, or video
        </li>
        <li>
          <strong>MCP Tools</strong> — attach tools from connected MCP servers
        </li>
      </ul>

      <h2>Supervisor Node Details</h2>
      <p>
        Supervisor nodes use <strong>qwen3.7-max with thinking enabled</strong> by default. During
        execution, if a supervisor's output contains <code>[REJECT]</code>, the engine:
      </p>
      <ol>
        <li>Pauses the current batch</li>
        <li>Appends the supervisor's feedback to the upstream agent's prompt</li>
        <li>Backtracks and re-executes from the rejected agent's batch</li>
      </ol>
      <p>
        This negotiation process continues up to <code>maxNegotiationRounds</code> (default: 3).
      </p>

      <h2>Debate Arena Details</h2>
      <p>
        Debate Arena nodes facilitate structured multi-agent debate. Upstream agents are
        participants. The arena supports three modes:
      </p>
      <ul>
        <li>
          <strong>Debate</strong> — participants argue their positions and address counterpoints
        </li>
        <li>
          <strong>Negotiation</strong> — participants find common ground and propose compromises
        </li>
        <li>
          <strong>Consensus</strong> — participants work toward a unified conclusion
        </li>
      </ul>
      <p>
        When <strong>hasArbitrator</strong> is enabled, the arena uses an impartial AI model to
        evaluate the debate and produce a verdict with optional scoring.
      </p>
      <p>Output format options:</p>
      <ul>
        <li>
          <strong>verdict</strong> — full transcript + arbitrator verdict + scores (default)
        </li>
        <li>
          <strong>transcript</strong> — raw debate transcript only
        </li>
        <li>
          <strong>score</strong> — numeric scores only
        </li>
      </ul>

      <h2>MCP Tool Node Details</h2>
      <p>
        MCP Tool nodes connect to a registered MCP server. Once connected, the server's tools are
        automatically discovered and injected into the agent's prompt. Supports:
      </p>
      <ul>
        <li>
          <strong>HTTP (Streamable)</strong> — remote MCP servers via HTTP
        </li>
        <li>
          <strong>Stdio</strong> — local processes (e.g., npx-based MCP servers)
        </li>
        <li>
          <strong>Auth</strong> — API key, Bearer token, or Basic auth (stored encrypted)
        </li>
      </ul>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link to="/docs/workflow-guide">Build your first workflow</Link>
        </li>
        <li>
          <Link to="/docs/mcp">Configure MCP servers</Link>
        </li>
      </ul>
    </div>
  );
}
