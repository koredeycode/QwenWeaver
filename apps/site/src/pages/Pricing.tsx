import { URLS } from '../config.js';
import { FloatingOrbs } from '../components/FloatingOrbs.js';

const features = [
  'Visual workflow canvas',
  'All node types (agent, supervisor, MCP, trigger)',
  'MCP tool integration',
  'Community template library',
  'Real-time SSE streaming',
  'Basic analytics',
];

export function Pricing() {
  return (
    <section className="relative z-10 overflow-hidden py-24">
      <FloatingOrbs />
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Pricing
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl animate-slide-up">
            Free while in <span className="text-primary">beta</span>
          </h1>
          <p
            className="mt-4 text-lg text-on-surface-variant animate-fade-in"
            style={{ animationDelay: '0.1s' }}
          >
            No credit card required. Use credits to execute workflows.
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-md">
          <div className="relative flex flex-col rounded-2xl border border-outline/40 bg-surface-bright p-8 animate-slide-up shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold">Free</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight">$0</span>
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">5,000 free credits on signup</p>
            <p className="text-sm text-on-surface-variant">2 active workflows</p>

            <ul className="mt-8 space-y-3" role="list">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <svg
                    className="h-4 w-4 shrink-0 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={URLS.app}
              className="mt-8 block rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-on-primary transition-all hover:bg-primary-container shadow-sm hover:shadow-md"
            >
              Get Started Free
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
