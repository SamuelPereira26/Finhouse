import { getAnalytics, handleApiRequest } from '@finhouse/core';

import { getRepo } from '@/lib/current-repo';
import { monthFromOffset, requireAccess } from '@/lib/http';

export async function GET(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const offset = Number(searchParams.get('offset') ?? '0');
  const month = searchParams.get('month') ?? monthFromOffset(offset);

  return handleApiRequest(() => getAnalytics(getRepo(), month, 0));
}
