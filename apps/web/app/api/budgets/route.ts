import { getBudgets, handleApiRequest } from '@finhouse/core';

import { getRepo } from '@/lib/current-repo';
import { monthFromOffset, requireAccess } from '@/lib/http';

export async function GET(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') ?? monthFromOffset(0);
  return handleApiRequest(() => getBudgets(getRepo(), month));
}
