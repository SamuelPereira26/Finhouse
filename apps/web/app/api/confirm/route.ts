import { confirmTransaction, handleApiRequest } from '@finhouse/core';

import { getRepo } from '@/lib/current-repo';
import { requireAccess } from '@/lib/http';

export async function POST(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;

  let body: { tx_id: string; updates: Record<string, unknown> };
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = (await request.json()) as { tx_id: string; updates: Record<string, unknown> };
  } else {
    const form = await request.formData();
    const tx_id = String(form.get('tx_id') ?? '');
    body = {
      tx_id,
      updates: {
        type: form.get('type') ? String(form.get('type')) : undefined,
        macro: form.get('macro') ? String(form.get('macro')) : undefined,
        subcat: form.get('subcat') ? String(form.get('subcat')) : undefined,
        user_note: form.get('user_note') ? String(form.get('user_note')) : undefined
      }
    };
  }

  return handleApiRequest(async () => {
    await confirmTransaction(getRepo(), body.tx_id, body.updates as any);
    return { ok: true };
  });
}
