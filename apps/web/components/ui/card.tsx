import type { ReactNode } from 'react';

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-4 shadow-sm">
      {title ? <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-900/70">{title}</h3> : null}
      {children}
    </section>
  );
}
