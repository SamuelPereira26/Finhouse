import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type SupabaseCookie = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase anon env vars are missing');
  }

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: SupabaseCookie[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as any);
          }
        } catch {
          // No-op in RSC.
        }
      }
    }
  });
}
