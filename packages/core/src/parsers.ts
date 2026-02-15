import Papa from 'papaparse';
import * as XLSX from 'xlsx';

import { ACCOUNTS, COLUMN_SIGNATURES } from './constants.js';
import type { ParsedRow, SourceInfo, TransactionType } from './types.js';
import { cleanText, parseAmount, parseDate } from './utils.js';

type DetectInput = {
  fileName?: string;
  content: Buffer | ArrayBuffer | string;
};

function toBuffer(content: Buffer | ArrayBuffer | string): Buffer {
  if (Buffer.isBuffer(content)) {
    return content;
  }
  if (typeof content === 'string') {
    return Buffer.from(content, 'utf8');
  }
  return Buffer.from(content);
}

export function detectSource(input: DetectInput): SourceInfo {
  const { fileName = '' } = input;
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return detectFromXLSX(input.content, fileName);
  }
  if (lower.endsWith('.csv')) {
    return detectFromCSV(toBuffer(input.content).toString('utf8'), fileName);
  }

  const asText = toBuffer(input.content).toString('utf8');
  if (asText.includes('Completed Date') && asText.includes('Amount')) {
    return detectFromCSV(asText, fileName);
  }

  try {
    return detectFromXLSX(input.content, fileName);
  } catch {
    throw new Error('No se pudo detectar la fuente del archivo');
  }
}

export function detectFromXLSX(content: Buffer | ArrayBuffer | string, fileName?: string): SourceInfo {
  const workbook = XLSX.read(toBuffer(content), { type: 'buffer' });
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const headers = rows.length ? Object.keys(rows[0]) : [];

  validateColumns(headers, COLUMN_SIGNATURES.BBVA.required);

  return {
    source: 'BBVA',
    account_id: ACCOUNTS.BBVA.id,
    format: 'XLSX',
    file_name: fileName
  };
}

export function detectFromCSV(content: string, fileName?: string): SourceInfo {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const header = parseCSVLine(lines[0] ?? '');
  validateColumns(header, COLUMN_SIGNATURES.REVOLUT.required);

  return {
    source: 'REVOLUT',
    account_id: detectRevolutAccount(fileName ?? '', header),
    format: 'CSV',
    file_name: fileName
  };
}

export function detectRevolutAccount(fileName: string, _header?: string[]): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('samuel')) {
    return ACCOUNTS.REVOLUT_SAMUEL.id;
  }
  if (lower.includes('andrea')) {
    return ACCOUNTS.REVOLUT_ANDREA.id;
  }
  if (lower.includes('joint') || lower.includes('compartida') || lower.includes('pareja')) {
    return ACCOUNTS.REVOLUT_JOINT.id;
  }
  return ACCOUNTS.REVOLUT_JOINT.id;
}

export function parseCSVLine(line: string): string[] {
  const parsed = Papa.parse<string[]>(line, {
    delimiter: ',',
    skipEmptyLines: true
  });
  return parsed.data[0] ?? [];
}

export function validateColumns(columns: string[], required: readonly string[]): void {
  const norm = columns.map((col) => cleanText(col));
  const missing = required.filter((requiredCol) => !norm.includes(cleanText(requiredCol)));
  if (missing.length > 0) {
    throw new Error(`Columnas faltantes: ${missing.join(', ')}`);
  }
}

export function getColumnMapping(columns: string[], expected: readonly string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  for (const column of expected) {
    mapping[column] = findColumnIndex(columns, column);
  }
  return mapping;
}

export function findColumnIndex(columns: string[], target: string): number {
  const targetNorm = cleanText(target);
  const index = columns.findIndex((column) => cleanText(column) === targetNorm);
  if (index < 0) {
    throw new Error(`No existe la columna: ${target}`);
  }
  return index;
}

export function parseFile(input: DetectInput, sourceInfo: SourceInfo): ParsedRow[] {
  if (sourceInfo.source === 'BBVA') {
    return parseBBVA(input.content, sourceInfo);
  }
  if (sourceInfo.source === 'REVOLUT') {
    return parseRevolut(toBuffer(input.content).toString('utf8'), sourceInfo);
  }
  throw new Error(`Fuente no soportada: ${sourceInfo.source}`);
}

export function parseBBVA(content: Buffer | ArrayBuffer | string, sourceInfo: SourceInfo): ParsedRow[] {
  const workbook = XLSX.read(toBuffer(content), { type: 'buffer' });
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  return rows
    .map((row, index) => {
      const rawDate =
        row.Fecha ??
        row.fecha ??
        row.DATE ??
        row.Date ??
        row['Fecha operación'] ??
        row['Fecha Operación'];
      const rawDescription =
        row.Concepto ?? row.concepto ?? row.DESCRIPTION ?? row.Description ?? row.Detalle ?? '';
      const rawAmount = row.Importe ?? row.importe ?? row.Amount ?? row.AMOUNT ?? 0;
      const amount = parseAmount(rawAmount);

      if (!rawDate || !rawDescription) {
        return null;
      }

      const type: TransactionType = amount >= 0 ? 'INCOME' : 'EXPENSE';
      const description = String(rawDescription).trim();

      return {
        source: 'BBVA',
        source_row_id: `BBVA-${index + 2}`,
        account_id: sourceInfo.account_id,
        date: parseDate(rawDate),
        amount,
        currency: String(row.Divisa ?? row.Currency ?? 'EUR'),
        description_raw: description,
        merchant_or_counterparty: extractCounterparty(description),
        payment_method: detectPaymentMethod(description),
        type,
        macro: null,
        subcat: null,
        reimbursement_target_macro: null,
        income_fixed_or_variable: null,
        income_detail: null,
        user_note: null
      } satisfies ParsedRow;
    })
    .filter((row): row is ParsedRow => row !== null);
}

export function parseRevolut(content: string, sourceInfo: SourceInfo): ParsedRow[] {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true
  });

  return parsed.data
    .map((row, index) => {
      const description = String(row.Description ?? row.Reference ?? '').trim();
      if (!description) {
        return null;
      }

      const amount = parseAmount(row.Amount);
      const type = mapRevolutType(row.Type ?? '', amount);
      return {
        source: 'REVOLUT',
        source_row_id: `REV-${index + 2}`,
        account_id: sourceInfo.account_id,
        date: parseDate(row['Completed Date'] ?? row.Date ?? row['Started Date']),
        amount,
        currency: row.Currency ?? 'EUR',
        description_raw: description,
        merchant_or_counterparty: extractCounterparty(description),
        payment_method: detectPaymentMethod(description),
        type,
        macro: null,
        subcat: null,
        reimbursement_target_macro: null,
        income_fixed_or_variable: null,
        income_detail: null,
        user_note: null
      } satisfies ParsedRow;
    })
    .filter((row): row is ParsedRow => row !== null);
}

export function parseCash(input: {
  date: string;
  amount: number;
  description: string;
  type?: TransactionType;
  macro?: string | null;
  subcat?: string | null;
  note?: string | null;
  counterparty?: string | null;
  reimbursementTarget?: string | null;
}): ParsedRow {
  return {
    source: 'CASH',
    source_row_id: `CASH-${Date.now()}`,
    account_id: ACCOUNTS.CASH.id,
    date: parseDate(input.date),
    amount: input.amount,
    currency: 'EUR',
    description_raw: input.description,
    merchant_or_counterparty: input.counterparty ?? extractCounterparty(input.description),
    payment_method: 'CASH',
    type: input.type ?? (input.amount >= 0 ? 'INCOME' : 'EXPENSE'),
    macro: input.macro ?? null,
    subcat: input.subcat ?? null,
    reimbursement_target_macro: input.reimbursementTarget ?? null,
    income_fixed_or_variable: null,
    income_detail: null,
    user_note: input.note ?? null
  };
}

export function extractCounterparty(description: string): string {
  const cleaned = cleanText(description)
    .replace(/\b(POS|TPV|CARD|TARJETA|TRF|TRANSFER|BIZUM)\b/g, '')
    .replace(/\b\d{2,}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || cleanText(description).slice(0, 80);
}

export function detectPaymentMethod(description: string): string {
  const normalized = cleanText(description);
  if (normalized.includes('BIZUM')) {
    return 'BIZUM';
  }
  if (normalized.includes('TRANSFER') || normalized.includes('TRF')) {
    return 'TRANSFER';
  }
  if (normalized.includes('CASH') || normalized.includes('EFECTIVO')) {
    return 'CASH';
  }
  return 'CARD';
}

export function mapRevolutType(type: string, amount: number): TransactionType {
  const normalized = cleanText(type);
  if (normalized.includes('TRANSFER')) {
    return 'TRANSFER';
  }
  if (normalized.includes('CARD_PAYMENT')) {
    return 'EXPENSE';
  }
  if (amount >= 0) {
    return 'INCOME';
  }
  return 'EXPENSE';
}
