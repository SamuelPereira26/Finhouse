import { verifyApiToken } from '@finhouse/core';

import { getSupabaseServerClient } from './supabase/server';

export async function verifyRequestAccess(request: Request): Promise<boolean> {
  const { searchParams } = new URL(request.url);
  const queryToken = searchParams.get('token');
  const headerToken = request.headers.get('x-api-token');

  if (verifyApiToken(queryToken) || verifyApiToken(headerToken)) {
    return true;
  }

  const supabase = getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return Boolean(data.user);
}

export async function getCurrentUserOrNull() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
