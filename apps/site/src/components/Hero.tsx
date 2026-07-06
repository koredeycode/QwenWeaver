import { URLS } from '../config.js';
import { FloatingOrbs } from './FloatingOrbs.js';
import { CanvasDemo } from './CanvasDemo.js';

export function Hero() {
  return (
    <section className="relative z-10 overflow-hidden border-b border-outline/40">
      <FloatingOrbs />
      <div className="mx-auto max-w-7xl px-6 pt-24 pb-16 sm:pt-32 sm:pb-20 lg:pt-40 lg:pb-24">
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

          <p
            className="mt-6 text-lg leading-relaxed text-on-surface-variant sm:text-xl animate-fade-in"
            style={{ animationDelay: '0.15s' }}
          >
            Design, execute, and monitor complex AI agent pipelines with a drag-and-drop canvas.
            Powered by Qwen, MCP, and parallel DAG execution.
          </p>

          <div
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-slide-up"
            style={{ animationDelay: '0.25s' }}
          >
            <a
              href={URLS.app}
              className="group relative inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-on-primary shadow-sm transition-all hover:shadow-lg hover:shadow-orange-500/20"
            >
              <span className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-orange-500 to-blue-500 opacity-0 blur transition-opacity group-hover:opacity-30" />
              <span className="relative">Start Free</span>
              <span className="relative inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </a>
          </div>

          <p
            className="mt-4 text-sm text-on-surface-variant animate-fade-in"
            style={{ animationDelay: '0.35s' }}
          >
            5000 free credits on signup <span className="mx-1.5 text-outline">·</span> No credit
            card required
          </p>
        </div>

        <div className="hidden lg:block">
          <CanvasDemo />
        </div>
      </div>
    </section>
  );
}
