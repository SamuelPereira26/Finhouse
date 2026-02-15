import type { ButtonHTMLAttributes } from 'react';

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', ...rest } = props;
  return (
    <button
      className={`rounded-md border border-amber-900/20 bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-amber-50 hover:opacity-90 disabled:opacity-50 ${className}`}
      {...rest}
    />
  );
}
