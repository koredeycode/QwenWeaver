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
        <li>A Linux VPS (Ubuntu/Debian recommended) with root or sudo access</li>
        <li>A DashScope API key (or other LLM provider key via MCP)</li>
      </ul>

      <h2>One-Command Installer</h2>
      <p>
        The fastest way to get started on a fresh server. It provisions everything automatically —
        Node.js, Docker, systemd service, and configuration.
      </p>
      <pre>
        <code>{`curl -fsSL https://get.${SITE.name.toLowerCase()}.io | sh`}</code>
      </pre>
      <p>You will be prompted to choose an install mode. Or pre-select one:</p>
      <pre>
        <code>{`# npm CLI mode (default)
curl -fsSL https://get.${SITE.name.toLowerCase()}.io | QWENWEAVER_INSTALL_MODE=npm sh

# Docker mode
curl -fsSL https://get.${SITE.name.toLowerCase()}.io | QWENWEAVER_INSTALL_MODE=docker sh

# Git source mode
curl -fsSL https://get.${SITE.name.toLowerCase()}.io | QWENWEAVER_INSTALL_MODE=git sh`}</code>
      </pre>

      <h2>Option A: npm CLI (Recommended)</h2>
      <p>Install the CLI tool globally and run via systemd. Best if you already have Node.js.</p>
      <pre>
        <code>{`# Install globally
npm install -g ${SITE.name.toLowerCase()}

# Initialize configuration
${SITE.name.toLowerCase()} init

# Start the server
${SITE.name.toLowerCase()} start`}</code>
      </pre>
      <p>
        The <code>init</code> command prompts for your DashScope API key, JWT secret, and database
        path. SQLite is used by default (zero configuration). The CLI is managed as a systemd
        service automatically when installed via the one-command script.
      </p>
      <p>To upgrade:</p>
      <pre>
        <code>{`npm update -g ${SITE.name.toLowerCase()}
sudo systemctl restart ${SITE.name.toLowerCase()}`}</code>
      </pre>

      <h2>Option B: Docker</h2>
      <p>Run the entire stack with a single Docker command:</p>
      <pre>
        <code>{`docker run -d \\
  --name ${SITE.name.toLowerCase()} \\
  -p 3001:3001 \\
  -v qw_data:/app/data \\
  -e DASHSCOPE_API_KEY=sk-... \\
  -e JWT_SECRET=$(openssl rand -hex 32) \\
  ghcr.io/${SITE.name.toLowerCase()}/${SITE.name.toLowerCase()}:latest`}</code>
      </pre>
      <p>
        The container serves both the API and the frontend SPA on port 3001. SQLite data persists in
        the <code>qw_data</code> volume.
      </p>
      <p>Or use the docker-compose.yml from the repository:</p>
      <pre>
        <code>{`# docker-compose.yml
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
      - PORT=3001`}</code>
      </pre>
      <p>To upgrade: pull the latest image and restart.</p>
      <pre>
        <code>{`docker compose pull
docker compose up -d`}</code>
      </pre>

      <h2>Option C: Git + systemd</h2>
      <p>
        Clone the repository, build from source, and manage via systemd. Best for developers who
        want to fork or modify the code.
      </p>
      <pre>
        <code>{`git clone https://github.com/${SITE.name.toLowerCase()}/${SITE.name.toLowerCase()}.git
cd ${SITE.name.toLowerCase()}
pnpm install
pnpm build
${SITE.name.toLowerCase()} start`}</code>
      </pre>
      <p>To upgrade:</p>
      <pre>
        <code>{`git fetch --ff-only origin main
git merge --ff-only origin/main
pnpm install && pnpm build
sudo systemctl restart ${SITE.name.toLowerCase()}`}</code>
      </pre>

      <h2>Self-Update</h2>
      <p>After initial setup, you can trigger updates from the admin UI or via the API:</p>
      <pre>
        <code>{`GET  /api/system/update    # Check for updates
POST /api/system/update    # Trigger update`}</code>
      </pre>
      <p>
        The update engine detects your install mode automatically and runs the appropriate commands
        (npm update, docker compose pull, or git merge + build).
      </p>

      <h2>Configuration</h2>
      <p>All configuration is via environment variables:</p>
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Description</th>
            <th>Default</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>PORT</code>
            </td>
            <td>HTTP port</td>
            <td>
              <code>3001</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>DATABASE_URL</code>
            </td>
            <td>SQLite path or Postgres URI</td>
            <td>
              <code>./data/qwenweaver.db</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>DASHSCOPE_API_KEY</code>
            </td>
            <td>Alibaba Cloud DashScope API key</td>
            <td>—</td>
          </tr>
          <tr>
            <td>
              <code>API_SECRET</code>
            </td>
            <td>Secret for signing JWT tokens</td>
            <td>—</td>
          </tr>
          <tr>
            <td>
              <code>CORS_ORIGINS</code>
            </td>
            <td>Comma-separated allowed origins</td>
            <td>
              <code>http://localhost:3001</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>PUBLIC_URL</code>
            </td>
            <td>Public-facing URL of the instance</td>
            <td>
              <code>http://localhost:3001</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>HOST</code>
            </td>
            <td>Bind address</td>
            <td>
              <code>0.0.0.0</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>LOG_LEVEL</code>
            </td>
            <td>Pino log level</td>
            <td>
              <code>info</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>INSTALL_MODE</code>
            </td>
            <td>Install mode (npm, docker, git)</td>
            <td>
              <code>npm</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>DISABLE_ANALYTICS</code>
            </td>
            <td>Disable telemetry</td>
            <td>
              <code>false</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Database</h2>
      <p>
        By default, {SITE.name} uses <strong>SQLite</strong> — no external database needed. For
        production, you can use <strong>PostgreSQL</strong> by setting <code>DATABASE_URL</code>
        to your Postgres connection URI.
      </p>

      <h2>Upgrading</h2>
      <p>
        You can trigger updates from the admin UI or via the API. The update system detects your
        install mode automatically:
      </p>
      <ul>
        <li>
          <strong>npm CLI:</strong> <code>npm update -g @qwenweaver/cli</code> + systemctl restart
        </li>
        <li>
          <strong>Docker:</strong> <code>docker compose pull && docker compose up -d</code>
        </li>
        <li>
          <strong>Git:</strong> <code>git pull --ff-only && pnpm install && pnpm build</code> +
          systemctl restart
        </li>
      </ul>
      <p>Migrations run automatically on startup.</p>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link to="/docs/workflow-guide">Learn how to build workflows</Link>
        </li>
        <li>
          <Link to="/docs/mcp">Connect MCP servers</Link>
        </li>
        <li>
          <Link to="/docs/api">API Reference</Link>
        </li>
      </ul>
    </div>
  );
}
