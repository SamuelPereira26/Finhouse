import { getRules, handleApiRequest } from '@finhouse/core';

import { getRepo } from '@/lib/current-repo';
import { requireAccess } from '@/lib/http';

export async function GET(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;
  return handleApiRequest(() => getRules(getRepo()));
}
