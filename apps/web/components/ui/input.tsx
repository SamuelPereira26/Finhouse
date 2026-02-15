import type { InputHTMLAttributes } from 'react';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return (
    <input
      className={`w-full rounded-md border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] ${className}`}
      {...rest}
    />
  );
}
