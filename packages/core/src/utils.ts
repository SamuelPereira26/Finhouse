import { createHash, randomUUID } from 'node:crypto';

import { REVIEW_CONFIG } from './constants';
import type { HealthRow } from './types';

export function generateUUID(): string {
  return randomUUID();
}

export function formatDateISO(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function extractMonth(input: Date | string): string {
  return formatDateISO(input).slice(0, 7);
}

export function formatAmount(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function cleanText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function parseAmount(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }

  const text = String(raw ?? '').trim();
  if (!text) {
    return 0;
  }

  const negative = text.includes('(') && text.includes(')');
  const normalized = text
    .replace(/[()]/g, '')
    .replace(/\s/g, '')
    .replace(/[^0-9,.-]/g, '');

  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');

  let standard = normalized;
  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');
    if (lastComma > lastDot) {
      standard = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      standard = normalized.replace(/,/g, '');
    }
  } else if (hasComma) {
    standard = normalized.replace(/\./g, '').replace(',', '.');
  }

  const parsed = Number.parseFloat(standard);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return negative ? -Math.abs(parsed) : parsed;
}

export function parseDate(raw: unknown): string {
  if (raw instanceof Date) {
    return formatDateISO(raw);
  }

  const text = String(raw ?? '').trim();
  if (!text) {
    return formatDateISO(new Date());
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const isoDate = new Date(text);
  if (!Number.isNaN(isoDate.getTime()) && text.includes('T')) {
    return formatDateISO(isoDate);
  }

  const ddmmyyyy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  if (!Number.isNaN(isoDate.getTime())) {
    return formatDateISO(isoDate);
  }

  throw new Error(`Invalid date: ${text}`);
}

export function generateTxId(
  source: string,
  date: Date | string,
  amount: number,
  description: string,
  accountLast4: string
): string {
  const payload = [
    source,
    formatDateISO(date),
    String(amount),
    description.substring(0, 50).trim(),
    accountLast4
  ].join('|');

  const md5 = createHash('md5').update(payload).digest('base64');
  return md5.replace(/[^a-z0-9]/gi, '').substring(0, 16);
}

export function log(message: string, context?: Record<string, unknown>): void {
  const suffix = context ? ` ${JSON.stringify(context)}` : '';
  // eslint-disable-next-line no-console
  console.log(`[FINHOUSE] ${message}${suffix}`);
}

export function recordHealthCheck(
  import_batch_id: string | null,
  level: HealthRow['level'],
  check_name: string,
  details: string
): HealthRow {
  return {
    check_id: generateUUID(),
    import_batch_id,
    level,
    check_name,
    details,
    created_at: new Date().toISOString()
  };
}

export function getLastDayOfMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m, 0);
  return formatDateISO(date);
}

export function isReviewDay(dateInput: Date | string): boolean {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return REVIEW_CONFIG.REVIEW_DAYS.includes(date.getDate());
}

export function getFirstSundayOfMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1, 1);
  while (date.getDay() !== 0) {
    date.setDate(date.getDate() + 1);
  }
  return formatDateISO(date);
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  return formatDateISO(a) === formatDateISO(b);
}

export function daysDifference(a: Date | string, b: Date | string): number {
  const left = new Date(formatDateISO(a));
  const right = new Date(formatDateISO(b));
  const diffMs = Math.abs(left.getTime() - right.getTime());
  return Math.round(diffMs / 86400000);
}

export function verifyApiToken(token?: string | null): boolean {
  const apiToken = process.env.API_TOKEN;
  if (!apiToken) {
    return false;
  }
  return token === apiToken;
}
