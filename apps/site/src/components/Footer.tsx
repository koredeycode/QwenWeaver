import { Link } from 'react-router-dom';
import { URLS, SITE } from '../config.js';

export function Footer() {
  return (
    <footer className="border-t border-outline/40 bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 grid-cols-2 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-lg font-bold">
              <img src="/logo.png" alt="QwenWeaver Logo" className="h-7 w-7 object-contain" />
              {SITE.name}
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">{SITE.description}</p>
          </div>

          <div className="col-span-1">
            <h4 className="mb-3 text-sm font-semibold">Product</h4>
            <div className="flex flex-col gap-2 text-sm text-on-surface-variant">
              <Link to="/pricing" className="hover:text-on-surface transition-colors">
                Pricing
              </Link>
              <a href={URLS.app} className="hover:text-on-surface transition-colors">
                Dashboard
              </a>
            </div>
          </div>

          <div className="col-span-1">
            <h4 className="mb-3 text-sm font-semibold">Resources</h4>
            <div className="flex flex-col gap-2 text-sm text-on-surface-variant">
              <Link to={URLS.docs} className="hover:text-on-surface transition-colors">
                Documentation
              </Link>
              <a href={URLS.github} className="hover:text-on-surface transition-colors">
                GitHub
              </a>
              <a href={URLS.githubIssues} className="hover:text-on-surface transition-colors">
                Issues
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-outline/40 pt-6 text-center text-xs text-on-surface-variant">
          &copy; {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
