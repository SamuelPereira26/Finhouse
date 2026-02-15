import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Nav } from '@/components/nav';

export const metadata: Metadata = {
  title: 'FINHOUSE',
  description: 'FINHOUSE migration stack'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <main className="mx-auto max-w-7xl px-4 py-6">
          <header className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">FINHOUSE</h1>
          </header>
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}
