export type TransactionType = 'INCOME' | 'EXPENSE' | 'REIMBURSEMENT' | 'TRANSFER';
export type ReviewStatus = 'AUTO_OK' | 'SUGERIDO' | 'NEEDS_REVIEW' | 'USER_CONFIRMED';
export type SpecialTag = 'INTERNAL_TRANSFER' | 'CHECK_SALDO';

export type Account = {
  id: string;
  alias: string;
  last4: string;
  type: string;
  owner: string;
};

export type SourceKey = 'BBVA' | 'REVOLUT' | 'CASH';

export type ParsedRow = {
  source: SourceKey;
  source_row_id: string;
  account_id: string;
  date: string;
  amount: number;
  currency: string;
  description_raw: string;
  merchant_or_counterparty: string;
  payment_method: string;
  type: TransactionType;
  macro: string | null;
  subcat: string | null;
  reimbursement_target_macro: string | null;
  income_fixed_or_variable: string | null;
  income_detail: string | null;
  user_note: string | null;
};

export type MasterRow = {
  tx_id: string;
  source: string;
  account_id?: string | null;
  source_row_id: string | null;
  import_batch_id: string;
  date: string;
  amount: number;
  currency: string;
  description_raw: string;
  merchant_or_counterparty: string | null;
  payment_method: string | null;
  type: TransactionType;
  macro: string | null;
  subcat: string | null;
  reimbursement_target_macro: string | null;
  income_fixed_or_variable: string | null;
  income_detail: string | null;
  rule_id: string | null;
  review_status: ReviewStatus;
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
  assign_type: TransactionType | null;
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
  level: 'INFO' | 'WARNING' | 'ERROR';
  check_name: string;
  details: string;
  created_at: string;
};

export type SourceInfo = {
  source: SourceKey;
  account_id: string;
  format: 'XLSX' | 'CSV' | 'JSON';
  file_name?: string;
};

export type ClassificationResult = {
  type: TransactionType;
  macro: string | null;
  subcat: string | null;
  reimbursement_target_macro: string | null;
  income_fixed_or_variable: string | null;
  income_detail: string | null;
  rule_id: string | null;
  confidence: number;
  review_status: ReviewStatus;
};
