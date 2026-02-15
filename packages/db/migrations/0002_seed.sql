insert into accounts (account_id, alias, last4, type, owner, active) values
  ('BBVA', 'BBVA', '0000', 'BANK', 'JOINT', true),
  ('REVOLUT_JOINT', 'REVOLUT_JOINT', '1111', 'BANK', 'JOINT', true),
  ('REVOLUT_SAMUEL', 'REVOLUT_SAMUEL', '2222', 'BANK', 'SAMUEL', true),
  ('REVOLUT_ANDREA', 'REVOLUT_ANDREA', '3333', 'BANK', 'ANDREA', true),
  ('CASH', 'CASH', 'CASH', 'CASH', 'JOINT', true)
on conflict (account_id) do update
set alias = excluded.alias,
    last4 = excluded.last4,
    type = excluded.type,
    owner = excluded.owner,
    active = excluded.active;
