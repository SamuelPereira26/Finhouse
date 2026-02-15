import { jsonResponse } from '@finhouse/core';

import { verifyRequestAccess } from './auth';
import { monthFromOffset } from './date';

export async function requireAccess(request: Request): Promise<Response | null> {
  const ok = await verifyRequestAccess(request);
  if (!ok) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  return null;
}

export { monthFromOffset };
