import { describe, expect, it } from 'vitest';

import { matchCommonPatterns, matchFixedRules } from '../src/rules.js';
import type { ParsedRow } from '../src/types.js';

function tx(description: string, date = '2026-02-01', amount = -10): ParsedRow {
  return {
    source: 'REVOLUT',
    source_row_id: 'REV-1',
    account_id: 'REVOLUT_JOINT',
    date,
    amount,
    currency: 'EUR',
    description_raw: description,
    merchant_or_counterparty: description,
    payment_method: 'CARD',
    type: amount >= 0 ? 'INCOME' : 'EXPENSE',
    macro: null,
    subcat: null,
    reimbursement_target_macro: null,
    income_fixed_or_variable: null,
    income_detail: null,
    user_note: null
  };
}

describe('matchFixedRules', () => {
  it('matches Spotify', () => {
    const result = matchFixedRules(tx('Spotify AB'));
    expect(result?.macro).toBe('Suscripciones');
    expect(result?.subcat).toBe('Spotify');
  });

  it('matches ChatGPT', () => {
    const result = matchFixedRules(tx('OpenAI ChatGPT Plus'));
    expect(result?.macro).toBe('Suscripciones');
  });

  it('matches BasicFit', () => {
    const result = matchFixedRules(tx('Basic-Fit Madrid'));
    expect(result?.macro).toBe('Cuidado y salud');
  });
});

describe('matchCommonPatterns', () => {
  it('matches nomina', () => {
    const result = matchCommonPatterns(tx('NOMINA EMPRESA X', '2026-02-10', 2200));
    expect(result?.type).toBe('INCOME');
    expect(result?.macro).toBe('Ingresos');
  });

  it('matches supermercado', () => {
    const result = matchCommonPatterns(tx('COMPRA MERCADONA CENTRO'));
    expect(result?.macro).toBe('Supermercado');
  });

  it('matches gasolina', () => {
    const result = matchCommonPatterns(tx('REPSOL AUTO VIA'));
    expect(result?.macro).toBe('Transporte');
  });

  it('matches farmacia', () => {
    const result = matchCommonPatterns(tx('FARMACIA PLAZA'));
    expect(result?.macro).toBe('Cuidado y salud');
  });
});
