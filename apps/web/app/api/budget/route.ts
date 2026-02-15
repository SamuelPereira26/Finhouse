import { handleApiRequest, updateBudget } from '@finhouse/core';

import { getRepo } from '@/lib/current-repo';
import { requireAccess } from '@/lib/http';

export async function POST(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;
  const contentType = request.headers.get('content-type') ?? '';
  const body =
    contentType.includes('application/json')
      ? ((await request.json()) as {
          month: string;
          macro: string;
          budget_amount: number;
          alert_75: boolean;
          alert_100: boolean;
        })
      : (() => {
          return request.formData().then((form) => ({
            month: String(form.get('month') ?? ''),
            macro: String(form.get('macro') ?? ''),
            budget_amount: Number(form.get('budget_amount') ?? 0),
            alert_75: form.get('alert_75') === 'on',
            alert_100: form.get('alert_100') === 'on'
          }));
        })();

  return handleApiRequest(async () => {
    await updateBudget(getRepo(), await body);
    return { ok: true };
  });
}
