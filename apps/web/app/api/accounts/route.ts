import { handleApiRequest } from '@finhouse/core';

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAccess } from '@/lib/http';

export async function GET(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;
  return handleApiRequest(async () => {
    const { data, error } = await getSupabaseAdminClient()
      .from('accounts')
      .select('account_id, alias, last4, type, owner, active')
      .order('account_id');
    if (error) throw error;
    return data ?? [];
  });
}
