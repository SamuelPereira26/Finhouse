export const dynamic = 'force-dynamic';

import { CATEGORIES } from '@finhouse/core';

import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';
import { monthFromOffset } from '@/lib/date';
import { getRepo } from '@/lib/current-repo';

const TYPE_OPTIONS = ['', 'INCOME', 'EXPENSE', 'REIMBURSEMENT', 'TRANSFER'];
const STATUS_OPTIONS = ['', 'AUTO_OK', 'SUGERIDO', 'NEEDS_REVIEW', 'USER_CONFIRMED'];

export default async function TransactionsPage({
  searchParams
}: {
  searchParams: {
    month?: string;
    type?: string;
    macro?: string;
    status?: string;
    includeTransfers?: string;
    page?: string;
    limit?: string;
  };
}) {
  const params = {
    month: searchParams.month ?? monthFromOffset(0),
    type: searchParams.type ?? undefined,
    macro: searchParams.macro ?? undefined,
    status: searchParams.status ?? undefined,
    includeTransfers: searchParams.includeTransfers === 'true',
    page: Number(searchParams.page ?? '1'),
    limit: Number(searchParams.limit ?? '50')
  };

  const repo = getRepo();
  const data = await repo.getTransactions(params);

  const macroNames = Object.values(CATEGORIES).map((category) => category.name);

  return (
    <div className="space-y-4">
      <Card title="Filtros">
        <form className="grid gap-2 md:grid-cols-7" method="GET">
          <input name="month" defaultValue={params.month} className="rounded border p-2" />
          <select name="type" defaultValue={params.type ?? ''} className="rounded border p-2">
            {TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type || 'type'}
              </option>
            ))}
          </select>
          <select name="macro" defaultValue={params.macro ?? ''} className="rounded border p-2">
            <option value="">macro</option>
            {macroNames.map((macro) => (
              <option key={macro} value={macro}>
                {macro}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={params.status ?? ''} className="rounded border p-2">
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status || 'status'}
              </option>
            ))}
          </select>
          <input name="page" defaultValue={String(params.page)} className="rounded border p-2" />
          <input name="limit" defaultValue={String(params.limit)} className="rounded border p-2" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="includeTransfers" value="true" defaultChecked={params.includeTransfers} />
            includeTransfers
          </label>
          <button className="rounded border px-3 py-2">Aplicar</button>
        </form>
      </Card>

      <Card title={`Transactions (${data.total})`}>
        <DataTable
          headers={[
            'tx_id',
            'date',
            'amount',
            'type',
            'macro',
            'subcat',
            'review_status',
            'description_raw',
            'tags'
          ]}
          rows={data.rows.map((row) => [
            row.tx_id,
            row.date,
            row.amount.toFixed(2),
            row.type,
            row.macro ?? '',
            row.subcat ?? '',
            row.review_status,
            row.description_raw,
            row.tags.join(', ')
          ])}
        />
      </Card>
    </div>
  );
}
