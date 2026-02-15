import { createRule, handleApiRequest, updateRule } from '@finhouse/core';

import { getRepo } from '@/lib/current-repo';
import { requireAccess } from '@/lib/http';

export async function POST(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;

  let body: {
    pattern: string;
    source?: string | null;
    macro: string;
    subcat: string;
    type?: 'INCOME' | 'EXPENSE' | 'REIMBURSEMENT' | 'TRANSFER';
  };
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = (await request.json()) as typeof body;
  } else {
    const form = await request.formData();
    body = {
      pattern: String(form.get('pattern') ?? ''),
      source: String(form.get('source') ?? '') || null,
      macro: String(form.get('macro') ?? ''),
      subcat: String(form.get('subcat') ?? ''),
      type:
        (String(form.get('type') ?? '') || undefined) as
          | 'INCOME'
          | 'EXPENSE'
          | 'REIMBURSEMENT'
          | 'TRANSFER'
          | undefined
    };
  }

  const repo = getRepo();
  const rule = createRule(body);
  return handleApiRequest(async () => {
    await updateRule(repo, rule);
    return { ok: true, rule };
  });
}
