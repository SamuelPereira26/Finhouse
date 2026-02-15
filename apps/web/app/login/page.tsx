'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';

  async function signInWithPassword(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    window.location.href = next;
  }

  async function signInWithMagicLink() {
    setLoading(true);
    setMessage('');
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    setMessage('Te enviamos un magic link al correo.');
    setLoading(false);
  }

  return (
    <Card title="Login">
      <form onSubmit={signInWithPassword} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email"
          className="w-full rounded border p-2"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="password"
          className="w-full rounded border p-2"
        />
        <div className="flex gap-2">
          <button disabled={loading} type="submit" className="rounded border px-3 py-2">
            Entrar
          </button>
          <button
            disabled={loading || !email}
            type="button"
            onClick={signInWithMagicLink}
            className="rounded border px-3 py-2"
          >
            Magic link
          </button>
        </div>
        {message ? <p className="text-sm text-amber-900/80">{message}</p> : null}
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Card title="Login"><p>Cargando...</p></Card>}>
      <LoginForm />
    </Suspense>
  );
}
