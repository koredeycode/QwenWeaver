import type { ReactNode } from 'react';
import { FloatingOrbs } from './FloatingOrbs.js';

export function Section({
  id,
  children,
  className = '',
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative z-10 py-24 ${className}`} id={id}>
      <FloatingOrbs />
      <div className="mx-auto max-w-7xl px-6">{children}</div>
    </section>
  );
}
