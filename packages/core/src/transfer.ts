import { HEALTH_CONFIG } from './constants';
import type { MasterRow } from './types';
import { cleanText, daysDifference } from './utils';

export function normalizeText(value: string): string {
  return cleanText(value)
    .replace(/\b(SEPA|TRF|TRANSFER|TRANSFERENCIA|BIZUM|INSTANT)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getDayKey(date: string): string {
  return date.slice(0, 10);
}

export function addTags(tx: MasterRow, ...tags: string[]): MasterRow {
  const merged = new Set([...(tx.tags ?? []), ...tags]);
  return {
    ...tx,
    tags: [...merged]
  };
}

export function buildTxMeta(tx: MasterRow): {
  key: string;
  abs_amount: number;
  normalized_text: string;
  day_key: string;
} {
  return {
    key: tx.tx_id,
    abs_amount: Math.abs(tx.amount),
    normalized_text: normalizeText(tx.merchant_or_counterparty ?? tx.description_raw),
    day_key: getDayKey(tx.date)
  };
}

export function isBlacklisted(tx: MasterRow): boolean {
  const text = normalizeText(tx.description_raw);
  return (
    text.includes('NOMINA') ||
    text.includes('SALARIO') ||
    text.includes('AMAZON') ||
    text.includes('BIZUM RECIBIDO')
  );
}

export function isSaldo(tx: MasterRow): boolean {
  const text = normalizeText(tx.description_raw);
  return text.includes('SALDO');
}

export function getHeuristicReason(a: MasterRow, b: MasterRow): string | null {
  if (isBlacklisted(a) || isBlacklisted(b)) {
    return null;
  }

  if (a.account_id && b.account_id && a.account_id === b.account_id) {
    return null;
  }

  if (Math.abs(Math.abs(a.amount) - Math.abs(b.amount)) > 0.01) {
    return null;
  }

  const aText = normalizeText(a.description_raw);
  const bText = normalizeText(b.description_raw);

  if (aText.includes('TRANSFER') || bText.includes('TRANSFER')) {
    return 'text_transfer';
  }

  if (aText.includes('BIZUM') || bText.includes('BIZUM')) {
    return 'text_bizum';
  }

  if (daysDifference(a.date, b.date) <= HEALTH_CONFIG.TRANSFER_MATCH_DAYS) {
    return 'amount_and_window';
  }

  return null;
}

export function currencyMatches(a: MasterRow, b: MasterRow): boolean {
  return (a.currency || 'EUR') === (b.currency || 'EUR');
}

export function findHardPairs(transactions: MasterRow[]): Array<[MasterRow, MasterRow]> {
  const pairs: Array<[MasterRow, MasterRow]> = [];
  const used = new Set<string>();

  for (let i = 0; i < transactions.length; i += 1) {
    const a = transactions[i];
    if (used.has(a.tx_id) || a.is_internal_transfer) {
      continue;
    }

    for (let j = i + 1; j < transactions.length; j += 1) {
      const b = transactions[j];
      if (used.has(b.tx_id) || b.is_internal_transfer) {
        continue;
      }

      if (a.account_id && b.account_id && a.account_id === b.account_id) {
        continue;
      }

      if (!currencyMatches(a, b)) {
        continue;
      }

      const oppositeSign = (a.amount > 0 && b.amount < 0) || (a.amount < 0 && b.amount > 0);
      if (!oppositeSign) {
        continue;
      }

      if (Math.abs(Math.abs(a.amount) - Math.abs(b.amount)) > 0.01) {
        continue;
      }

      if (daysDifference(a.date, b.date) > HEALTH_CONFIG.TRANSFER_MATCH_DAYS) {
        continue;
      }

      used.add(a.tx_id);
      used.add(b.tx_id);
      pairs.push([a, b]);
      break;
    }
  }

  return pairs;
}

export function markInternalPair(a: MasterRow, b: MasterRow): [MasterRow, MasterRow] {
  const left: MasterRow = addTags(
    {
      ...a,
      type: 'TRANSFER',
      macro: null,
      subcat: null,
      is_internal_transfer: true,
      review_status: 'AUTO_OK'
    },
    'INTERNAL_TRANSFER'
  );

  const right: MasterRow = addTags(
    {
      ...b,
      type: 'TRANSFER',
      macro: null,
      subcat: null,
      is_internal_transfer: true,
      review_status: 'AUTO_OK'
    },
    'INTERNAL_TRANSFER'
  );

  return [left, right];
}

export function markInternalHeuristic(transactions: MasterRow[]): MasterRow[] {
  const updated = [...transactions];

  for (let i = 0; i < updated.length; i += 1) {
    for (let j = i + 1; j < updated.length; j += 1) {
      const a = updated[i];
      const b = updated[j];
      if (a.is_internal_transfer || b.is_internal_transfer) {
        continue;
      }

      const reason = getHeuristicReason(a, b);
      if (!reason) {
        continue;
      }

      const [left, right] = markInternalPair(a, b);
      updated[i] = left;
      updated[j] = right;
    }
  }

  return updated;
}

export function markSaldoTransactions(transactions: MasterRow[]): MasterRow[] {
  return transactions.map((tx) => {
    if (!isSaldo(tx)) {
      return tx;
    }
    return addTags(tx, 'CHECK_SALDO');
  });
}

export function detectInternalTransfers(transactions: MasterRow[]): MasterRow[] {
  const byId = new Map(transactions.map((tx) => [tx.tx_id, tx]));

  for (const [a, b] of findHardPairs(transactions)) {
    const [left, right] = markInternalPair(a, b);
    byId.set(left.tx_id, left);
    byId.set(right.tx_id, right);
  }

  return [...byId.values()];
}

export function runTransferDetection(transactions: MasterRow[]): MasterRow[] {
  const hardPairsApplied = detectInternalTransfers(transactions);
  const heuristicApplied = markInternalHeuristic(hardPairsApplied);
  return markSaldoTransactions(heuristicApplied);
}

export function getTransferSummary(transactions: MasterRow[]): {
  total: number;
  internal: number;
  saldo: number;
} {
  let internal = 0;
  let saldo = 0;

  for (const tx of transactions) {
    if (tx.tags.includes('INTERNAL_TRANSFER')) {
      internal += 1;
    }
    if (tx.tags.includes('CHECK_SALDO')) {
      saldo += 1;
    }
  }

  return {
    total: transactions.length,
    internal,
    saldo
  };
}

export function groupTransfersBySource(transactions: MasterRow[]): Record<string, MasterRow[]> {
  return transactions
    .filter((tx) => tx.tags.includes('INTERNAL_TRANSFER'))
    .reduce<Record<string, MasterRow[]>>((acc, tx) => {
      acc[tx.source] ??= [];
      acc[tx.source].push(tx);
      return acc;
    }, {});
}
