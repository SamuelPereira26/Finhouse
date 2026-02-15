import { handleApiRequest, handleCashInput } from '@finhouse/core';

import { getRepo } from '@/lib/current-repo';
import { requireAccess } from '@/lib/http';

export async function POST(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;

  const body = (await request.json()) as {
    date: string;
    amount: number;
    description: string;
    type?: 'INCOME' | 'EXPENSE' | 'REIMBURSEMENT' | 'TRANSFER';
    macro?: string;
    subcat?: string;
    note?: string;
    counterparty?: string;
    reimbursementTarget?: string;
  };

  const repo = getRepo();
  return handleApiRequest(async () => {
    const row = await handleCashInput(repo, body, await repo.getRules());
    return { ok: true, row };
  });
}
