import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { sidebar } from './sidebar.js';

export function DocsLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [isDocsMenuOpen, setIsDocsMenuOpen] = useState(false);

  // Find current active label
  const activeLink = sidebar
    .flatMap((s) => s.links)
    .find((l) => l.to === pathname || (l.to !== '/docs' && pathname.startsWith(l.to)));
  const activeLabel = activeLink ? activeLink.label : 'Overview';

  return (
    <div className="mx-auto flex flex-col md:flex-row max-w-7xl px-6 py-12">
      {/* Desktop Sidebar */}
      <aside className="hidden w-56 shrink-0 md:block">
        <nav className="sticky top-24">
          {sidebar.map((section) => (
            <div key={section.title} className="mb-6">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                {section.title}
              </h4>
              <ul className="space-y-1">
                {section.links.map((link) => {
                  const isActive =
                    link.to === '/docs' ? pathname === '/docs' : pathname.startsWith(link.to);
                  return (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-primary/10 font-medium text-primary'
                            : 'text-on-surface-variant hover:bg-surface-dim hover:text-on-surface'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 md:ml-12">
        {/* Mobile Navigation Dropdown */}
        <div className="mb-6 block md:hidden">
          <button
            onClick={() => setIsDocsMenuOpen(!isDocsMenuOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-outline/50 bg-surface-dim px-4 py-2.5 text-sm font-semibold text-on-surface cursor-pointer hover:bg-outline/10 transition-colors"
          >
            <span>
              Docs Navigation: <strong className="text-primary">{activeLabel}</strong>
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isDocsMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isDocsMenuOpen && (
            <div className="mt-2 rounded-lg border border-outline/50 bg-surface-bright p-4 shadow-lg space-y-4 animate-fade-in">
              {sidebar.map((section) => (
                <div key={section.title} className="space-y-1">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    {section.title}
                  </h4>
                  <ul className="space-y-1">
                    {section.links.map((link) => {
                      const isActive =
                        link.to === '/docs' ? pathname === '/docs' : pathname.startsWith(link.to);
                      return (
                        <li key={link.to}>
                          <Link
                            to={link.to}
                            onClick={() => setIsDocsMenuOpen(false)}
                            className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                              isActive
                                ? 'bg-primary/10 font-medium text-primary'
                                : 'text-on-surface-variant hover:bg-surface-dim hover:text-on-surface'
                            }`}
                          >
                            {link.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <article className="prose prose-slate max-w-none">{children}</article>
      </div>
    </div>
  );
}
