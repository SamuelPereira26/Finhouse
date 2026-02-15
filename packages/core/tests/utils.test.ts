import { describe, expect, it } from 'vitest';

import { generateTxId, parseAmount, parseDate } from '../src/utils.js';

describe('parseAmount', () => {
  it('parses european formats', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('-45,10')).toBe(-45.1);
    expect(parseAmount('€ 99,99')).toBe(99.99);
  });

  it('parses american formats', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('-45.10')).toBe(-45.1);
    expect(parseAmount('$99.99')).toBe(99.99);
  });
});

describe('parseDate', () => {
  it('parses DD/MM/YYYY', () => {
    expect(parseDate('15/02/2026')).toBe('2026-02-15');
  });

  it('parses YYYY-MM-DD', () => {
    expect(parseDate('2026-02-15')).toBe('2026-02-15');
  });

  it('parses ISO datetime', () => {
    expect(parseDate('2026-02-15T10:30:00.000Z')).toBe('2026-02-15');
  });
});

describe('generateTxId', () => {
  it('is stable for fixtures', () => {
    const txId = generateTxId('REVOLUT', '2026-02-15', -12.99, 'SPOTIFY AB', '1111');
    expect(txId).toBe('gIrAPvn2V4d0uuRa');
  });
});
