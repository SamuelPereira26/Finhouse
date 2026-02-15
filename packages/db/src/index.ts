export const TABLES = {
  accounts: 'accounts',
  imports: 'imports',
  master: 'master',
  rules: 'rules',
  budgets: 'budgets',
  health: 'health',
  staging_rows: 'staging_rows',
  processed_files: 'processed_files'
} as const;

export type AccountsRow = {
  account_id: string;
  alias: string;
  last4: string;
  type: string;
  owner: string;
  active: boolean;
};

export type ImportsRow = {
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

export type MasterRow = {
  tx_id: string;
  source: string;
  source_row_id: string | null;
  import_batch_id: string;
  date: string;
  amount: number;
  currency: string;
  description_raw: string;
  merchant_or_counterparty: string | null;
  payment_method: string | null;
  type: 'INCOME' | 'EXPENSE' | 'REIMBURSEMENT' | 'TRANSFER';
  macro: string | null;
  subcat: string | null;
  reimbursement_target_macro: string | null;
  income_fixed_or_variable: string | null;
  income_detail: string | null;
  rule_id: string | null;
  review_status: 'AUTO_OK' | 'SUGERIDO' | 'NEEDS_REVIEW' | 'USER_CONFIRMED';
  confidence: number;
  user_note: string | null;
  month: string;
  is_internal_transfer: boolean;
  tags: string[];
};

export type RulesRow = {
  rule_id: string;
  priority: number;
  active: boolean;
  source: string | null;
  match_type: string | null;
  match_sender: string | null;
  match_text: string | null;
  match_amount_min: number | null;
  match_amount_max: number | null;
  assign_type: string | null;
  assign_macro: string | null;
  assign_subcat: string | null;
  assign_income_fixed_or_variable: string | null;
  assign_income_detail: string | null;
  assign_reimbursement_target_macro: string | null;
  confidence_default: number;
};

export type BudgetsRow = {
  month: string;
  macro: string;
  budget_amount: number;
  alert_75: boolean;
  alert_100: boolean;
};

export type HealthRow = {
  check_id: string;
  import_batch_id: string | null;
  level: string;
  check_name: string;
  details: string | null;
  created_at: string;
};
