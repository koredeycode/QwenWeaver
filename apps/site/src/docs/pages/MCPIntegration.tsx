import { Link } from 'react-router-dom';

export function MCPIntegration() {
  return (
    <div>
      <h1>MCP Integration</h1>
      <p>
        The Model Context Protocol (MCP) lets you connect external tools and data sources to your AI
        agents. QwenWeaver uses <code>@modelcontextprotocol/sdk</code> for transport and tool
        discovery.
      </p>

      <h2>How It Works</h2>
      <ol>
        <li>You register an MCP server (HTTP or stdio transport)</li>
        <li>
          QwenWeaver discovers available tools via the MCP <code>listTools</code> request
        </li>
        <li>Tools are injected into the agent's prompt as available functions</li>
        <li>During execution, the agent can call tools — results are passed back as context</li>
      </ol>

      <h2>Adding an MCP Server</h2>
      <p>In the workflow editor:</p>
      <ol>
        <li>Open the MCP panel from the toolbar</li>
        <li>
          Click <strong>Add Server</strong>
        </li>
        <li>
          Choose transport type:
          <ul>
            <li>
              <strong>HTTP</strong> — provide the server URL (e.g.,{' '}
              <code>http://localhost:3002/mcp</code>)
            </li>
            <li>
              <strong>Stdio</strong> — provide the command and args (e.g.,{' '}
              <code>npx @anthropic/mcp-server-filesystem</code>)
            </li>
          </ul>
        </li>
        <li>Configure auth if needed (API key, Bearer token, or Basic auth)</li>
        <li>
          Click <strong>Discover Tools</strong> to verify the connection
        </li>
      </ol>

      <h2>Using MCP Tools in Agents</h2>
      <p>
        After registering a server, you attach its tools to individual Agent nodes via the inspector
        panel. Multiple tools from multiple servers can be attached to a single agent.
      </p>

      <h2>MCP Server Lifecycle</h2>
      <ul>
        <li>
          Servers are initialized lazily — the client connects only when the workflow executes
        </li>
        <li>Tools are cached per execution; re-discovery happens on each run</li>
        <li>Connections are cleaned up after execution completes</li>
      </ul>

      <h2>Security Notes</h2>
      <ul>
        <li>MCP servers have access to whatever the agent's prompt context includes</li>

        <li>Auth credentials are stored encrypted in the database</li>
      </ul>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link to="/docs/node-types">Learn about MCP Tool nodes</Link>
        </li>
        <li>
          <Link to="/docs/workflow-guide">Build a workflow with MCP tools</Link>
        </li>
      </ul>
    </div>
  );
}
