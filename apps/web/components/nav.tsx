import Link from 'next/link';

const links = [
  ['/dashboard', 'Dashboard'],
  ['/transactions', 'Transactions'],
  ['/pending', 'Pending'],
  ['/budgets', 'Budgets'],
  ['/rules', 'Rules'],
  ['/imports', 'Imports'],
  ['/health', 'Health']
] as const;

export function Nav() {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className="rounded-full border border-amber-900/20 bg-[var(--surface)] px-3 py-1 text-sm hover:border-[var(--accent)]"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
