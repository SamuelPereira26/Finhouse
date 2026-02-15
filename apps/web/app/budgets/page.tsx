import { MACRO_ORDER } from '@finhouse/core';

import { Card } from '@/components/ui/card';
import { monthFromOffset } from '@/lib/date';
import { getRepo } from '@/lib/current-repo';

export default async function BudgetsPage({ searchParams }: { searchParams: { month?: string } }) {
  const month = searchParams.month ?? monthFromOffset(0);
  const repo = getRepo();
  const current = await repo.getBudgets(month);

  const map = new Map(current.map((row) => [row.macro, row]));
  const rows = MACRO_ORDER.filter((macro) => macro !== 'Ingresos').map((macro) => {
    return (
      map.get(macro) ?? {
        month,
        macro,
        budget_amount: 0,
        alert_75: false,
        alert_100: false
      }
    );
  });

  return (
    <div className="space-y-4">
      <Card title={`Budgets ${month}`}>
        <form method="GET" className="mb-4 flex gap-2">
          <input name="month" defaultValue={month} className="rounded border p-2" />
          <button className="rounded border px-3">Cambiar</button>
        </form>

        <div className="space-y-2">
          {rows.map((row) => (
            <form key={row.macro} className="grid gap-2 md:grid-cols-6" action="/api/budget" method="POST">
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="macro" value={row.macro} />
              <input readOnly value={row.macro} className="rounded border p-2" />
              <input
                name="budget_amount"
                defaultValue={String(row.budget_amount)}
                type="number"
                step="0.01"
                className="rounded border p-2"
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="alert_75" defaultChecked={row.alert_75} />
                alert_75
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="alert_100" defaultChecked={row.alert_100} />
                alert_100
              </label>
              <button className="rounded border px-3">Guardar</button>
            </form>
          ))}
        </div>
      </Card>
    </div>
  );
}
