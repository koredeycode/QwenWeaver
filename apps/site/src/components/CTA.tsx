import { URLS } from '../config.js';
import { FloatingOrbs } from './FloatingOrbs.js';

export function CTA() {
  return (
    <section className="relative z-10 border-t border-outline/40 bg-surface py-24 overflow-hidden">
      <FloatingOrbs />
      <div className="mx-auto max-w-7xl px-6 text-center relative">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl animate-fade-in">
          Ready to build your first agent workflow?
        </h2>
        <p
          className="mx-auto mt-4 max-w-xl text-lg text-on-surface-variant animate-fade-in"
          style={{ animationDelay: '0.1s' }}
        >
          Start free and get 5000 credits to begin orchestrating. No credit card.
        </p>
        <div
          className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="relative">
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-500 to-blue-500 opacity-20 blur-xl animate-pulse-slow" />
            <a
              href={URLS.app}
              className="relative inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-on-primary shadow-sm transition-all hover:shadow-lg hover:shadow-orange-500/20"
            >
              Get Started Free
              <span className="inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </a>
          </div>
          <a
            href="https://github.com/koredeycode/QwenWeaver"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-outline/60 bg-surface-bright/80 px-6 py-3 text-base font-semibold text-on-surface backdrop-blur-sm transition-all hover:border-outline hover:bg-surface-dim"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
