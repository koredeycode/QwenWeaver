import { URLS } from '../config.js';

const features = [
  {
    title: 'Visual Workflow Canvas',
    desc: 'Drag, connect, and configure AI agents on an interactive graph. No coding required.',
    icon: '◈',
  },
  {
    title: 'Multi-Agent Orchestration',
    desc: 'Chain agents, supervisors, and MCP tools in parallel. Kahn\'s Algorithm ensures optimal execution.',
    icon: '⬡',
  },
  {
    title: 'MCP Tool Integration',
    desc: 'Connect any MCP-compatible server. Your agents gain access to databases, APIs, and file systems.',
    icon: '⚙',
  },
  {
    title: 'Supervisor Negotiation',
    desc: 'Quality-control agents with supervisor nodes that review, reject, and request revisions automatically.',
    icon: '◎',
  },
  {
    title: 'Real-Time Streaming',
    desc: 'Watch your workflow execute live with SSE streaming — token-by-token output, status updates, and edge animations.',
    icon: '▸',
  },
  {
    title: 'Self-Host or Cloud',
    desc: 'Run on our cloud with free credits, or self-host with Docker/npm. Your data, your API keys, your control.',
    icon: '☰',
  },
];

export function Home() {
  return (
    <>
      <Hero />
      <Features />
      <CTA />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-outline/40">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim px-3 py-1 text-xs font-medium text-on-surface-variant">
            Built for Qwen Cloud Hackathon 2026
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Orchestrate Multi-Agent
            <span className="text-primary"> Workflows</span> Visually
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-on-surface-variant sm:text-xl">
            Design, execute, and monitor complex AI agent pipelines with a drag-and-drop canvas.
            Powered by Qwen, MCP, and parallel DAG execution.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={URLS.app}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-on-primary shadow-sm transition-all hover:bg-primary-container hover:shadow-md"
            >
              Try Cloud Free
            </a>
            <a
              href="/self-hosted"
              className="inline-flex items-center gap-2 rounded-lg border border-outline/60 bg-surface-bright px-6 py-3 text-base font-semibold text-on-surface transition-all hover:bg-surface-dim"
            >
              Self-Host
            </a>
          </div>
          <p className="mt-4 text-sm text-on-surface-variant">
            1000 free credits on signup &middot; No credit card required
          </p>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="py-24" id="features">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to build agent systems
          </h2>
          <p className="mt-4 text-lg text-on-surface-variant">
            From simple chains to complex multi-agent societies with supervisor oversight.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-outline/40 bg-surface-bright p-6 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-dim text-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                {f.icon}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="border-t border-outline/40 bg-surface py-24">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to build your first agent workflow?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-on-surface-variant">
          Sign up free and get 1000 credits to start orchestrating. No credit card.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href={URLS.app}
            className="rounded-lg bg-primary px-6 py-3 text-base font-semibold text-on-primary shadow-sm transition-all hover:bg-primary-container hover:shadow-md"
          >
            Get Started Free
          </a>
          <a
            href={URLS.github}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-outline/60 bg-surface-bright px-6 py-3 text-base font-semibold text-on-surface transition-all hover:bg-surface-dim"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
