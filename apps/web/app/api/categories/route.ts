import { CATEGORIES, handleApiRequest } from '@finhouse/core';

import { requireAccess } from '@/lib/http';

export async function GET(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;
  return handleApiRequest(async () => CATEGORIES);
}
