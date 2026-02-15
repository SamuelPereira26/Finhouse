import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';
import { getRepo } from '@/lib/current-repo';

export default async function HealthPage({ searchParams }: { searchParams: { limit?: string } }) {
  const limit = Number(searchParams.limit ?? '100');
  const rows = await getRepo().getHealth(limit);

  return (
    <Card title={`Health (${rows.length})`}>
      <DataTable
        headers={['created_at', 'level', 'check_name', 'details', 'import_batch_id']}
        rows={rows.map((row) => [
          row.created_at,
          row.level,
          row.check_name,
          row.details,
          row.import_batch_id ?? ''
        ])}
      />
    </Card>
  );
}
