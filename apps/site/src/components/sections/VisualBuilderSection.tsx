import { Section } from '../Section.js';
import { paletteTypes } from '../../data/site-content.js';

export function VisualBuilderSection() {
  return (
    <Section className="border-b border-outline/40">
      <div className="flex flex-col items-center gap-12 lg:flex-row-reverse lg:gap-16">
        <div className="flex-1 animate-slide-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            Visual Canvas
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Drag, drop, <span className="text-secondary">connect.</span>
          </h2>
          <ul className="mt-6 space-y-3">
            {[
              'All node types — trigger, agent, supervisor',
              'MCP tools — databases, APIs, files',
              'Conversation-mode edges',
              'Shared workspace blackboard',
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
          <div className="relative rounded-xl border border-outline/40 bg-surface-bright p-3 shadow-md">
            <div className="flex items-center gap-2 border-b border-outline/20 pb-2 mb-2">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                Nodes
              </span>
              <div className="flex gap-1 ml-2">
                {paletteTypes.map((t) => (
                  <span
                    key={t.label}
                    className={`rounded border border-${t.color}-200 bg-${t.color}-50/50 px-2 py-0.5 text-[8px] font-mono text-${t.color}-700 cursor-grab active:cursor-grabbing`}
                  >
                    + {t.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative h-52 rounded-lg border border-dashed border-outline/30 bg-surface-dim/20 overflow-hidden">
              <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
                <defs>
                  <pattern id="builder-grid" width="16" height="16" patternUnits="userSpaceOnUse">
                    <circle cx="8" cy="8" r="0.6" fill="#94a3b8" opacity="0.25" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#builder-grid)" />
              </svg>

              <div className="absolute left-0 top-0 bottom-0 w-24 border-r border-outline/20 bg-surface-dim/40 p-2 space-y-1.5">
                {paletteTypes.map((t) => (
                  <div
                    key={t.label}
                    className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-[9px] font-mono border border-${t.color}-200 bg-white cursor-grab active:cursor-grabbing shadow-sm hover:shadow transition-shadow`}
                  >
                    <span className={`h-2 w-2 rounded-full bg-${t.color}-500`} />
                    {t.label}
                  </div>
                ))}
              </div>

              <div className="absolute left-28 top-4 right-4 bottom-4">
                <div className="absolute top-0 left-0 w-24 h-9 rounded border border-emerald-300 bg-white shadow-sm flex items-center justify-center">
                  <span className="text-[8px] font-mono text-emerald-600 font-bold">TRIGGER</span>
                </div>
                <svg
                  className="absolute top-4 left-24 w-12 h-4 text-slate-300"
                  viewBox="0 0 40 8"
                  fill="none"
                >
                  <path d="M2 4h36" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  <circle cx="38" cy="4" r="3" fill="#10b981" />
                </svg>

                <div className="absolute top-0 right-0 w-28 h-9 rounded border border-blue-300 bg-white shadow-sm flex items-center justify-center">
                  <span className="text-[8px] font-mono text-blue-600 font-bold">SUPERVISOR</span>
                </div>

                <svg
                  className="absolute top-4 right-28 w-12 h-4 text-slate-300 rotate-180"
                  viewBox="0 0 40 8"
                  fill="none"
                >
                  <path d="M2 4h36" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  <circle cx="38" cy="4" r="3" fill="#2563eb" />
                </svg>

                <div className="absolute bottom-0 left-0 w-24 h-9 rounded border border-orange-300 bg-white shadow-sm flex items-center justify-center">
                  <span className="text-[8px] font-mono text-orange-600 font-bold">AGENT</span>
                </div>

                <svg
                  className="absolute bottom-4 left-24 w-16 h-4 text-slate-300"
                  viewBox="0 0 60 8"
                  fill="none"
                >
                  <path
                    d="M2 4h52c3 0 4 2 4 2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <circle cx="2" cy="4" r="3" fill="#f97316" />
                </svg>

                <div className="absolute bottom-0 right-8 w-16 h-7 rounded border border-purple-200 bg-white shadow-sm flex items-center justify-center">
                  <span className="text-[7px] font-mono text-purple-600 font-bold">MCP</span>
                </div>
              </div>
            </div>

            <div className="mt-2 text-center text-[10px] font-mono text-slate-400">
              Drag nodes from the palette onto the canvas
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
