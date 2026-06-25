import { URLS } from '../../config.js';
import { Link } from 'react-router-dom';

export function GettingStarted() {
  return (
    <div>
      <h1>Cloud Quickstart</h1>
      <p>Get up and running with QwenWeaver Cloud in under 5 minutes.</p>

      <h2>1. Sign Up</h2>
      <p>
        Go to <a href={URLS.app}>{URLS.app}</a> and create an account. You'll receive{' '}
        <strong>1,000 free credits</strong> instantly — no credit card required.
      </p>

      <h2>2. Create a Workflow</h2>
      <p>
        From the dashboard, click <strong>New Workflow</strong>. Give it a name and description.
        You'll be taken to the visual canvas.
      </p>
      <ul>
        <li>
          Drag a <strong>Trigger Node</strong> from the left sidebar onto the canvas
        </li>
        <li>
          Drag an <strong>Agent Node</strong> and connect it to the trigger
        </li>
        <li>Configure the agent's system prompt and model (defaults to qwen3-max)</li>
        <li>
          Optionally add a <strong>Supervisor Node</strong> to review outputs
        </li>
      </ul>

      <h2>3. Run the Workflow</h2>
      <p>
        Click <strong>Run</strong> in the toolbar. The execution will stream live:
      </p>
      <ul>
        <li>
          <strong>Token streaming</strong> — see output appear token-by-token
        </li>
        <li>
          <strong>Status updates</strong> — nodes glow orange while running, green on completion
        </li>
        <li>
          <strong>Edge animations</strong> — data flow visualized between nodes
        </li>
      </ul>

      <h2>4. View Results</h2>
      <p>After execution completes, you can:</p>
      <ul>
        <li>Click any node to see its full output and token usage</li>
        <li>View execution metrics (speedup, parallel efficiency, total tokens)</li>
        <li>Export the workflow as JSON</li>
      </ul>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link to="/docs/workflow-guide">Learn more about building workflows</Link>
        </li>
        <li>
          <Link to="/docs/node-types">Explore all node types</Link>
        </li>
        <li>
          <Link to="/docs/mcp">Connect MCP servers for tool access</Link>
        </li>
      </ul>
    </div>
  );
}
