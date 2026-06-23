import { useRef, useEffect, useState } from 'react';

const features = [
  {
    title: 'Visual Workflow Canvas',
    desc: 'Drag, connect, and configure AI agents on an interactive graph. No coding required.',
    color: 'border-orange-400/40 group-hover:border-orange-400/70',
    badge: 'bg-orange-500',
    port: 'bg-orange-400',
  },
  {
    title: 'Multi-Agent Orchestration',
    desc: 'Chain agents, supervisors, and MCP tools in parallel. Kahn\'s Algorithm ensures optimal execution.',
    color: 'border-blue-400/40 group-hover:border-blue-400/70',
    badge: 'bg-blue-500',
    port: 'bg-blue-400',
  },
  {
    title: 'MCP Tool Integration',
    desc: 'Connect any MCP-compatible server. Your agents gain access to databases, APIs, and file systems.',
    color: 'border-orange-400/40 group-hover:border-orange-400/70',
    badge: 'bg-orange-500',
    port: 'bg-orange-400',
  },
  {
    title: 'Supervisor Negotiation',
    desc: 'Quality-control agents with supervisor nodes that review, reject, and request revisions automatically.',
    color: 'border-blue-400/40 group-hover:border-blue-400/70',
    badge: 'bg-blue-500',
    port: 'bg-blue-400',
  },
  {
    title: 'Real-Time Streaming',
    desc: 'Watch your workflow execute live with SSE streaming — token-by-token output, status updates, and edge animations.',
    color: 'border-orange-400/40 group-hover:border-orange-400/70',
    badge: 'bg-orange-500',
    port: 'bg-orange-400',
  },
  {
    title: 'Self-Host or Cloud',
    desc: 'Run on our cloud with free credits, or self-host with Docker/npm. Your data, your API keys, your control.',
    color: 'border-blue-400/40 group-hover:border-blue-400/70',
    badge: 'bg-blue-500',
    port: 'bg-blue-400',
  },
];

export function Home() {
  return (
    <div className="relative">
      <Hero />
      <Features />
      <CTA />
    </div>
  );
}

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-orange-500/5 blur-3xl animate-float-slow" />
      <div className="absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl animate-float-slower" />
      <div className="absolute -bottom-10 left-1/2 h-64 w-64 rounded-full bg-orange-500/3 blur-3xl animate-float-slow" />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative z-10 overflow-hidden border-b border-outline/40">
      <FloatingOrbs />
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
            </span>
            Built for Qwen Cloud Hackathon 2026
          </span>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl animate-slide-up">
            Orchestrate Multi-Agent
            <br />
            <span className="text-primary">Workflows Visually</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-on-surface-variant sm:text-xl animate-fade-in" style={{ animationDelay: '0.15s' }}>
            Design, execute, and monitor complex AI agent pipelines with a drag-and-drop canvas.
            Powered by Qwen, MCP, and parallel DAG execution.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <a
              href="/app"
              className="group relative inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-on-primary shadow-sm transition-all hover:shadow-lg hover:shadow-orange-500/20"
            >
              <span className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-orange-500 to-blue-500 opacity-0 blur transition-opacity group-hover:opacity-30" />
              <span className="relative">Try Cloud Free</span>
              <span className="relative inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </a>
            <a
              href="/self-hosted"
              className="inline-flex items-center gap-2 rounded-lg border border-outline/60 bg-surface-bright/80 px-6 py-3 text-base font-semibold text-on-surface backdrop-blur-sm transition-all hover:border-outline hover:bg-surface-dim hover:shadow-sm"
            >
              Self-Host
            </a>
          </div>

          <p className="mt-4 text-sm text-on-surface-variant animate-fade-in" style={{ animationDelay: '0.35s' }}>
            1000 free credits on signup <span className="mx-1.5 text-outline">·</span> No credit card required
          </p>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="h-5 w-5 text-on-surface-variant/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}

function Features() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string; delay: number }[]>([]);
  const [size, setSize] = useState({ w: 100, h: 100 });

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const update = () => {
      const cards = grid.querySelectorAll(':scope > [data-card]');
      const gridRect = grid.getBoundingClientRect();
      const w = gridRect.width;
      const h = gridRect.height;
      setSize({ w, h });

      if (cards.length < 6) return;

      const centers = Array.from(cards).map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left + r.width / 2 - gridRect.left, y: r.top + r.height / 2 - gridRect.top };
      });

      const cols = w >= 1024 ? 3 : w >= 640 ? 2 : 1;

      if (cols === 3 || cols === 2) {
        const rowLen = cols;
        const result: { x1: number; y1: number; x2: number; y2: number; color: string; delay: number }[] = [];
        let delay = 0;

        for (let row = 0; row < Math.ceil(cards.length / rowLen); row++) {
          for (let col = 0; col < rowLen - 1; col++) {
            const i = row * rowLen + col;
            const j = i + 1;
            if (j < cards.length) {
              result.push({ x1: centers[i].x, y1: centers[i].y, x2: centers[j].x, y2: centers[j].y, color: col % 2 === 0 ? '#ea580c' : '#2563eb', delay: delay++ * 0.08 });
            }
            if (row > 0) {
              const top = (row - 1) * rowLen + col;
              const bottom = row * rowLen + col;
              if (top < cards.length && bottom < cards.length) {
                result.push({ x1: centers[top].x, y1: centers[top].y, x2: centers[bottom].x, y2: centers[bottom].y, color: col % 2 === 0 ? '#ea580c' : '#2563eb', delay: delay++ * 0.08 });
              }
            }
          }
        }

        setLines(result);
      } else {
        setLines([]);
      }
    };

    const obs = new ResizeObserver(update);
    obs.observe(grid);
    const raf = requestAnimationFrame(update);

    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="relative z-10 py-24" id="features">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            Platform Features
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl animate-fade-in">
            Everything you need to build agent systems
          </h2>
          <p className="mt-4 text-lg text-on-surface-variant animate-fade-in" style={{ animationDelay: '0.1s' }}>
            From simple chains to complex multi-agent societies with supervisor oversight.
          </p>
        </div>

        <div ref={gridRef} className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 relative">
          <svg
            className="absolute inset-0 z-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${size.w} ${size.h}`}
            aria-hidden
          >
            <defs>
              <linearGradient id="edgeO" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ea580c" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ea580c" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="edgeB" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {lines.map((e, i) => (
              <g key={i}>
                <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.color} strokeWidth="3" strokeOpacity="0.2" className="animate-edge-pulse" style={{ animationDelay: `${e.delay}s` }} />
                <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.color} strokeWidth="3" strokeOpacity="0.5" strokeDasharray="8 12" className="animate-edge-flow" style={{ animationDelay: `${e.delay}s` }} />
              </g>
            ))}
          </svg>

          {features.map((f, i) => (
            <div
              key={f.title}
              data-card
              className={`group relative z-10 rounded-xl border-2 bg-surface-bright p-6 transition-all duration-300 hover:shadow-lg animate-slide-up ${f.color}`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className={`absolute top-4 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full ${f.badge} shadow-lg`}>
                <span className={`absolute inset-0 rounded-full animate-ping opacity-40 ${f.badge}`} style={{ animationDelay: `${i * 0.3}s` }} />
              </div>
              <div className={`absolute top-1/2 -left-1.5 -translate-y-1/2 h-3 w-3 rounded-full ${f.port} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className={`absolute top-1/2 -right-1.5 -translate-y-1/2 h-3 w-3 rounded-full ${f.port} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <h3 className="mt-4 text-center text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-center text-sm leading-relaxed text-on-surface-variant">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative z-10 border-t border-outline/40 bg-surface py-24 overflow-hidden">
      <FloatingOrbs />
      <div className="mx-auto max-w-7xl px-6 text-center relative">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl animate-fade-in">
          Ready to build your first agent workflow?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-on-surface-variant animate-fade-in" style={{ animationDelay: '0.1s' }}>
          Sign up free and get 1000 credits to start orchestrating. No credit card.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="relative">
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-500 to-blue-500 opacity-20 blur-xl animate-pulse-slow" />
            <a
              href="/app"
              className="relative inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-on-primary shadow-sm transition-all hover:shadow-lg hover:shadow-orange-500/20"
            >
              Get Started Free
              <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </a>
          </div>
          <a
            href="https://github.com/koredeycode/QwenWeaver"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-outline/60 bg-surface-bright/80 px-6 py-3 text-base font-semibold text-on-surface backdrop-blur-sm transition-all hover:border-outline hover:bg-surface-dim"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
