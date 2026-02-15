import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export default async function ImportsPage() {
  const supabase = getSupabaseAdminClient();
  const [{ data: imports }, { data: health }] = await Promise.all([
    supabase.from('imports').select('*').order('started_at', { ascending: false }).limit(30),
    supabase.from('health').select('*').order('created_at', { ascending: false }).limit(30)
  ]);

  return (
    <div className="space-y-4">
      <Card title="Upload import">
        <form action="/api/imports/upload" method="POST" encType="multipart/form-data" className="flex gap-2">
          <input type="file" name="file" required className="rounded border p-2" />
          <button className="rounded border px-3">Importar</button>
        </form>
      </Card>

      <Card title="Historial Imports">
        <DataTable
          headers={['import_batch_id', 'file_name', 'source_detected', 'status', 'rows_imported', 'notes', 'started_at']}
          rows={(imports ?? []).map((row: any) => [
            row.import_batch_id,
            row.file_name,
            row.source_detected,
            row.status,
            String(row.rows_imported),
            row.notes ?? '',
            row.started_at
          ])}
        />
      </Card>

      <Card title="Health reciente">
        <DataTable
          headers={['created_at', 'level', 'check_name', 'details', 'import_batch_id']}
          rows={(health ?? []).map((row: any) => [
            row.created_at,
            row.level,
            row.check_name,
            row.details,
            row.import_batch_id ?? ''
          ])}
        />
      </Card>
    </div>
  );
}
