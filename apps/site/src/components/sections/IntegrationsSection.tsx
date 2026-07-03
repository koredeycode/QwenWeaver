import { Section } from '../Section.js';
import { integrations } from '../../data/site-content.js';

export function IntegrationsSection() {
  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
          Integrations
        </span>
        <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl animate-fade-in">
          Connect anything with <span className="text-primary">MCP</span>
        </h2>
        <p
          className="mt-4 text-sm text-on-surface-variant animate-fade-in"
          style={{ animationDelay: '0.1s' }}
        >
          Model Context Protocol — connect any tool or API.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 animate-slide-up">
        {integrations.map((int, i) => (
          <div
            key={int.name}
            className="group rounded-xl border border-outline/30 bg-surface-bright px-4 py-5 text-center transition-all hover:border-outline hover:shadow-md hover:-translate-y-0.5"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-500 group-hover:text-primary transition-colors shadow-sm border border-outline/20">
              {int.icon}
            </div>
            <p className="mt-3 text-sm font-semibold text-on-surface">{int.name}</p>
            <p className="mt-0.5 text-[10px] font-mono text-on-surface-variant">{int.type}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
