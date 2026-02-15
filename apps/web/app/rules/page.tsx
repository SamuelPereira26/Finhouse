export const dynamic = 'force-dynamic';

import { Card } from '@/components/ui/card';
import { getRepo } from '@/lib/current-repo';

export default async function RulesPage() {
  const repo = getRepo();
  const rules = await repo.getRules();

  return (
    <div className="space-y-4">
      <Card title="Crear regla">
        <form action="/api/rule" method="POST" className="grid gap-2 md:grid-cols-5">
          <input name="pattern" placeholder="match_text" className="rounded border p-2" required />
          <input name="source" placeholder="source" className="rounded border p-2" />
          <input name="macro" placeholder="assign_macro" className="rounded border p-2" required />
          <input name="subcat" placeholder="assign_subcat" className="rounded border p-2" required />
          <select name="type" className="rounded border p-2">
            <option value="EXPENSE">EXPENSE</option>
            <option value="INCOME">INCOME</option>
            <option value="REIMBURSEMENT">REIMBURSEMENT</option>
            <option value="TRANSFER">TRANSFER</option>
          </select>
          <button className="rounded border px-3 py-2">Crear</button>
        </form>
      </Card>

      <Card title={`Rules (${rules.length})`}>
        <div className="space-y-2">
          {rules.map((rule) => (
            <form key={rule.rule_id} action="/api/rule-update" method="POST" className="grid gap-2 md:grid-cols-8">
              <input type="hidden" name="rule_id" value={rule.rule_id} />
              <input name="priority" defaultValue={String(rule.priority)} className="rounded border p-2" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={rule.active} />active
              </label>
              <input name="source" defaultValue={rule.source ?? ''} className="rounded border p-2" />
              <input name="match_type" defaultValue={rule.match_type ?? ''} className="rounded border p-2" />
              <input name="match_text" defaultValue={rule.match_text ?? ''} className="rounded border p-2" />
              <input name="assign_type" defaultValue={rule.assign_type ?? ''} className="rounded border p-2" />
              <input name="assign_macro" defaultValue={rule.assign_macro ?? ''} className="rounded border p-2" />
              <input name="assign_subcat" defaultValue={rule.assign_subcat ?? ''} className="rounded border p-2" />
              <input
                name="confidence_default"
                defaultValue={String(rule.confidence_default)}
                className="rounded border p-2"
              />
              <button className="rounded border px-3">Guardar</button>
            </form>
          ))}
        </div>
      </Card>
    </div>
  );
}
