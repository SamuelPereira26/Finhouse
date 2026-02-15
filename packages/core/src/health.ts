import { ACCOUNTS, HEALTH_CONFIG } from './constants.js';
import type { HealthRow, ParsedRow, SourceInfo } from './types.js';
import { daysDifference, formatDateISO, generateTxId, recordHealthCheck } from './utils.js';

export function checkRowCount(import_batch_id: string, rows: ParsedRow[]): HealthRow[] {
  if (rows.length === 0) {
    return [recordHealthCheck(import_batch_id, 'ERROR', 'checkRowCount', 'El archivo no contiene filas parseables')];
  }

  if (rows.length < 5) {
    return [
      recordHealthCheck(
        import_batch_id,
        'WARNING',
        'checkRowCount',
        `Importacion con pocas filas (${rows.length})`
      )
    ];
  }

  return [recordHealthCheck(import_batch_id, 'INFO', 'checkRowCount', `${rows.length} filas detectadas`)];
}

export function checkColumnRecognition(import_batch_id: string, sourceInfo: SourceInfo): HealthRow[] {
  return [
    recordHealthCheck(
      import_batch_id,
      'INFO',
      'checkColumnRecognition',
      `Columnas reconocidas para ${sourceInfo.source}`
    )
  ];
}

export function checkDateRange(import_batch_id: string, rows: ParsedRow[]): HealthRow[] {
  const checks: HealthRow[] = [];
  const today = formatDateISO(new Date());

  for (const row of rows) {
    const futureDiff = daysDifference(row.date, today);
    if (new Date(row.date) > new Date(today) && futureDiff > HEALTH_CONFIG.MAX_DATE_FUTURE_DAYS) {
      checks.push(
        recordHealthCheck(
          import_batch_id,
          'WARNING',
          'checkDateRange',
          `Fecha futura sospechosa en ${row.source_row_id}: ${row.date}`
        )
      );
    }

    const pastLimit = new Date();
    pastLimit.setMonth(pastLimit.getMonth() - HEALTH_CONFIG.MAX_DATE_PAST_MONTHS);
    if (new Date(row.date) < pastLimit) {
      checks.push(
        recordHealthCheck(
          import_batch_id,
          'WARNING',
          'checkDateRange',
          `Fecha demasiado antigua en ${row.source_row_id}: ${row.date}`
        )
      );
    }
  }

  if (checks.length === 0) {
    checks.push(recordHealthCheck(import_batch_id, 'INFO', 'checkDateRange', 'Rango de fechas correcto'));
  }

  return checks;
}

export function checkDuplicates(
  import_batch_id: string,
  rows: ParsedRow[],
  existingTxIds: Set<string>
): HealthRow[] {
  const seen = new Set<string>();
  const duplicateTxIds = new Set<string>();

  const accountLast4ById = new Map(Object.values(ACCOUNTS).map((account) => [account.id, account.last4]));

  let duplicates = 0;

  for (const row of rows) {
    const txId = generateTxId(
      row.source,
      row.date,
      row.amount,
      row.description_raw,
      accountLast4ById.get(row.account_id) ?? '0000'
    );
    if (seen.has(txId) || existingTxIds.has(txId)) {
      duplicates += 1;
      duplicateTxIds.add(txId);
    }
    seen.add(txId);
  }

  if (duplicates > 0) {
    return [
      recordHealthCheck(
        import_batch_id,
        'WARNING',
        'checkDuplicates',
        `Posibles duplicados detectados: ${duplicates} (${[...duplicateTxIds].slice(0, 5).join(', ')})`
      )
    ];
  }

  return [recordHealthCheck(import_batch_id, 'INFO', 'checkDuplicates', 'No se detectaron duplicados')];
}

export function checkAmounts(import_batch_id: string, rows: ParsedRow[]): HealthRow[] {
  const errors = rows.filter((row) => Number.isNaN(row.amount) || !Number.isFinite(row.amount));
  const zeros = rows.filter((row) => row.amount === 0);

  const checks: HealthRow[] = [];
  if (errors.length > 0) {
    checks.push(
      recordHealthCheck(import_batch_id, 'ERROR', 'checkAmounts', `${errors.length} filas con importe invalido`)
    );
  }

  if (zeros.length > 0) {
    checks.push(
      recordHealthCheck(import_batch_id, 'WARNING', 'checkAmounts', `${zeros.length} filas con importe cero`)
    );
  }

  if (checks.length === 0) {
    checks.push(recordHealthCheck(import_batch_id, 'INFO', 'checkAmounts', 'Importes validos'));
  }

  return checks;
}

export function runHealthChecks(
  import_batch_id: string,
  parsedRows: ParsedRow[],
  sourceInfo: SourceInfo,
  existingTxIds: Set<string> = new Set<string>()
): HealthRow[] {
  return [
    ...checkRowCount(import_batch_id, parsedRows),
    ...checkColumnRecognition(import_batch_id, sourceInfo),
    ...checkDateRange(import_batch_id, parsedRows),
    ...checkDuplicates(import_batch_id, parsedRows, existingTxIds),
    ...checkAmounts(import_batch_id, parsedRows)
  ];
}

export function getHealthSummary(checks: HealthRow[]): {
  total: number;
  info: number;
  warnings: number;
  errors: number;
} {
  const summary = {
    total: checks.length,
    info: 0,
    warnings: 0,
    errors: 0
  };

  for (const check of checks) {
    if (check.level === 'ERROR') {
      summary.errors += 1;
      continue;
    }
    if (check.level === 'WARNING') {
      summary.warnings += 1;
      continue;
    }
    summary.info += 1;
  }

  return summary;
}

export function getRecentHealthChecks(checks: HealthRow[], limit = 20): HealthRow[] {
  return [...checks]
    .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
    .slice(0, limit);
}
