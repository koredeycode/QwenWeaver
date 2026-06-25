import { SITE } from '../config.js';

export function SelfHosted() {
  return (
    <>
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Self-Host {SITE.name}</h1>
            <p className="mt-4 text-lg text-on-surface-variant">
              Run the full platform on your own infrastructure. Your data, your API keys, your
              rules.
            </p>
          </div>

          {/* One-command installer */}
          <div className="mb-12 rounded-xl border border-primary/30 bg-primary/5 p-8 text-center">
            <h2 className="text-xl font-bold">One-Command Install</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Provision a server with a single command. Works on any fresh Ubuntu/Debian VPS.
            </p>
            <pre className="mt-6 inline-block overflow-x-auto rounded-lg bg-[#0f172a] px-6 py-4 text-sm text-[#e2e8f0]">
              <code>{`curl -fsSL https://get.${SITE.name.toLowerCase()}.io | sh`}</code>
            </pre>
            <p className="mt-3 text-xs text-on-surface-variant">
              Prompts for install mode (npm CLI, Docker, or Git). Or pre-select with
              <code className="ml-1 rounded bg-surface-dim px-1.5 py-0.5 font-mono text-[10px]">
                QWENWEAVER_INSTALL_MODE=docker
              </code>
              .
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="rounded-xl border border-outline/40 bg-surface-bright p-8">
              <h2 className="text-xl font-bold">
                npm CLI{' '}
                <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-normal text-primary">
                  Default
                </span>
              </h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Run directly with Node.js via the global CLI.
              </p>
              <pre className="mt-6 overflow-x-auto rounded-lg bg-[#0f172a] p-4 text-sm text-[#e2e8f0]">
                <code>{`npm install -g ${SITE.name.toLowerCase()}
${SITE.name.toLowerCase()} init
${SITE.name.toLowerCase()} start`}</code>
              </pre>
              <p className="mt-4 text-xs text-on-surface-variant">
                Requires Node.js 20+. Managed via systemd. Uses SQLite by default.
              </p>
            </div>

            <div className="rounded-xl border border-outline/40 bg-surface-bright p-8">
              <h2 className="text-xl font-bold">Docker</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Containerized deployment with docker-compose.
              </p>
              <pre className="mt-6 overflow-x-auto rounded-lg bg-[#0f172a] p-4 text-sm text-[#e2e8f0]">
                <code>{`docker run -d \\
  --name ${SITE.name.toLowerCase()} \\
  -p 3001:3001 \\
  -v qw_data:/app/data \\
  -e DASHSCOPE_API_KEY=sk-... \\
  -e JWT_SECRET=$(openssl rand -hex 32) \\
  ghcr.io/${SITE.name.toLowerCase()}/${SITE.name.toLowerCase()}:latest`}</code>
              </pre>
              <p className="mt-4 text-xs text-on-surface-variant">
                Or use <code>docker-compose.yml</code> from the repository.
              </p>
            </div>

            <div className="rounded-xl border border-outline/40 bg-surface-bright p-8">
              <h2 className="text-xl font-bold">Git + systemd</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Clone, build from source, and run via systemd.
              </p>
              <pre className="mt-6 overflow-x-auto rounded-lg bg-[#0f172a] p-4 text-sm text-[#e2e8f0]">
                <code>{`# Via installer:
# Choose option 3 (Git)

# Or manually:
git clone https://github.com/${SITE.name.toLowerCase()}/${SITE.name.toLowerCase()}.git
cd ${SITE.name.toLowerCase()}
pnpm install && pnpm build
${SITE.name.toLowerCase()} start`}</code>
              </pre>
              <p className="mt-4 text-xs text-on-surface-variant">
                Best for developers who want to fork and modify.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Benefits />
      <EnvironmentVars />
    </>
  );
}

const benefits = [
  {
    title: 'Full Data Control',
    desc: 'All data stays on your infrastructure. No telemetry unless you opt in.',
  },
  {
    title: 'Your Own API Keys',
    desc: 'Bring your DashScope, OpenAI, or any LLM provider keys. No per-token markup.',
  },
  {
    title: 'Any Database',
    desc: 'SQLite for zero-config local use. PostgreSQL or MySQL for production deployments.',
  },
  {
    title: 'Offline Capable',
    desc: 'No internet dependency after initial setup. Run air-gapped if needed.',
  },
  {
    title: 'Custom Extensions',
    desc: 'Extend with custom MCP servers, private tools, and internal APIs.',
  },
  {
    title: 'Community Templates',
    desc: 'Browse and download templates from our community library.',
  },
];

function Benefits() {
  return (
    <section className="border-t border-outline/40 bg-surface py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Why Self-Host?
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-xl border border-outline/40 bg-surface-bright p-6"
            >
              <h3 className="font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const envVars = [
  { key: 'DASHSCOPE_API_KEY', desc: 'Your Alibaba Cloud DashScope API key for LLM access.' },
  {
    key: 'JWT_SECRET',
    desc: 'Random string used to sign auth tokens. Generate with `openssl rand -hex 32`.',
  },
  {
    key: 'DATABASE_URL',
    desc: 'Path to SQLite file (default: ./data/qwenweaver.db) or PostgreSQL connection URI.',
  },
  { key: 'PORT', desc: 'HTTP port to listen on (default: 3001).' },
  {
    key: 'QWENWEAVER_MODE',
    desc: 'Set to "cloud" for SaaS features (credits, analytics). Default: self-hosted.',
  },
  { key: 'DISABLE_ANALYTICS', desc: 'Set to "true" to disable all PostHog telemetry.' },
  {
    key: 'MAX_FREE_WORKFLOWS',
    desc: 'Workflow limit per user. 0 = unlimited (default for self-hosted).',
  },
];

function EnvironmentVars() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Configuration Reference
        </h2>
        <div className="mt-12 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-outline/40">
                <th className="pb-3 pr-6 font-semibold">Variable</th>
                <th className="pb-3 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {envVars.map((v) => (
                <tr key={v.key} className="border-b border-outline/20">
                  <td className="py-3 pr-6">
                    <code className="rounded bg-surface-dim px-2 py-0.5 font-mono text-xs text-primary">
                      {v.key}
                    </code>
                  </td>
                  <td className="py-3 text-on-surface-variant">{v.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
