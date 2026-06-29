import { Section } from '../Section.js';

export function AiPromptSection() {
  return (
    <Section className="border-b border-outline/40">
      <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
        <div className="flex-1 animate-slide-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            Natural Language
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Describe. <span className="text-primary">Watch it build.</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-on-surface-variant">
            Just type what you want in plain English. QwenWeaver's AI interprets your intent and
            generates a complete multi-agent workflow — no dragging required.
          </p>
          <div className="mt-6 rounded-lg border border-outline/40 bg-surface-dim/60 p-4 font-mono text-sm">
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Prompt</span>
            </div>
            <p className="text-slate-600 italic">
              &ldquo;Search Google Scholar for the latest papers on multi-agent consensus, scan
              global patent databases, then synthesize findings with a supervisor review.&rdquo;
            </p>
            <div className="mt-3 flex items-center gap-2 text-green-600">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-medium">Workflow generated — 5 nodes, 5 edges</span>
            </div>
          </div>
        </div>
        <div className="flex-1 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="relative rounded-xl border border-outline/40 bg-surface-bright p-4 shadow-md">
            <div className="flex items-center gap-2 border-b border-outline/20 pb-2 mb-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="h-2 w-2 rounded-full bg-green-400" />
              </div>
              <span className="ml-2 text-[10px] font-mono text-slate-400">Generated Workflow</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs font-mono text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Trigger: Web Search
              </div>
              <div className="flex items-center gap-2 rounded border border-orange-200 bg-orange-50/50 px-3 py-2 text-xs font-mono text-orange-700">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Agent: Academic Searcher
              </div>
              <div className="flex items-center gap-2 rounded border border-orange-200 bg-orange-50/50 px-3 py-2 text-xs font-mono text-orange-700">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Agent: Patent Scanner
              </div>
              <div className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50/50 px-3 py-2 text-xs font-mono text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Supervisor: Consensus
              </div>
              <div className="flex items-center gap-2 rounded border border-purple-200 bg-purple-50/50 px-3 py-2 text-xs font-mono text-purple-700">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                MCP: SEC Filings
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
