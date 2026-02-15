import type { ApiRepository, BudgetsRow, HealthRow, ImportBatch, MasterRow, RepositoryAdapter, RulesRow } from '@finhouse/core';

import { getSupabaseAdminClient } from './supabase/admin';

function stripRuntimeFields(row: MasterRow): Record<string, unknown> {
  const { account_id: _account, ...rest } = row;
  return rest;
}

export class SupabaseRepository implements RepositoryAdapter, ApiRepository {
  private supabase = getSupabaseAdminClient();

  async createImportBatch(row: ImportBatch): Promise<void> {
    const { error } = await this.supabase.from('imports').insert(row);
    if (error) throw error;
  }

  async updateImportBatch(import_batch_id: string, patch: Partial<ImportBatch>): Promise<void> {
    const { error } = await this.supabase.from('imports').update(patch).eq('import_batch_id', import_batch_id);
    if (error) throw error;
  }

  async insertStagingRows(rows: Array<Record<string, unknown>>): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await this.supabase.from('staging_rows').insert(rows);
    if (error) throw error;
  }

  async getExistingTxIds(): Promise<string[]> {
    const { data, error } = await this.supabase.from('master').select('tx_id');
    if (error) throw error;
    return (data ?? []).map((row: { tx_id: string }) => row.tx_id);
  }

  async insertMasterRows(rows: MasterRow[]): Promise<void> {
    if (rows.length === 0) return;
    const payload = rows.map(stripRuntimeFields);
    const { error } = await this.supabase.from('master').insert(payload);
    if (error) throw error;
  }

  async updateMasterRows(rows: MasterRow[]): Promise<void> {
    for (const row of rows) {
      const { error } = await this.supabase
        .from('master')
        .update(stripRuntimeFields(row))
        .eq('tx_id', row.tx_id);
      if (error) throw error;
    }
  }

  async getRules(): Promise<RulesRow[]> {
    const { data, error } = await this.supabase.from('rules').select('*').order('priority', { ascending: true });
    if (error) throw error;
    return (data ?? []) as RulesRow[];
  }

  async upsertRule(rule: RulesRow): Promise<void> {
    const { error } = await this.supabase.from('rules').upsert(rule, { onConflict: 'rule_id' });
    if (error) throw error;
  }

  async insertHealthRows(rows: HealthRow[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await this.supabase.from('health').insert(rows);
    if (error) throw error;
  }

  async isFileProcessed(uploaded_file_id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('processed_files')
      .select('uploaded_file_id')
      .eq('uploaded_file_id', uploaded_file_id)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async markFileAsProcessed(uploaded_file_id: string): Promise<void> {
    const { error } = await this.supabase.from('processed_files').upsert({ uploaded_file_id });
    if (error) throw error;
  }

  async getTransactionsByImportBatch(import_batch_id: string): Promise<MasterRow[]> {
    const { data, error } = await this.supabase
      .from('master')
      .select('*')
      .eq('import_batch_id', import_batch_id)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as MasterRow[];
  }

  async updateTransaction(tx_id: string, updates: Partial<MasterRow>): Promise<void> {
    const payload = { ...updates } as any;
    delete payload.account_id;
    const { error } = await this.supabase.from('master').update(payload).eq('tx_id', tx_id);
    if (error) throw error;
  }

  async getPendingTransactions(): Promise<MasterRow[]> {
    const { data, error } = await this.supabase
      .from('master')
      .select('*')
      .in('review_status', ['NEEDS_REVIEW', 'SUGERIDO'])
      .order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as MasterRow[];
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
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase.from('master').select('*', { count: 'exact' });

    if (filters.month) query = query.eq('month', filters.month);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.macro) query = query.eq('macro', filters.macro);
    if (filters.status) query = query.eq('review_status', filters.status);
    if (!filters.includeTransfers) query = query.neq('type', 'TRANSFER');

    const { data, error, count } = await query.order('date', { ascending: false }).range(from, to);

    if (error) throw error;

    return {
      rows: (data ?? []) as MasterRow[],
      total: count ?? 0
    };
  }

  async getBudgets(month: string): Promise<BudgetsRow[]> {
    const { data, error } = await this.supabase.from('budgets').select('*').eq('month', month).order('macro');
    if (error) throw error;
    return (data ?? []) as BudgetsRow[];
  }

  async upsertBudget(budget: BudgetsRow): Promise<void> {
    const { error } = await this.supabase.from('budgets').upsert(budget, { onConflict: 'month,macro' });
    if (error) throw error;
  }

  async createImportBatchIfMissing(import_batch_id: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('imports')
      .select('import_batch_id')
      .eq('import_batch_id', import_batch_id)
      .maybeSingle();
    if (error) throw error;
    if (data) return;

    const payload: ImportBatch = {
      import_batch_id,
      uploaded_file_id: null,
      file_name: import_batch_id,
      source_detected: 'CASH',
      status: 'DONE',
      rows_staged: 0,
      rows_imported: 0,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      notes: 'Auto-created by cash input'
    };

    await this.createImportBatch(payload);
  }

  async incrementImportRows(import_batch_id: string, delta: number): Promise<void> {
    const { data, error } = await this.supabase
      .from('imports')
      .select('rows_imported')
      .eq('import_batch_id', import_batch_id)
      .maybeSingle();
    if (error) throw error;
    const current = Number(data?.rows_imported ?? 0);
    const { error: updateError } = await this.supabase
      .from('imports')
      .update({ rows_imported: current + delta, finished_at: new Date().toISOString(), status: 'DONE' })
      .eq('import_batch_id', import_batch_id);
    if (updateError) throw updateError;
  }

  async getHealth(limit: number): Promise<
    Array<{
      check_id: string;
      import_batch_id: string | null;
      level: string;
      check_name: string;
      details: string;
      created_at: string;
    }>
  > {
    const { data, error } = await this.supabase.from('health').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data ?? [];
  }
}
