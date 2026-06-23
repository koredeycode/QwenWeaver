import { Link, useLocation } from 'react-router-dom';
import { sidebar } from './sidebar.js';

export function DocsLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="mx-auto flex max-w-7xl px-6 py-12">
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
                    link.to === '/docs'
                      ? pathname === '/docs'
                      : pathname.startsWith(link.to);
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

      <div className="min-w-0 flex-1 md:ml-12">
        <article className="prose prose-slate max-w-none">
          {children}
        </article>
      </div>
    </div>
  );
}
