import { handleApiRequest } from '@finhouse/core';

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAccess } from '@/lib/http';

export async function GET(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;

  return handleApiRequest(async () => {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.from('imports').select('*').order('started_at', { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  });
}
