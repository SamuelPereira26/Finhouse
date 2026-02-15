import { getTransactions, handleApiRequest } from '@finhouse/core';

import { getRepo } from '@/lib/current-repo';
import { requireAccess } from '@/lib/http';

export async function GET(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const params = {
    month: searchParams.get('month') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    macro: searchParams.get('macro') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    includeTransfers: searchParams.get('includeTransfers') === 'true',
    page: Number(searchParams.get('page') ?? '1'),
    limit: Number(searchParams.get('limit') ?? '50')
  };

  return handleApiRequest(() => getTransactions(getRepo(), params));
}
