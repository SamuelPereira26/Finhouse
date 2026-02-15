export const dynamic = 'force-dynamic';

import { getPendingTransactions } from '@finhouse/core';

import { Card } from '@/components/ui/card';
import { getRepo } from '@/lib/current-repo';

export default async function PendingPage() {
  const pending = await getPendingTransactions(getRepo());

  return (
    <div className="space-y-4">
      <Card title={`Pendientes (${pending.length})`}>
        <div className="space-y-4">
          {pending.map((tx) => (
            <article key={tx.tx_id} className="rounded-lg border border-[var(--stroke)] p-3">
              <p className="font-semibold">{tx.description_raw}</p>
              <p className="text-xs text-amber-900/70">
                {tx.date} | {tx.amount.toFixed(2)} | {tx.review_status}
              </p>
              <form className="mt-2 grid gap-2 md:grid-cols-5" action="/api/confirm" method="POST">
                <input type="hidden" name="tx_id" value={tx.tx_id} />
                <input name="type" defaultValue={tx.type} className="rounded border p-2" />
                <input name="macro" defaultValue={tx.macro ?? ''} className="rounded border p-2" />
                <input name="subcat" defaultValue={tx.subcat ?? ''} className="rounded border p-2" />
                <input name="user_note" defaultValue={tx.user_note ?? ''} className="rounded border p-2" />
                <button className="rounded border px-3 py-2">Confirmar</button>
              </form>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
