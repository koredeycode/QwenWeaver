import { SITE, URLS } from '../../config.js';
import { Link } from 'react-router-dom';

export function APIReference() {
  return (
    <div>
      <h1>API Reference</h1>
      <p>
        {SITE.name} exposes a REST API at <code>/api</code>. The API is built with Hono.js and
        documented via OpenAPI 3.1. Swagger UI is available at <code>/api/docs</code>.
      </p>

      <h2>Base URL</h2>
      <table>
        <thead>
          <tr>
            <th>Environment</th>
            <th>Base URL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cloud</td>
            <td>
              <code>{URLS.app}/api</code>
            </td>
          </tr>
          <tr>
            <td>Self-Hosted</td>
            <td>
              <code>http://localhost:3001/api</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Authentication</h2>
      <p>
        Most endpoints require a JWT access token in the <code>Authorization</code> header:
      </p>
      <pre>
        <code>Authorization: Bearer &lt;token&gt;</code>
      </pre>
      <p>
        Tokens are obtained via <code>POST /api/auth/login</code> or{' '}
        <code>POST /api/auth/register</code>.
      </p>

      <h2>Endpoints</h2>

      <h3>Auth</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Auth</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>POST</td>
            <td>
              <code>/api/auth/register</code>
            </td>
            <td>No</td>
            <td>Create account</td>
          </tr>
          <tr>
            <td>POST</td>
            <td>
              <code>/api/auth/login</code>
            </td>
            <td>No</td>
            <td>Login, returns JWT + refresh token</td>
          </tr>
          <tr>
            <td>POST</td>
            <td>
              <code>/api/auth/refresh</code>
            </td>
            <td>No</td>
            <td>Refresh access token</td>
          </tr>
        </tbody>
      </table>

      <h3>Workflow Execution</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Auth</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>POST</td>
            <td>
              <code>/api/workflow/execute</code>
            </td>
            <td>JWT</td>
            <td>Execute a workflow DAG</td>
          </tr>
          <tr>
            <td>GET</td>
            <td>
              <code>
                /api/workflow/{'{'}id{'}'}/stream
              </code>
            </td>
            <td>JWT</td>
            <td>SSE stream for execution</td>
          </tr>
          <tr>
            <td>GET</td>
            <td>
              <code>
                /api/workflow/{'{'}id{'}'}
              </code>
            </td>
            <td>JWT</td>
            <td>Get execution status</td>
          </tr>
        </tbody>
      </table>

      <h3>Workspace (Blackboard)</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Auth</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GET</td>
            <td>
              <code>
                /api/workspace/{'{'}executionId{'}'}
              </code>
            </td>
            <td>JWT</td>
            <td>List workspace entries</td>
          </tr>
          <tr>
            <td>POST</td>
            <td>
              <code>
                /api/workspace/{'{'}executionId{'}'}
              </code>
            </td>
            <td>JWT</td>
            <td>Write workspace entry</td>
          </tr>
        </tbody>
      </table>

      <h3>Templates</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Auth</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GET</td>
            <td>
              <code>/api/templates</code>
            </td>
            <td>No</td>
            <td>List public templates</td>
          </tr>
          <tr>
            <td>GET</td>
            <td>
              <code>
                /api/templates/{'{'}id{'}'}
              </code>
            </td>
            <td>No</td>
            <td>Get template details</td>
          </tr>
          <tr>
            <td>POST</td>
            <td>
              <code>/api/templates</code>
            </td>
            <td>JWT</td>
            <td>Publish a template (cloud only)</td>
          </tr>
          <tr>
            <td>POST</td>
            <td>
              <code>
                /api/templates/{'{'}id{'}'}/fork
              </code>
            </td>
            <td>JWT</td>
            <td>Copy template to your workflows</td>
          </tr>
        </tbody>
      </table>

      <h3>MCP Servers</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Auth</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GET</td>
            <td>
              <code>/api/mcp/tools</code>
            </td>
            <td>JWT</td>
            <td>Discover MCP server tools</td>
          </tr>
          <tr>
            <td>POST</td>
            <td>
              <code>/api/mcp/servers</code>
            </td>
            <td>JWT</td>
            <td>Save MCP server config</td>
          </tr>
          <tr>
            <td>GET</td>
            <td>
              <code>/api/mcp/servers</code>
            </td>
            <td>JWT</td>
            <td>List saved servers</td>
          </tr>
          <tr>
            <td>DELETE</td>
            <td>
              <code>
                /api/mcp/servers/{'{'}id{'}'}
              </code>
            </td>
            <td>JWT</td>
            <td>Delete server config</td>
          </tr>
        </tbody>
      </table>

      <h3>Analytics (Cloud Only)</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Auth</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GET</td>
            <td>
              <code>/api/analytics</code>
            </td>
            <td>JWT</td>
            <td>Execution analytics summary</td>
          </tr>
        </tbody>
      </table>

      <h3>Other</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Auth</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GET</td>
            <td>
              <code>/api/health</code>
            </td>
            <td>No</td>
            <td>Health check + DB status</td>
          </tr>
          <tr>
            <td>GET</td>
            <td>
              <code>/api/docs</code>
            </td>
            <td>No</td>
            <td>Swagger UI</td>
          </tr>
          <tr>
            <td>GET</td>
            <td>
              <code>/api/openapi.json</code>
            </td>
            <td>No</td>
            <td>OpenAPI 3.1 spec</td>
          </tr>
          <tr>
            <td>GET</td>
            <td>
              <code>/api/metrics</code>
            </td>
            <td>Token</td>
            <td>Prometheus metrics (authenticated via METRICS_TOKEN)</td>
          </tr>
        </tbody>
      </table>

      <h3>Credentials</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Auth</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GET</td>
            <td>
              <code>/api/credentials</code>
            </td>
            <td>JWT</td>
            <td>List saved credentials</td>
          </tr>
          <tr>
            <td>POST</td>
            <td>
              <code>/api/credentials</code>
            </td>
            <td>JWT</td>
            <td>Save encrypted credential (API key, token, etc.)</td>
          </tr>
          <tr>
            <td>DELETE</td>
            <td>
              <code>
                /api/credentials/{'{'}id{'}'}
              </code>
            </td>
            <td>JWT</td>
            <td>Delete credential</td>
          </tr>
        </tbody>
      </table>

      <h2>SSE Events</h2>
      <p>The execution stream emits these events:</p>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Payload</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>token</code>
            </td>
            <td>
              <code>
                {'{'} nodeId, chunk {'}'}
              </code>
            </td>
            <td>Token-by-token output</td>
          </tr>
          <tr>
            <td>
              <code>thinking</code>
            </td>
            <td>
              <code>
                {'{'} nodeId, chunk {'}'}
              </code>
            </td>
            <td>Chain-of-thought reasoning tokens</td>
          </tr>
          <tr>
            <td>
              <code>status_update</code>
            </td>
            <td>
              <code>
                {'{'} nodeId, status, timestamp {'}'}
              </code>
            </td>
            <td>Node state change (pending → running → completed/failed)</td>
          </tr>
          <tr>
            <td>
              <code>edge_active</code>
            </td>
            <td>
              <code>
                {'{'} sourceId, targetId, timestamp {'}'}
              </code>
            </td>
            <td>Data flowing through edge</td>
          </tr>
          <tr>
            <td>
              <code>workspace_write</code>
            </td>
            <td>
              <code>
                {'{'} nodeId, key, valueType, timestamp {'}'}
              </code>
            </td>
            <td>Agent wrote to the shared workspace</td>
          </tr>
          <tr>
            <td>
              <code>bus_message</code>
            </td>
            <td>
              <code>
                {'{'} message {'}'}
              </code>
            </td>
            <td>Inter-agent bus message published</td>
          </tr>
          <tr>
            <td>
              <code>message</code>
            </td>
            <td>
              <code>
                {'{'} fromNodeId, toNodeId, content, round, channelId {'}'}
              </code>
            </td>
            <td>Conversation message exchange</td>
          </tr>
          <tr>
            <td>
              <code>debate_round</code>
            </td>
            <td>
              <code>
                {'{'} arenaId, round, statements, timestamp {'}'}
              </code>
            </td>
            <td>Debate arena round completed</td>
          </tr>
          <tr>
            <td>
              <code>debate_verdict</code>
            </td>
            <td>
              <code>
                {'{'} arenaId, verdict, scores, timestamp {'}'}
              </code>
            </td>
            <td>Debate arbitration verdict delivered</td>
          </tr>
          <tr>
            <td>
              <code>complete</code>
            </td>
            <td>
              <code>
                {'{'} executionId, metrics, timestamp {'}'}
              </code>
            </td>
            <td>Execution finished</td>
          </tr>
          <tr>
            <td>
              <code>error</code>
            </td>
            <td>
              <code>
                {'{'} message, nodeId?, timestamp {'}'}
              </code>
            </td>
            <td>Execution error</td>
          </tr>
        </tbody>
      </table>

      <h2>Rate Limiting</h2>
      <ul>
        <li>Auth endpoints: 20 requests per 15 minutes</li>
        <li>Copilot: 10 requests per minute</li>
        <li>General API: 120 requests per minute</li>
      </ul>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link to="/docs/architecture">Understand the architecture</Link>
        </li>
        <li>
          Visit <code>/api/docs</code> on your instance for the interactive Swagger UI
        </li>
      </ul>
    </div>
  );
}
