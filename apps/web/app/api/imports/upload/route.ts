import { handleApiRequest, processImportFile } from '@finhouse/core';

import { getRepo } from '@/lib/current-repo';
import { requireAccess } from '@/lib/http';

export async function POST(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'file is required' }), { status: 400 });
  }

  const content = Buffer.from(await file.arrayBuffer());

  return handleApiRequest(() =>
    processImportFile(getRepo(), {
      uploaded_file_id: `upload_${Date.now()}`,
      file_name: file.name,
      content
    })
  );
}
