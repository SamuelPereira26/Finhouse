import { describe, expect, it } from 'vitest';

import { runHealthChecks } from '../src/health.js';
import type { ParsedRow } from '../src/types.js';

const sourceInfo = { source: 'REVOLUT', account_id: 'REVOLUT_JOINT', format: 'CSV' } as const;

const validRow: ParsedRow = {
  source: 'REVOLUT',
  source_row_id: 'REV-1',
  account_id: 'REVOLUT_JOINT',
  date: '2026-02-10',
  amount: -12,
  currency: 'EUR',
  description_raw: 'MERCADONA',
  merchant_or_counterparty: 'MERCADONA',
  payment_method: 'CARD',
  type: 'EXPENSE',
  macro: null,
  subcat: null,
  reimbursement_target_macro: null,
  income_fixed_or_variable: null,
  income_detail: null,
  user_note: null
};

describe('HealthChecks', () => {
  it('returns warning/error cases', () => {
    const checks = runHealthChecks('B1', [{ ...validRow, amount: 0 }], sourceInfo, new Set(['dup']));
    expect(checks.some((check) => check.level === 'WARNING')).toBe(true);
  });

  it('returns row count error when empty', () => {
    const checks = runHealthChecks('B2', [], sourceInfo, new Set());
    expect(checks.some((check) => check.level === 'ERROR')).toBe(true);
  });
});
