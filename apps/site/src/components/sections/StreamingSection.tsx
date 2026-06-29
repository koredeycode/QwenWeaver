import { Section } from '../Section.js';

export function StreamingSection() {
  return (
    <Section className="border-b border-outline/40">
      <div className="flex flex-col items-center gap-12 lg:flex-row-reverse lg:gap-16">
        <div className="flex-1 animate-slide-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            Real-Time
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Watch it <span className="text-secondary">execute live</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-on-surface-variant">
            See every step of your workflow as it happens. SSE streaming delivers token-by-token
            output, status updates, and animated edge highlights — in real time.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'Live token streaming from every agent',
              'Edge animations show active data flow',
              'Supervisor decisions displayed in real time',
              'Pause, resume, and inspect any node',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-on-surface-variant">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="relative rounded-xl border border-outline/40 bg-surface-bright p-4 shadow-md">
            <div className="flex items-center gap-2 border-b border-outline/20 pb-3 mb-3">
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                EXECUTING
              </span>
              <span className="text-[10px] font-mono text-slate-400 ml-auto">00:04:23</span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Web Trigger → completed
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Academic Searcher → completed (12 results)
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Patent Scanner → searching...
              </div>
              <div className="flex items-center gap-2 text-purple-500">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                SEC Filings MCP → awaiting request
              </div>
              <div className="mt-2 rounded bg-slate-50 p-2 text-slate-400 italic">
                &ldquo;Searching USPTO database for visual node orchestration systems...&rdquo;
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
