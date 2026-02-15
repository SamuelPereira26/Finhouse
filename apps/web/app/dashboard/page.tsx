import { formatAmount, getAnalytics } from '@finhouse/core';

import { TrendChart } from '@/components/charts/trend-chart';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';
import { monthFromOffset } from '@/lib/date';
import { getRepo } from '@/lib/current-repo';

export default async function DashboardPage({
  searchParams
}: {
  searchParams: { month?: string; offset?: string };
}) {
  const month = searchParams.month ?? monthFromOffset(Number(searchParams.offset ?? '0'));
  const repo = getRepo();
  const analytics = await getAnalytics(repo, month, 0);
  const budgets = await repo.getBudgets(month);
  const { rows } = await repo.getTransactions({ month, includeTransfers: false, page: 1, limit: 5000 });

  const budgetRows = budgets.map((budget) => {
    const spent = rows
      .filter((row) => row.macro === budget.macro)
      .reduce((sum, row) => sum + Math.abs(row.amount), 0);
    const ratio = budget.budget_amount > 0 ? spent / budget.budget_amount : 0;
    return {
      macro: budget.macro,
      spent,
      budget: budget.budget_amount,
      ratio
    };
  });

  return (
    <div className="space-y-4">
      <Card title={`Resumen ${month}`}>
        <div className="grid gap-3 md:grid-cols-5">
          <Metric label="income" value={analytics.income} />
          <Metric label="lifeExpense" value={analytics.lifeExpense} />
          <Metric label="available" value={analytics.available} />
          <Metric label="contributions" value={analytics.contributions} />
          <Metric label="donations" value={analytics.donations} />
        </div>
      </Card>

      <Card title="Trend diario">
        <TrendChart data={analytics.trend} />
      </Card>

      <Card title="byMacro">
        <DataTable
          headers={['macro', 'amount']}
          rows={analytics.byMacro.map((item) => [item.macro, formatAmount(item.amount)])}
        />
      </Card>

      <Card title="Estado de presupuestos">
        <DataTable
          headers={['macro', 'spent', 'budget', 'ratio']}
          rows={budgetRows.map((item) => [
            item.macro,
            formatAmount(item.spent),
            formatAmount(item.budget),
            `${(item.ratio * 100).toFixed(1)}%`
          ])}
        />
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--stroke)] bg-white/50 p-3">
      <div className="text-xs uppercase tracking-wide text-amber-900/70">{label}</div>
      <div className="mt-1 text-lg font-semibold">{formatAmount(value)}</div>
    </div>
  );
}
