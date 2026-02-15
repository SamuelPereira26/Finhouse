create extension if not exists pgcrypto;

create table if not exists accounts (
  account_id text primary key,
  alias text not null,
  last4 text not null,
  type text not null,
  owner text not null,
  active boolean not null default true
);

create table if not exists imports (
  import_batch_id text primary key,
  uploaded_file_id text,
  file_name text not null,
  source_detected text,
  status text not null default 'PENDING',
  rows_staged integer not null default 0,
  rows_imported integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text
);

create table if not exists master (
  tx_id text primary key,
  source text not null,
  source_row_id text,
  import_batch_id text not null references imports(import_batch_id),
  date date not null,
  amount numeric(14,2) not null,
  currency text not null default 'EUR',
  description_raw text not null,
  merchant_or_counterparty text,
  payment_method text,
  type text not null check (type in ('INCOME', 'EXPENSE', 'REIMBURSEMENT', 'TRANSFER')),
  macro text,
  subcat text,
  reimbursement_target_macro text,
  income_fixed_or_variable text,
  income_detail text,
  rule_id text,
  review_status text not null check (review_status in ('AUTO_OK', 'SUGERIDO', 'NEEDS_REVIEW', 'USER_CONFIRMED')),
  confidence numeric(5,2) not null default 0,
  user_note text,
  month text not null,
  is_internal_transfer boolean not null default false,
  tags text[] not null default '{}'
);

create index if not exists idx_master_month on master(month);
create index if not exists idx_master_type on master(type);
create index if not exists idx_master_macro on master(macro);
create index if not exists idx_master_review_status on master(review_status);
create index if not exists idx_master_date on master(date);

create table if not exists rules (
  rule_id text primary key,
  priority integer not null default 100,
  active boolean not null default true,
  source text,
  match_type text,
  match_sender text,
  match_text text,
  match_amount_min numeric(14,2),
  match_amount_max numeric(14,2),
  assign_type text,
  assign_macro text,
  assign_subcat text,
  assign_income_fixed_or_variable text,
  assign_income_detail text,
  assign_reimbursement_target_macro text,
  confidence_default numeric(5,2) not null default 0.7
);

create index if not exists idx_rules_active_priority on rules(active, priority);

create table if not exists budgets (
  month text not null,
  macro text not null,
  budget_amount numeric(14,2) not null default 0,
  alert_75 boolean not null default false,
  alert_100 boolean not null default false,
  primary key (month, macro)
);

create table if not exists health (
  check_id text primary key,
  import_batch_id text,
  level text not null,
  check_name text not null,
  details text,
  created_at timestamptz not null default now()
);

create index if not exists idx_health_created_at on health(created_at desc);

create table if not exists staging_rows (
  staging_id bigserial primary key,
  import_batch_id text not null references imports(import_batch_id) on delete cascade,
  source text not null,
  account_id text,
  raw_date text,
  raw_amount text,
  raw_description text,
  norm_date date,
  norm_amount numeric(14,2),
  norm_description text,
  norm_counterparty text,
  norm_method text,
  direct_type text,
  direct_macro text,
  direct_subcat text,
  direct_note text,
  reimbursement_target text
);

create table if not exists processed_files (
  uploaded_file_id text primary key,
  processed_at timestamptz not null default now()
);

alter table accounts enable row level security;
alter table imports enable row level security;
alter table master enable row level security;
alter table rules enable row level security;
alter table budgets enable row level security;
alter table health enable row level security;
alter table staging_rows enable row level security;

drop policy if exists accounts_auth_all on accounts;
drop policy if exists imports_auth_all on imports;
drop policy if exists master_auth_all on master;
drop policy if exists rules_auth_all on rules;
drop policy if exists budgets_auth_all on budgets;
drop policy if exists health_auth_all on health;
drop policy if exists staging_rows_auth_all on staging_rows;

create policy accounts_auth_all on accounts for all to authenticated using (true) with check (true);
create policy imports_auth_all on imports for all to authenticated using (true) with check (true);
create policy master_auth_all on master for all to authenticated using (true) with check (true);
create policy rules_auth_all on rules for all to authenticated using (true) with check (true);
create policy budgets_auth_all on budgets for all to authenticated using (true) with check (true);
create policy health_auth_all on health for all to authenticated using (true) with check (true);
create policy staging_rows_auth_all on staging_rows for all to authenticated using (true) with check (true);
