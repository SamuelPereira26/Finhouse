import { describe, expect, it } from 'vitest';

import {
  findHardPairs,
  getTransferSummary,
  isBlacklisted,
  markSaldoTransactions,
  runTransferDetection
} from '../src/transfer.js';
import type { MasterRow } from '../src/types.js';

function row(input: Partial<MasterRow> & { tx_id: string; amount: number; description_raw: string }): MasterRow {
  return {
    tx_id: input.tx_id,
    source: input.source ?? 'REVOLUT',
    account_id: input.account_id ?? 'REVOLUT_SAMUEL',
    source_row_id: 'R',
    import_batch_id: 'B',
    date: input.date ?? '2026-02-10',
    amount: input.amount,
    currency: 'EUR',
    description_raw: input.description_raw,
    merchant_or_counterparty: input.merchant_or_counterparty ?? input.description_raw,
    payment_method: 'TRANSFER',
    type: input.type ?? (input.amount > 0 ? 'INCOME' : 'EXPENSE'),
    macro: input.macro ?? 'Otros',
    subcat: input.subcat ?? 'No clasificado',
    reimbursement_target_macro: null,
    income_fixed_or_variable: null,
    income_detail: null,
    rule_id: null,
    review_status: 'NEEDS_REVIEW',
    confidence: 0.1,
    user_note: null,
    month: '2026-02',
    is_internal_transfer: false,
    tags: []
  };
}

describe('TransferDetector', () => {
  it('finds hard pairs', () => {
    const a = row({ tx_id: '1', amount: -100, description_raw: 'Transfer to Andrea', account_id: 'REVOLUT_SAMUEL' });
    const b = row({ tx_id: '2', amount: 100, description_raw: 'Transfer from Samuel', account_id: 'REVOLUT_ANDREA' });
    const pairs = findHardPairs([a, b]);
    expect(pairs).toHaveLength(1);
  });

  it('marks internal and saldo tags', () => {
    const a = row({ tx_id: '1', amount: -100, description_raw: 'Transfer to Andrea', account_id: 'REVOLUT_SAMUEL' });
    const b = row({ tx_id: '2', amount: 100, description_raw: 'Transfer from Samuel', account_id: 'REVOLUT_ANDREA' });
    const c = row({ tx_id: '3', amount: -10, description_raw: 'Ajuste saldo tarjeta' });
    const result = markSaldoTransactions(runTransferDetection([a, b, c]));
    const summary = getTransferSummary(result);
    expect(summary.internal).toBeGreaterThanOrEqual(2);
    expect(summary.saldo).toBeGreaterThanOrEqual(1);
  });

  it('respects blacklist', () => {
    const payroll = row({ tx_id: 'n', amount: 1000, description_raw: 'Nomina empresa' });
    expect(isBlacklisted(payroll)).toBe(true);
  });
});
