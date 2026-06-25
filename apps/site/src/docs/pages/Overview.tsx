import { Link } from 'react-router-dom';
import { URLS } from '../../config.js';

export function Overview() {
  return (
    <div>
      <h1>QwenWeaver Documentation</h1>
      <p>
        QwenWeaver is a visual multi-agent orchestration platform. Design, execute, and monitor
        complex AI agent pipelines with a drag-and-drop canvas — powered by Qwen, MCP, and parallel
        DAG execution.
      </p>

      <h2>Quick Links</h2>
      <ul>
        <li>
          <Link to="/docs/getting-started">Cloud Quickstart</Link> — sign up and run your first
          workflow in minutes
        </li>
        <li>
          <Link to="/docs/self-hosted">Self-Hosted Guide</Link> — deploy with Docker or npm CLI
        </li>
        <li>
          <Link to="/docs/workflow-guide">Building Workflows</Link> — understand the DAG editor
        </li>
        <li>
          <Link to="/docs/node-types">Node Types</Link> — reference for all available nodes
        </li>
        <li>
          <Link to="/docs/mcp">MCP Integration</Link> — connect external tools via MCP
        </li>
      </ul>

      <h2>What is QwenWeaver?</h2>
      <p>
        QwenWeaver lets you visually compose multi-agent workflows on an interactive graph canvas.
        Each node is an agent, a supervisor, or a tool connector. Edges define data flow. The engine
        compiles the graph using Kahn's Algorithm, executes independent branches in parallel, and
        streams results in real-time via SSE.
      </p>

      <h2>Key Concepts</h2>
      <table>
        <thead>
          <tr>
            <th>Concept</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Workflow</td>
            <td>A directed acyclic graph (DAG) of nodes and edges</td>
          </tr>
          <tr>
            <td>Agent Node</td>
            <td>An LLM-powered agent with a system prompt and model config</td>
          </tr>
          <tr>
            <td>Supervisor Node</td>
            <td>Reviews agent outputs, can reject and request revisions</td>
          </tr>
          <tr>
            <td>MCP Tool Node</td>
            <td>Connects to an external MCP server for tool access</td>
          </tr>
          <tr>
            <td>Trigger Node</td>
            <td>Entry point — passes user input into the workflow</td>
          </tr>
          <tr>
            <td>Execution</td>
            <td>A single run of a workflow, streamed live to the canvas</td>
          </tr>
        </tbody>
      </table>

      <h2>Deployment Options</h2>
      <p>
        <strong>Cloud:</strong> Use our hosted version at <a href={URLS.app}>{URLS.app}</a>. 1000
        free credits on signup, no credit card required.
      </p>
      <p>
        <strong>Self-Hosted:</strong> Run the full platform on your own infrastructure via Docker or
        npm CLI. Use your own API keys and database. <Link to="/docs/self-hosted">Learn more.</Link>
      </p>
    </div>
  );
}
