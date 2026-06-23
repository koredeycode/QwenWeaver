import { SITE } from '../config.js';

export function SelfHosted() {
  return (
    <>
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Self-Host {SITE.name}
            </h1>
            <p className="mt-4 text-lg text-on-surface-variant">
              Run the full platform on your own infrastructure. Your data, your API keys, your rules.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-outline/40 bg-surface-bright p-8">
              <h2 className="text-xl font-bold">Docker (Recommended)</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                One command to run the entire stack with SQLite persistence.
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
                Or use docker-compose.yml from the repository.
              </p>
            </div>

            <div className="rounded-xl border border-outline/40 bg-surface-bright p-8">
              <h2 className="text-xl font-bold">npm / pnpm CLI</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                No Docker? Run directly with Node.js via our CLI tool.
              </p>
              <pre className="mt-6 overflow-x-auto rounded-lg bg-[#0f172a] p-4 text-sm text-[#e2e8f0]">
                <code>{`# Install globally
npm install -g ${SITE.name.toLowerCase()}

# Initialize config
${SITE.name.toLowerCase()} init

# Start the server
${SITE.name.toLowerCase()} start`}</code>
              </pre>
              <p className="mt-4 text-xs text-on-surface-variant">
                Requires Node.js 20+. Uses SQLite by default (zero config).
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
  { title: 'Full Data Control', desc: 'All data stays on your infrastructure. No telemetry unless you opt in.' },
  { title: 'Your Own API Keys', desc: 'Bring your DashScope, OpenAI, or any LLM provider keys. No per-token markup.' },
  { title: 'Any Database', desc: 'SQLite for zero-config local use. PostgreSQL or MySQL for production deployments.' },
  { title: 'Offline Capable', desc: 'No internet dependency after initial setup. Run air-gapped if needed.' },
  { title: 'Custom Extensions', desc: 'Extend with custom MCP servers, private tools, and internal APIs.' },
  { title: 'Community Templates', desc: 'Browse and download templates from our community library.' },
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
            <div key={b.title} className="rounded-xl border border-outline/40 bg-surface-bright p-6">
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
  { key: 'JWT_SECRET', desc: 'Random string used to sign auth tokens. Generate with `openssl rand -hex 32`.' },
  { key: 'DATABASE_URL', desc: 'Path to SQLite file (default: ./data/qwenweaver.db) or PostgreSQL connection URI.' },
  { key: 'PORT', desc: 'HTTP port to listen on (default: 3001).' },
  { key: 'QWENWEAVER_MODE', desc: 'Set to "cloud" for SaaS features (credits, analytics). Default: self-hosted.' },
  { key: 'DISABLE_ANALYTICS', desc: 'Set to "true" to disable all PostHog telemetry.' },
  { key: 'MAX_FREE_WORKFLOWS', desc: 'Workflow limit per user. 0 = unlimited (default for self-hosted).' },
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
                    <code className="rounded bg-surface-dim px-2 py-0.5 font-mono text-xs text-primary">{v.key}</code>
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
