import { getPendingCounts, getPendingTransactions, handleApiRequest } from '@finhouse/core';

import { getRepo } from '@/lib/current-repo';
import { requireAccess } from '@/lib/http';

export async function GET(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;

  const repo = getRepo();
  return handleApiRequest(async () => {
    const rows = await getPendingTransactions(repo);
    const counts = await getPendingCounts(repo);
    return { rows, counts };
  });
}
