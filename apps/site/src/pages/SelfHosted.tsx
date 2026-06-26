import { SITE } from '../config.js';

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-orange-500/5 blur-3xl animate-float-slow" />
      <div className="absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl animate-float-slower" />
      <div className="absolute -bottom-10 left-1/2 h-64 w-64 rounded-full bg-orange-500/3 blur-3xl animate-float-slow" />
    </div>
  );
}

export function SelfHosted() {
  return (
    <>
      <section className="relative z-10 overflow-hidden border-b border-outline/40 py-24">
        <FloatingOrbs />
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Self-Hosted
            </span>
            <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl animate-slide-up">
              Run {SITE.name} on <span className="text-primary">your infrastructure</span>
            </h1>
            <p className="mt-4 text-lg text-on-surface-variant animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Your data, your API keys, your rules. Deploy in minutes with one command.
            </p>
          </div>

          <div className="mt-12 rounded-xl border border-primary/30 bg-primary/5 p-8 text-center animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <h2 className="text-xl font-bold">One-Command Install</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Provision a server with a single command. Works on any fresh Ubuntu/Debian VPS.
            </p>
            <div className="relative mt-6 inline-block">
              <pre className="overflow-x-auto rounded-lg bg-[#0f172a] px-6 py-4 text-sm text-[#e2e8f0] shadow-md">
                <code>{`curl -fsSL https://get.${SITE.name.toLowerCase()}.io | sh`}</code>
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(`curl -fsSL https://get.${SITE.name.toLowerCase()}.io | sh`)}
                className="absolute top-2 right-2 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                COPY
              </button>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant">
              Prompts for install mode (npm CLI, Docker, or Git). Or pre-select with{' '}
              <code className="rounded bg-surface-dim px-1.5 py-0.5 font-mono text-[10px]">
                QWENWEAVER_INSTALL_MODE=docker
              </code>
              .
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="group rounded-xl border border-outline/40 bg-surface-bright p-8 transition-all hover:border-outline hover:shadow-md">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">npm CLI</h2>
                <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-mono font-normal text-primary">Default</span>
              </div>
              <p className="mt-2 text-sm text-on-surface-variant">
                Run directly with Node.js via the global CLI.
              </p>
              <pre className="mt-6 overflow-x-auto rounded-lg bg-[#0f172a] p-4 text-sm text-[#e2e8f0] shadow-sm">
                <code>{`npm install -g ${SITE.name.toLowerCase()}
${SITE.name.toLowerCase()} init
${SITE.name.toLowerCase()} start`}</code>
              </pre>
              <p className="mt-4 text-xs text-on-surface-variant">
                Requires Node.js 20+. Managed via systemd. Uses SQLite by default.
              </p>
            </div>

            <div className="group rounded-xl border border-outline/40 bg-surface-bright p-8 transition-all hover:border-outline hover:shadow-md">
              <h2 className="text-xl font-bold">Docker</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Containerized deployment with docker-compose.
              </p>
              <pre className="mt-6 overflow-x-auto rounded-lg bg-[#0f172a] p-4 text-sm text-[#e2e8f0] shadow-sm">
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

            <div className="group rounded-xl border border-outline/40 bg-surface-bright p-8 transition-all hover:border-outline hover:shadow-md">
              <h2 className="text-xl font-bold">Git + systemd</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Clone, build from source, and run via systemd.
              </p>
              <pre className="mt-6 overflow-x-auto rounded-lg bg-[#0f172a] p-4 text-sm text-[#e2e8f0] shadow-sm">
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
    icon: (
      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Your Own API Keys',
    desc: 'Bring your DashScope, OpenAI, or any LLM provider keys. No per-token markup.',
    icon: (
      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    title: 'Any Database',
    desc: 'SQLite for zero-config local use. PostgreSQL or MySQL for production deployments.',
    icon: (
      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
        <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      </svg>
    ),
  },
  {
    title: 'Offline Capable',
    desc: 'No internet dependency after initial setup. Run air-gapped if needed.',
    icon: (
      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 010-1.414" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      </svg>
    ),
  },
  {
    title: 'Custom Extensions',
    desc: 'Extend with custom MCP servers, private tools, and internal APIs.',
    icon: (
      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
  },
  {
    title: 'Community Templates',
    desc: 'Browse and download templates from our community library.',
    icon: (
      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
];

function Benefits() {
  return (
    <section className="relative z-10 border-t border-outline/40 bg-surface py-24 overflow-hidden">
      <FloatingOrbs />
      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
            Why Self-Host?
          </span>
          <h2 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
            Your data, your <span className="text-primary">rules</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b, i) => (
            <div
              key={b.title}
              className="group rounded-xl border border-outline/40 bg-surface-bright p-6 transition-all hover:border-outline hover:shadow-md hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 text-primary shadow-sm border border-orange-200/50">
                {b.icon}
              </div>
              <h3 className="mt-4 font-semibold">{b.title}</h3>
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
    <section className="relative z-10 py-24 overflow-hidden">
      <FloatingOrbs />
      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Configuration
          </span>
          <h2 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
            Environment <span className="text-primary">reference</span>
          </h2>
        </div>
        <div className="mt-12 overflow-x-auto rounded-xl border border-outline/40 bg-surface-bright shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-outline/40 bg-surface-dim/50">
                <th className="px-6 py-4 font-semibold text-on-surface">Variable</th>
                <th className="px-6 py-4 font-semibold text-on-surface">Description</th>
              </tr>
            </thead>
            <tbody>
              {envVars.map((v) => (
                <tr key={v.key} className="border-b border-outline/20 last:border-0 hover:bg-surface-dim/30 transition-colors">
                  <td className="px-6 py-4">
                    <code className="rounded bg-surface-dim px-2 py-1 font-mono text-xs text-primary">
                      {v.key}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{v.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
