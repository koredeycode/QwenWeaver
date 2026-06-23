import { Link, useLocation } from 'react-router-dom';
import { URLS, SITE } from '../config.js';

const links = [
  { to: '/', label: 'Home' },
  { to: '/docs', label: 'Docs' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/self-hosted', label: 'Self-Hosted' },
];

export function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-outline/40 bg-surface-bright/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-on-primary">Q</span>
          {SITE.name}
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium transition-colors ${
                pathname === l.to ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href={URLS.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            GitHub
          </a>
          <a
            href={URLS.app}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-all hover:bg-primary-container"
          >
            Get Started
          </a>
        </div>
      </div>
    </nav>
  );
}
