import { handleApiRequest, updateRule } from '@finhouse/core';

import { getRepo } from '@/lib/current-repo';
import { requireAccess } from '@/lib/http';

export async function POST(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;
  let body: any;
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = await request.json();
  } else {
    const form = await request.formData();
    body = {
      rule_id: String(form.get('rule_id') ?? ''),
      priority: Number(form.get('priority') ?? 100),
      active: form.get('active') === 'on',
      source: String(form.get('source') ?? '') || null,
      match_type: String(form.get('match_type') ?? 'INCLUDES'),
      match_sender: String(form.get('match_sender') ?? '') || null,
      match_text: String(form.get('match_text') ?? '') || null,
      match_amount_min: form.get('match_amount_min') ? Number(form.get('match_amount_min')) : null,
      match_amount_max: form.get('match_amount_max') ? Number(form.get('match_amount_max')) : null,
      assign_type: String(form.get('assign_type') ?? '') || null,
      assign_macro: String(form.get('assign_macro') ?? '') || null,
      assign_subcat: String(form.get('assign_subcat') ?? '') || null,
      assign_income_fixed_or_variable: String(form.get('assign_income_fixed_or_variable') ?? '') || null,
      assign_income_detail: String(form.get('assign_income_detail') ?? '') || null,
      assign_reimbursement_target_macro:
        String(form.get('assign_reimbursement_target_macro') ?? '') || null,
      confidence_default: Number(form.get('confidence_default') ?? 0.8)
    };
  }
  return handleApiRequest(async () => {
    await updateRule(getRepo(), body);
    return { ok: true };
  });
}
