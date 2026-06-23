import { SITE } from '../../config.js';
import { Link } from 'react-router-dom';

export function SelfHostedGuide() {
  return (
    <div>
      <h1>Self-Hosted Guide</h1>
      <p>
        Run {SITE.name} entirely on your own infrastructure. Your data, your API keys, your rules.
      </p>

      <h2>Prerequisites</h2>
      <ul>
        <li>Node.js 20+ (for CLI) or Docker (for containerized deployment)</li>
        <li>A DashScope API key (or other LLM provider key via MCP)</li>
      </ul>

      <h2>Option A: Docker (Recommended)</h2>
      <p>Run the entire stack with a single Docker command:</p>
      <pre><code>{`docker run -d \\
  --name ${SITE.name.toLowerCase()} \\
  -p 3001:3001 \\
  -v qw_data:/app/data \\
  -e DASHSCOPE_API_KEY=sk-... \\
  -e JWT_SECRET=$(openssl rand -hex 32) \\
  ghcr.io/${SITE.name.toLowerCase()}/${SITE.name.toLowerCase()}:latest`}</code></pre>
      <p>
        The container serves both the API and the frontend SPA on port 3001.
        SQLite data persists in the <code>qw_data</code> volume.
      </p>
      <p>Or use docker-compose:</p>
      <pre><code>{`# docker-compose.yml
services:
  ${SITE.name.toLowerCase()}:
    image: ghcr.io/${SITE.name.toLowerCase()}/${SITE.name.toLowerCase()}:latest
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
    environment:
      - DASHSCOPE_API_KEY=\${DASHSCOPE_API_KEY}
      - JWT_SECRET=\${JWT_SECRET}
      - PORT=3001`}</code></pre>

      <h2>Option B: npm CLI</h2>
      <p>Install the CLI tool globally and run directly:</p>
      <pre><code>{`# Install globally
npm install -g ${SITE.name.toLowerCase()}

# Initialize configuration
${SITE.name.toLowerCase()} init

# Start the server
${SITE.name.toLowerCase()} start`}</code></pre>
      <p>
        The <code>init</code> command will prompt for your DashScope API key, JWT secret, and
        database path. SQLite is used by default (zero configuration).
      </p>

      <h2>Configuration</h2>
      <p>All configuration is via environment variables:</p>
      <table>
        <thead>
          <tr><th>Variable</th><th>Description</th><th>Default</th></tr>
        </thead>
        <tbody>
          <tr><td><code>PORT</code></td><td>HTTP port</td><td><code>3001</code></td></tr>
          <tr><td><code>DATABASE_URL</code></td><td>SQLite path or Postgres URI</td><td><code>./data/qwenweaver.db</code></td></tr>
          <tr><td><code>DASHSCOPE_API_KEY</code></td><td>Alibaba Cloud DashScope API key</td><td>—</td></tr>
          <tr><td><code>JWT_SECRET</code></td><td>Secret for signing auth tokens</td><td>—</td></tr>
          <tr><td><code>QWENWEAVER_MODE</code></td><td><code>cloud</code> or <code>self-hosted</code></td><td><code>self-hosted</code></td></tr>
          <tr><td><code>CORS_ORIGINS</code></td><td>Comma-separated allowed origins</td><td><code>http://localhost:5173</code></td></tr>
          <tr><td><code>DISABLE_ANALYTICS</code></td><td>Disable PostHog telemetry</td><td><code>false</code></td></tr>
          <tr><td><code>MAX_FREE_WORKFLOWS</code></td><td>Max workflows per user (0 = unlimited)</td><td><code>0</code></td></tr>
        </tbody>
      </table>

      <h2>Database</h2>
      <p>
        By default, {SITE.name} uses <strong>SQLite</strong> — no external database needed.
        For production, you can use <strong>PostgreSQL</strong> by setting <code>DATABASE_URL</code>
        to your Postgres connection URI.
      </p>

      <h2>Upgrading</h2>
      <p>
        For Docker: pull the latest image and restart. For CLI: re-install with
        <code>npm install -g {SITE.name.toLowerCase()}@latest</code>.
        Migrations run automatically on startup.
      </p>

      <h2>Next Steps</h2>
      <ul>
        <li><Link to="/docs/workflow-guide">Learn how to build workflows</Link></li>
        <li><Link to="/docs/mcp">Connect MCP servers</Link></li>
        <li><Link to="/docs/api">API Reference</Link></li>
      </ul>
    </div>
  );
}
