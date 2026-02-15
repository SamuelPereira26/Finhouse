import { CATEGORIES, MACRO_ORDER } from './constants';
import { parseCash } from './parsers';
import { classifyTransaction } from './rules';
import type { BudgetsRow, MasterRow, RulesRow } from './types';
import { extractMonth, generateTxId, verifyApiToken } from './utils';

export type ApiRepository = {
  getTransactions: (filters: {
    month?: string;
    type?: string;
    macro?: string;
    status?: string;
    includeTransfers?: boolean;
    page?: number;
    limit?: number;
  }) => Promise<{ rows: MasterRow[]; total: number }>;
  getPendingTransactions: () => Promise<MasterRow[]>;
  updateTransaction: (tx_id: string, updates: Partial<MasterRow>) => Promise<void>;
  getBudgets: (month: string) => Promise<BudgetsRow[]>;
  upsertBudget: (budget: BudgetsRow) => Promise<void>;
  getRules: () => Promise<RulesRow[]>;
  upsertRule: (rule: RulesRow) => Promise<void>;
  createImportBatchIfMissing: (import_batch_id: string) => Promise<void>;
  insertMasterRows: (rows: MasterRow[]) => Promise<void>;
  incrementImportRows?: (import_batch_id: string, delta: number) => Promise<void>;
  getHealth: (limit: number) => Promise<
    Array<{
      check_id: string;
      import_batch_id: string | null;
      level: string;
      check_name: string;
      details: string;
      created_at: string;
    }>
  >;
};

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  });
}

export async function handleApiRequest<T>(callback: () => Promise<T>): Promise<Response> {
  try {
    const data = await callback();
    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return jsonResponse({ error: message }, 400);
  }
}

export { verifyApiToken };

export async function getTransactions(
  repo: ApiRepository,
  params: {
    month?: string;
    type?: string;
    macro?: string;
    status?: string;
    includeTransfers?: boolean;
    page?: number;
    limit?: number;
  }
): Promise<{ rows: MasterRow[]; total: number }> {
  return repo.getTransactions(params);
}

export async function handleCashInput(
  repo: ApiRepository,
  payload: {
    date: string;
    amount: number;
    description: string;
    type?: 'INCOME' | 'EXPENSE' | 'REIMBURSEMENT' | 'TRANSFER';
    macro?: string | null;
    subcat?: string | null;
    note?: string | null;
    counterparty?: string | null;
    reimbursementTarget?: string | null;
  },
  rules: RulesRow[]
): Promise<MasterRow> {
  const parsed = parseCash(payload);
  const classification = classifyTransaction(parsed, rules);
  const tx_id = generateTxId('CASH', parsed.date, parsed.amount, parsed.description_raw, 'CASH');

  const row: MasterRow = {
    tx_id,
    source: 'CASH',
    source_row_id: parsed.source_row_id,
    import_batch_id: 'CASH_INPUT',
    date: parsed.date,
    amount: parsed.amount,
    currency: 'EUR',
    description_raw: parsed.description_raw,
    merchant_or_counterparty: parsed.merchant_or_counterparty,
    payment_method: parsed.payment_method,
    type: payload.type ?? classification.type,
    macro: payload.macro ?? classification.macro,
    subcat: payload.subcat ?? classification.subcat,
    reimbursement_target_macro: payload.reimbursementTarget ?? classification.reimbursement_target_macro,
    income_fixed_or_variable: classification.income_fixed_or_variable,
    income_detail: classification.income_detail,
    rule_id: classification.rule_id,
    review_status: 'USER_CONFIRMED',
    confidence: 1,
    user_note: payload.note ?? null,
    month: extractMonth(parsed.date),
    is_internal_transfer: false,
    tags: [],
    account_id: 'CASH'
  };

  if (row.macro === 'Otros' && !row.user_note?.trim()) {
    throw new Error("La macro 'Otros' requiere nota");
  }

  await repo.createImportBatchIfMissing('CASH_INPUT');
  await repo.insertMasterRows([row]);
  if (repo.incrementImportRows) {
    await repo.incrementImportRows('CASH_INPUT', 1);
  }
  return row;
}

export async function getBudgets(repo: ApiRepository, month: string): Promise<BudgetsRow[]> {
  return repo.getBudgets(month);
}

export async function updateBudget(repo: ApiRepository, budget: BudgetsRow): Promise<void> {
  await repo.upsertBudget(budget);
}

export async function getRules(repo: ApiRepository): Promise<RulesRow[]> {
  return repo.getRules();
}

export async function updateRule(repo: ApiRepository, rule: RulesRow): Promise<void> {
  await repo.upsertRule(rule);
}

export async function getAnalytics(
  repo: ApiRepository,
  month: string,
  offset = 0
): Promise<{
  month: string;
  income: number;
  lifeExpense: number;
  available: number;
  contributions: number;
  donations: number;
  byMacro: Array<{ macro: string; amount: number }>;
  trend: Array<{ date: string; balance: number }>;
}> {
  const { rows } = await repo.getTransactions({ month, includeTransfers: false, page: 1, limit: 5000 });

  const income = rows.filter((tx) => tx.type === 'INCOME').reduce((acc, tx) => acc + tx.amount, 0);
  const lifeExpense = rows
    .filter((tx) => tx.type === 'EXPENSE' && tx.macro && tx.macro !== CATEGORIES.OCIO.name)
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
  const contributions = rows
    .filter((tx) => tx.macro === CATEGORIES.APORTACIONES.name)
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
  const donations = rows
    .filter((tx) => tx.macro === CATEGORIES.DONACIONES.name)
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

  const byMacroMap = new Map<string, number>();
  for (const tx of rows) {
    if (!tx.macro) {
      continue;
    }
    byMacroMap.set(tx.macro, (byMacroMap.get(tx.macro) ?? 0) + tx.amount);
  }

  const byMacro = MACRO_ORDER.map((macro) => ({
    macro,
    amount: byMacroMap.get(macro) ?? 0
  }));

  const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : 1));
  let running = offset;
  const trend = sorted.map((tx) => {
    running += tx.amount;
    return {
      date: tx.date,
      balance: running
    };
  });

  return {
    month,
    income,
    lifeExpense,
    available: income - lifeExpense - contributions - donations,
    contributions,
    donations,
    byMacro,
    trend
  };
}
