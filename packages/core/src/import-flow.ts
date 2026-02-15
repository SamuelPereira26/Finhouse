import { ACCOUNTS } from './constants';
import { runHealthChecks } from './health';
import { detectSource, parseFile } from './parsers';
import { checkPatternSuggestions, classifyTransaction } from './rules';
import { sendTelegramNotification } from './telegram';
import { runTransferDetection } from './transfer';
import type { HealthRow, MasterRow, ParsedRow, RulesRow, SourceInfo } from './types';
import { extractMonth, generateTxId, generateUUID } from './utils';

export type ImportBatch = {
  import_batch_id: string;
  uploaded_file_id: string | null;
  file_name: string;
  source_detected: string | null;
  status: string;
  rows_staged: number;
  rows_imported: number;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
};

export type ImportFlowResult = {
  import_batch_id: string;
  sourceInfo: SourceInfo;
  inserted: number;
  skipped: number;
  warnings: HealthRow[];
  errors: string[];
};

export type RepositoryAdapter = {
  createImportBatch: (row: ImportBatch) => Promise<void>;
  updateImportBatch: (import_batch_id: string, patch: Partial<ImportBatch>) => Promise<void>;
  insertStagingRows: (
    rows: Array<{
      import_batch_id: string;
      source: string;
      account_id: string;
      raw_date: string;
      raw_amount: string;
      raw_description: string;
      norm_date: string;
      norm_amount: number;
      norm_description: string;
      norm_counterparty: string;
      norm_method: string;
      direct_type: string;
      direct_macro: string | null;
      direct_subcat: string | null;
      direct_note: string | null;
      reimbursement_target: string | null;
    }>
  ) => Promise<void>;
  getExistingTxIds: () => Promise<string[]>;
  insertMasterRows: (rows: MasterRow[]) => Promise<void>;
  updateMasterRows: (rows: MasterRow[]) => Promise<void>;
  getRules: () => Promise<RulesRow[]>;
  insertHealthRows: (rows: HealthRow[]) => Promise<void>;
  isFileProcessed: (uploaded_file_id: string) => Promise<boolean>;
  markFileAsProcessed: (uploaded_file_id: string) => Promise<void>;
  getTransactionsByImportBatch: (import_batch_id: string) => Promise<MasterRow[]>;
  updateTransaction: (tx_id: string, updates: Partial<MasterRow>) => Promise<void>;
  getPendingTransactions: () => Promise<MasterRow[]>;
  getTransactions?: (filters: {
    month?: string;
    type?: string;
    macro?: string;
    status?: string;
    includeTransfers?: boolean;
    page?: number;
    limit?: number;
  }) => Promise<{ rows: MasterRow[]; total: number }>;
};

function accountLast4ById(account_id: string): string {
  const matched = Object.values(ACCOUNTS).find((account) => account.id === account_id);
  return matched?.last4 ?? '0000';
}

export async function createImportBatch(
  repo: RepositoryAdapter,
  uploaded_file_id: string | null,
  file_name: string
): Promise<ImportBatch> {
  const import_batch_id = `BATCH_${generateUUID()}`;
  const batch: ImportBatch = {
    import_batch_id,
    uploaded_file_id,
    file_name,
    source_detected: null,
    status: 'PENDING',
    rows_staged: 0,
    rows_imported: 0,
    started_at: new Date().toISOString(),
    finished_at: null,
    notes: null
  };
  await repo.createImportBatch(batch);
  return batch;
}

export async function updateImportBatch(
  repo: RepositoryAdapter,
  import_batch_id: string,
  patch: Partial<ImportBatch>
): Promise<void> {
  await repo.updateImportBatch(import_batch_id, patch);
}

export async function saveToStaging(
  repo: RepositoryAdapter,
  import_batch_id: string,
  parsedRows: ParsedRow[],
  source: string
): Promise<void> {
  await repo.insertStagingRows(
    parsedRows.map((row) => ({
      import_batch_id,
      source,
      account_id: row.account_id,
      raw_date: row.date,
      raw_amount: String(row.amount),
      raw_description: row.description_raw,
      norm_date: row.date,
      norm_amount: row.amount,
      norm_description: row.description_raw,
      norm_counterparty: row.merchant_or_counterparty,
      norm_method: row.payment_method,
      direct_type: row.type,
      direct_macro: row.macro,
      direct_subcat: row.subcat,
      direct_note: row.user_note,
      reimbursement_target: row.reimbursement_target_macro
    }))
  );
}

export async function getExistingTxIds(repo: RepositoryAdapter): Promise<Set<string>> {
  const txIds = await repo.getExistingTxIds();
  return new Set(txIds);
}

export function buildMasterRow(
  parsed: ParsedRow,
  import_batch_id: string,
  classification: {
    type: 'INCOME' | 'EXPENSE' | 'REIMBURSEMENT' | 'TRANSFER';
    macro: string | null;
    subcat: string | null;
    reimbursement_target_macro: string | null;
    income_fixed_or_variable: string | null;
    income_detail: string | null;
    rule_id: string | null;
    review_status: 'AUTO_OK' | 'SUGERIDO' | 'NEEDS_REVIEW' | 'USER_CONFIRMED';
    confidence: number;
  }
): MasterRow {
  const tx_id = generateTxId(
    parsed.source,
    parsed.date,
    parsed.amount,
    parsed.description_raw,
    accountLast4ById(parsed.account_id)
  );

  return {
    tx_id,
    source: parsed.source,
    source_row_id: parsed.source_row_id,
    import_batch_id,
    date: parsed.date,
    amount: parsed.amount,
    currency: parsed.currency,
    description_raw: parsed.description_raw,
    merchant_or_counterparty: parsed.merchant_or_counterparty,
    payment_method: parsed.payment_method,
    type: classification.type,
    macro: classification.macro,
    subcat: classification.subcat,
    reimbursement_target_macro: classification.reimbursement_target_macro,
    income_fixed_or_variable: classification.income_fixed_or_variable,
    income_detail: classification.income_detail,
    rule_id: classification.rule_id,
    review_status: classification.review_status,
    confidence: classification.confidence,
    user_note: parsed.user_note,
    month: extractMonth(parsed.date),
    is_internal_transfer: false,
    tags: [],
    account_id: parsed.account_id
  };
}

export async function insertMasterRows(repo: RepositoryAdapter, rows: MasterRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await repo.insertMasterRows(rows);
}

export async function mergeToMaster(
  repo: RepositoryAdapter,
  import_batch_id: string,
  parsedRows: ParsedRow[],
  _sourceInfo: SourceInfo
): Promise<{ inserted: number; skipped: number; masterRows: MasterRow[] }> {
  const existingTxIds = await getExistingTxIds(repo);
  const rules = await repo.getRules();
  const toInsert: MasterRow[] = [];
  let skipped = 0;

  for (const row of parsedRows) {
    const classification = classifyTransaction(row, rules);
    const masterRow = buildMasterRow(row, import_batch_id, classification);
    if (existingTxIds.has(masterRow.tx_id)) {
      skipped += 1;
      continue;
    }
    existingTxIds.add(masterRow.tx_id);
    toInsert.push(masterRow);
  }

  const transferTagged = runTransferDetection(toInsert);
  await insertMasterRows(repo, transferTagged);

  return {
    inserted: transferTagged.length,
    skipped,
    masterRows: transferTagged
  };
}

export async function processImportFile(
  repo: RepositoryAdapter,
  input: { uploaded_file_id: string | null; file_name: string; content: Buffer | ArrayBuffer | string }
): Promise<ImportFlowResult> {
  const batch = await createImportBatch(repo, input.uploaded_file_id, input.file_name);

  const sourceInfo = detectSource({ fileName: input.file_name, content: input.content });
  await updateImportBatch(repo, batch.import_batch_id, {
    source_detected: sourceInfo.source,
    status: 'PROCESSING'
  });

  const parsedRows = parseFile({ fileName: input.file_name, content: input.content }, sourceInfo);
  const existingTxIds = await getExistingTxIds(repo);
  const healthChecks = runHealthChecks(batch.import_batch_id, parsedRows, sourceInfo, existingTxIds);
  await repo.insertHealthRows(healthChecks);

  await saveToStaging(repo, batch.import_batch_id, parsedRows, sourceInfo.source);

  const merged = await mergeToMaster(repo, batch.import_batch_id, parsedRows, sourceInfo);

  // Re-run transfer detection on full month scope to catch cross-batch matches.
  if (repo.getTransactions) {
    const months = [...new Set(parsedRows.map((row) => row.date.slice(0, 7)))];
    for (const month of months) {
      const snapshot = await repo.getTransactions({
        month,
        includeTransfers: true,
        page: 1,
        limit: 5000
      });
      const before = new Map(snapshot.rows.map((row) => [row.tx_id, row]));
      const after = runTransferDetection(snapshot.rows);
      const changed = after.filter((candidate) => {
        const previous = before.get(candidate.tx_id);
        if (!previous) return false;
        return (
          previous.type !== candidate.type ||
          previous.is_internal_transfer !== candidate.is_internal_transfer ||
          previous.review_status !== candidate.review_status ||
          previous.macro !== candidate.macro ||
          previous.subcat !== candidate.subcat ||
          previous.tags.join(',') !== candidate.tags.join(',')
        );
      });

      if (changed.length > 0) {
        await repo.updateMasterRows(changed);
      }

      await checkPatternSuggestions(snapshot.rows, async (message) => {
        await sendTelegramNotification(message);
      });
    }
  }

  await updateImportBatch(repo, batch.import_batch_id, {
    status: 'DONE',
    rows_staged: parsedRows.length,
    rows_imported: merged.inserted,
    finished_at: new Date().toISOString(),
    notes: `Skipped: ${merged.skipped}`
  });

  if (input.uploaded_file_id) {
    await markFileAsProcessed(repo, input.uploaded_file_id);
  }

  return {
    import_batch_id: batch.import_batch_id,
    sourceInfo,
    inserted: merged.inserted,
    skipped: merged.skipped,
    warnings: healthChecks.filter((check) => check.level === 'WARNING'),
    errors: healthChecks.filter((check) => check.level === 'ERROR').map((check) => check.details)
  };
}

export async function runImportTrigger(
  repo: RepositoryAdapter,
  input: { uploaded_file_id: string | null; file_name: string; content: Buffer | ArrayBuffer | string }
): Promise<ImportFlowResult> {
  return processImportFile(repo, input);
}

export const runImportFlow = runImportTrigger;

export async function isFileProcessed(
  repo: RepositoryAdapter,
  uploaded_file_id: string | null
): Promise<boolean> {
  if (!uploaded_file_id) {
    return false;
  }
  return repo.isFileProcessed(uploaded_file_id);
}

export async function markFileAsProcessed(
  repo: RepositoryAdapter,
  uploaded_file_id: string
): Promise<void> {
  await repo.markFileAsProcessed(uploaded_file_id);
}

export async function confirmTransaction(
  repo: RepositoryAdapter,
  tx_id: string,
  updates: Partial<MasterRow>
): Promise<void> {
  if (updates.macro === 'Otros' && !(updates.user_note ?? '').trim()) {
    throw new Error("La macro 'Otros' requiere nota obligatoria");
  }

  const patch: Partial<MasterRow> = {
    ...updates,
    review_status: 'USER_CONFIRMED'
  };

  await repo.updateTransaction(tx_id, patch);
}

export async function getPendingTransactions(repo: RepositoryAdapter): Promise<MasterRow[]> {
  const transactions = await repo.getPendingTransactions();
  return transactions.filter((tx) => tx.review_status === 'NEEDS_REVIEW' || tx.review_status === 'SUGERIDO');
}

export async function getPendingCounts(repo: RepositoryAdapter): Promise<{
  needs_review: number;
  sugerido: number;
}> {
  const pending = await getPendingTransactions(repo);
  return {
    needs_review: pending.filter((tx) => tx.review_status === 'NEEDS_REVIEW').length,
    sugerido: pending.filter((tx) => tx.review_status === 'SUGERIDO').length
  };
}
