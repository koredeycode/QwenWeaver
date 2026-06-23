import { URLS } from '../config.js';

const freePlan = {
  name: 'Free',
  price: '$0',
  credits: '1,000 free credits on signup',
  workflows: '2 workflows',
  features: [
    'Visual workflow canvas',
    'All node types (agent, supervisor, MCP, trigger)',
    'MCP tool integration',
    'Community template library',
    'Real-time SSE streaming',
    'Basic analytics',
  ],
  cta: 'Get Started Free',
  href: URLS.app,
};

export function Pricing() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Free While in Beta</h1>
          <p className="mt-4 text-lg text-on-surface-variant">
            No credit card required. Use credits to execute workflows, or self-host for unlimited usage.
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-md">
          <div className="relative flex flex-col rounded-2xl border border-outline/40 bg-surface-bright p-8">
            <h3 className="text-lg font-semibold">{freePlan.name}</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight">{freePlan.price}</span>
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">{freePlan.credits}</p>
            <p className="text-sm text-on-surface-variant">{freePlan.workflows}</p>

            <ul className="mt-8 space-y-3" role="list">
              {freePlan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <span className="text-primary">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={freePlan.href}
              className="mt-8 block rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-on-primary transition-all hover:bg-primary-container"
            >
              {freePlan.cta}
            </a>

            <p className="mt-4 text-center text-xs text-on-surface-variant">
              Self-hosted users manage their own API keys and database — no credits needed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
