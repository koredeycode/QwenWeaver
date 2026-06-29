import { Section } from '../Section.js';

export function SupervisorSection() {
  return (
    <Section className="border-b border-outline/40">
      <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
        <div className="flex-1 animate-slide-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            Quality Control
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Supervisor <span className="text-primary">negotiation</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-on-surface-variant">
            Supervisor agents review outputs from worker agents, request revisions when quality
            drops, and resolve conflicting results — all automatically.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50/50 px-4 py-3">
              <svg
                className="h-5 w-5 shrink-0 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-slate-700">
                Output meets quality threshold → approve
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50/50 px-4 py-3">
              <svg
                className="h-5 w-5 shrink-0 text-orange-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm text-slate-700">
                Conflicting outputs detected → request revision
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3">
              <svg
                className="h-5 w-5 shrink-0 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm text-slate-700">
                Supervisor uses Qwen3-Max with thinking budget
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="relative rounded-xl border border-outline/40 bg-surface-bright p-4 shadow-md">
            <div className="flex items-center gap-2 border-b border-outline/20 pb-3 mb-3">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-xs font-mono font-semibold text-slate-700">
                Consensus Supervisor
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="rounded bg-green-50 p-2 text-green-700">
                <span className="font-semibold">Academic Searcher</span>: Found 12 papers on
                multi-agent consensus
              </div>
              <div className="rounded bg-green-50 p-2 text-green-700">
                <span className="font-semibold">Patent Scanner</span>: Found 3 relevant patent
                families
              </div>
              <div className="rounded bg-orange-50 p-2 text-orange-700">
                <span className="font-semibold">⚠ Conflict</span>: Paper dates contradict patent
                priority claims
              </div>
              <div className="rounded bg-blue-50 p-2 text-blue-700">
                <span className="font-semibold">Supervisor</span>: Re-verify with cross-referenced
                sources
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
