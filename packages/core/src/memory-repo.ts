import type { ApiRepository } from './api.js';
import type { ImportBatch, RepositoryAdapter } from './import-flow.js';
import type { HealthRow, MasterRow, RulesRow } from './types.js';

export class InMemoryRepository implements RepositoryAdapter, ApiRepository {
  imports = new Map<string, ImportBatch>();
  staging: Array<Record<string, unknown>> = [];
  master = new Map<string, MasterRow>();
  rules = new Map<string, RulesRow>();
  health: HealthRow[] = [];
  processed = new Set<string>();
  budgets = new Map<string, { month: string; macro: string; budget_amount: number; alert_75: boolean; alert_100: boolean }>();

  async createImportBatch(row: ImportBatch): Promise<void> {
    this.imports.set(row.import_batch_id, row);
  }

  async updateImportBatch(import_batch_id: string, patch: Partial<ImportBatch>): Promise<void> {
    const current = this.imports.get(import_batch_id);
    if (!current) return;
    this.imports.set(import_batch_id, { ...current, ...patch });
  }

  async insertStagingRows(rows: Array<Record<string, unknown>>): Promise<void> {
    this.staging.push(...rows);
  }

  async getExistingTxIds(): Promise<string[]> {
    return [...this.master.keys()];
  }

  async insertMasterRows(rows: MasterRow[]): Promise<void> {
    for (const row of rows) {
      this.master.set(row.tx_id, row);
    }
  }

  async updateMasterRows(rows: MasterRow[]): Promise<void> {
    for (const row of rows) {
      this.master.set(row.tx_id, row);
    }
  }

  async getRules(): Promise<RulesRow[]> {
    return [...this.rules.values()];
  }

  async upsertRule(rule: RulesRow): Promise<void> {
    this.rules.set(rule.rule_id, rule);
  }

  async insertHealthRows(rows: HealthRow[]): Promise<void> {
    this.health.push(...rows);
  }

  async isFileProcessed(uploaded_file_id: string): Promise<boolean> {
    return this.processed.has(uploaded_file_id);
  }

  async markFileAsProcessed(uploaded_file_id: string): Promise<void> {
    this.processed.add(uploaded_file_id);
  }

  async getTransactionsByImportBatch(import_batch_id: string): Promise<MasterRow[]> {
    return [...this.master.values()].filter((tx) => tx.import_batch_id === import_batch_id);
  }

  async updateTransaction(tx_id: string, updates: Partial<MasterRow>): Promise<void> {
    const row = this.master.get(tx_id);
    if (!row) return;
    this.master.set(tx_id, { ...row, ...updates });
  }

  async getPendingTransactions(): Promise<MasterRow[]> {
    return [...this.master.values()].filter(
      (tx) => tx.review_status === 'NEEDS_REVIEW' || tx.review_status === 'SUGERIDO'
    );
  }

  async getTransactions(filters: {
    month?: string;
    type?: string;
    macro?: string;
    status?: string;
    includeTransfers?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ rows: MasterRow[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    let rows = [...this.master.values()];

    if (filters.month) rows = rows.filter((row) => row.month === filters.month);
    if (filters.type) rows = rows.filter((row) => row.type === filters.type);
    if (filters.macro) rows = rows.filter((row) => row.macro === filters.macro);
    if (filters.status) rows = rows.filter((row) => row.review_status === filters.status);
    if (!filters.includeTransfers) rows = rows.filter((row) => row.type !== 'TRANSFER');

    rows.sort((a, b) => (a.date > b.date ? -1 : 1));
    const total = rows.length;
    const start = (page - 1) * limit;
    return { rows: rows.slice(start, start + limit), total };
  }

  async getBudgets(month: string): Promise<
    Array<{ month: string; macro: string; budget_amount: number; alert_75: boolean; alert_100: boolean }>
  > {
    return [...this.budgets.values()].filter((item) => item.month === month);
  }

  async upsertBudget(budget: {
    month: string;
    macro: string;
    budget_amount: number;
    alert_75: boolean;
    alert_100: boolean;
  }): Promise<void> {
    this.budgets.set(`${budget.month}-${budget.macro}`, budget);
  }

  async createImportBatchIfMissing(import_batch_id: string): Promise<void> {
    if (this.imports.has(import_batch_id)) {
      return;
    }
    this.imports.set(import_batch_id, {
      import_batch_id,
      uploaded_file_id: null,
      file_name: 'CASH_INPUT',
      source_detected: 'CASH',
      status: 'DONE',
      rows_staged: 0,
      rows_imported: 0,
      started_at: new Date().toISOString(),
      finished_at: null,
      notes: null
    });
  }

  async incrementImportRows(import_batch_id: string, delta: number): Promise<void> {
    const current = this.imports.get(import_batch_id);
    if (!current) return;
    this.imports.set(import_batch_id, {
      ...current,
      rows_imported: current.rows_imported + delta,
      finished_at: new Date().toISOString(),
      status: 'DONE'
    });
  }

  async getHealth(limit: number): Promise<HealthRow[]> {
    return [...this.health].slice(-limit).reverse();
  }
}
