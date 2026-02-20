-- Orbit Phase 10: Creator payout accounts + withdrawal requests
-- Run after Phase 7, 8, and 9 migrations.

create extension if not exists "pgcrypto";

create table if not exists public.creator_payout_accounts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  destination_type text not null default 'BANK',
  provider text not null default 'MANUAL',
  destination_label text not null,
  payout_handle text not null,
  account_holder_name text,
  currency text not null default 'USD',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_payout_accounts_destination_type_check check (
    destination_type in ('BANK', 'CARD', 'WALLET')
  ),
  constraint creator_payout_accounts_provider_check check (
    length(trim(provider)) between 2 and 40
  ),
  constraint creator_payout_accounts_destination_label_check check (
    length(trim(destination_label)) between 2 and 120
  ),
  constraint creator_payout_accounts_handle_check check (
    length(trim(payout_handle)) between 4 and 140
  ),
  constraint creator_payout_accounts_currency_check check (
    length(trim(currency)) between 3 and 8
  )
);

drop trigger if exists trg_creator_payout_accounts_updated_at on public.creator_payout_accounts;
create trigger trg_creator_payout_accounts_updated_at
before update on public.creator_payout_accounts
for each row execute function public.set_updated_at();

create table if not exists public.creator_payout_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  destination_type text not null,
  destination_label text not null,
  payout_handle text not null,
  amount_starbits integer not null,
  amount_usd_cents integer not null,
  status text not null default 'PENDING',
  note text,
  payout_reference text,
  processed_by uuid references public.profiles (id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_payout_requests_destination_type_check check (
    destination_type in ('BANK', 'CARD', 'WALLET')
  ),
  constraint creator_payout_requests_amount_check check (
    amount_starbits > 0 and amount_starbits <= 100000000
  ),
  constraint creator_payout_requests_cents_check check (
    amount_usd_cents > 0 and amount_usd_cents <= 100000000
  ),
  constraint creator_payout_requests_status_check check (
    status in ('PENDING', 'PROCESSING', 'PAID', 'REJECTED', 'CANCELED')
  )
);

drop trigger if exists trg_creator_payout_requests_updated_at on public.creator_payout_requests;
create trigger trg_creator_payout_requests_updated_at
before update on public.creator_payout_requests
for each row execute function public.set_updated_at();

create index if not exists idx_creator_payout_requests_profile_created
  on public.creator_payout_requests (profile_id, created_at desc);

create index if not exists idx_creator_payout_requests_status_created
  on public.creator_payout_requests (status, created_at desc);

create or replace function public.orbit_upsert_payout_account(
  destination_type text,
  provider text,
  destination_label text,
  payout_handle text,
  account_holder_name text default null,
  currency_code text default 'USD'
)
returns public.creator_payout_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_destination text;
  normalized_provider text;
  normalized_label text;
  normalized_handle text;
  normalized_holder text;
  normalized_currency text;
  account_row public.creator_payout_accounts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  normalized_destination := upper(trim(coalesce(destination_type, '')));
  normalized_provider := upper(trim(coalesce(provider, '')));
  normalized_label := trim(coalesce(destination_label, ''));
  normalized_handle := trim(coalesce(payout_handle, ''));
  normalized_holder := nullif(trim(coalesce(account_holder_name, '')), '');
  normalized_currency := upper(trim(coalesce(currency_code, 'USD')));

  if normalized_destination not in ('BANK', 'CARD', 'WALLET') then
    raise exception 'Invalid destination_type';
  end if;
  if length(normalized_provider) < 2 then
    raise exception 'provider is required';
  end if;
  if length(normalized_label) < 2 then
    raise exception 'destination_label is required';
  end if;
  if length(normalized_handle) < 4 then
    raise exception 'payout_handle is too short';
  end if;
  if length(normalized_currency) < 3 then
    raise exception 'currency_code is invalid';
  end if;

  insert into public.creator_payout_accounts (
    profile_id,
    destination_type,
    provider,
    destination_label,
    payout_handle,
    account_holder_name,
    currency,
    is_verified
  )
  values (
    auth.uid(),
    normalized_destination,
    normalized_provider,
    normalized_label,
    normalized_handle,
    normalized_holder,
    normalized_currency,
    false
  )
  on conflict (profile_id) do update
  set
    destination_type = excluded.destination_type,
    provider = excluded.provider,
    destination_label = excluded.destination_label,
    payout_handle = excluded.payout_handle,
    account_holder_name = excluded.account_holder_name,
    currency = excluded.currency,
    is_verified = false,
    updated_at = now()
  returning * into account_row;

  return account_row;
end;
$$;

create or replace function public.orbit_request_payout(
  request_amount integer,
  note text default null
)
returns table (
  request_id uuid,
  balance integer,
  amount_starbits integer,
  amount_usd_cents integer,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_amount integer;
  cents_value integer;
  payout_account public.creator_payout_accounts%rowtype;
  wallet_row public.profile_wallets%rowtype;
  request_row public.creator_payout_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  safe_amount := greatest(coalesce(request_amount, 0), 0);
  if safe_amount < 100 then
    raise exception 'Minimum payout is 100 Starbits';
  end if;

  -- Conversion rule for payout review queue: 1 Starbit = 1 cent (USD).
  cents_value := safe_amount;

  select *
  into payout_account
  from public.creator_payout_accounts a
  where a.profile_id = auth.uid()
  for update;

  if payout_account.profile_id is null then
    raise exception 'Set payout destination first';
  end if;

  perform public.ensure_profile_monetization(auth.uid());

  select *
  into wallet_row
  from public.profile_wallets w
  where w.profile_id = auth.uid()
  for update;

  if wallet_row.profile_id is null then
    raise exception 'Wallet not found';
  end if;

  if wallet_row.starbits_balance < safe_amount then
    raise exception 'Not enough Starbits';
  end if;

  update public.profile_wallets
  set
    starbits_balance = starbits_balance - safe_amount,
    updated_at = now()
  where profile_id = auth.uid()
  returning * into wallet_row;

  insert into public.creator_payout_requests (
    profile_id,
    destination_type,
    destination_label,
    payout_handle,
    amount_starbits,
    amount_usd_cents,
    status,
    note
  )
  values (
    auth.uid(),
    payout_account.destination_type,
    payout_account.destination_label,
    payout_account.payout_handle,
    safe_amount,
    cents_value,
    'PENDING',
    case
      when note is null then null
      else left(trim(note), 500)
    end
  )
  returning * into request_row;

  insert into public.profile_wallet_transactions (
    profile_id,
    amount,
    reason,
    metadata,
    balance_after
  )
  values (
    auth.uid(),
    safe_amount * -1,
    'PAYOUT_REQUEST',
    jsonb_build_object(
      'request_id', request_row.id,
      'destination_type', request_row.destination_type
    ),
    wallet_row.starbits_balance
  );

  return query
  select
    request_row.id,
    wallet_row.starbits_balance,
    request_row.amount_starbits,
    request_row.amount_usd_cents,
    request_row.status;
end;
$$;

create or replace function public.orbit_cancel_payout_request(
  request_id uuid
)
returns table (
  balance integer,
  canceled_request uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.creator_payout_requests%rowtype;
  wallet_row public.profile_wallets%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if request_id is null then
    raise exception 'request_id is required';
  end if;

  select *
  into request_row
  from public.creator_payout_requests r
  where r.id = request_id
    and r.profile_id = auth.uid()
  for update;

  if request_row.id is null then
    raise exception 'Payout request not found';
  end if;
  if request_row.status <> 'PENDING' then
    raise exception 'Only pending payout requests can be canceled';
  end if;

  perform public.ensure_profile_monetization(auth.uid());

  select *
  into wallet_row
  from public.profile_wallets w
  where w.profile_id = auth.uid()
  for update;

  update public.profile_wallets
  set
    starbits_balance = starbits_balance + request_row.amount_starbits,
    updated_at = now()
  where profile_id = auth.uid()
  returning * into wallet_row;

  update public.creator_payout_requests
  set
    status = 'CANCELED',
    updated_at = now()
  where id = request_row.id;

  insert into public.profile_wallet_transactions (
    profile_id,
    amount,
    reason,
    metadata,
    balance_after
  )
  values (
    auth.uid(),
    request_row.amount_starbits,
    'PAYOUT_CANCEL',
    jsonb_build_object('request_id', request_row.id),
    wallet_row.starbits_balance
  );

  return query
  select wallet_row.starbits_balance, request_row.id;
end;
$$;

alter table public.creator_payout_accounts enable row level security;
alter table public.creator_payout_requests enable row level security;

drop policy if exists "creator_payout_accounts_select_own" on public.creator_payout_accounts;
create policy "creator_payout_accounts_select_own"
on public.creator_payout_accounts
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "creator_payout_accounts_insert_own" on public.creator_payout_accounts;
create policy "creator_payout_accounts_insert_own"
on public.creator_payout_accounts
for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "creator_payout_accounts_update_own" on public.creator_payout_accounts;
create policy "creator_payout_accounts_update_own"
on public.creator_payout_accounts
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "creator_payout_requests_select_own" on public.creator_payout_requests;
create policy "creator_payout_requests_select_own"
on public.creator_payout_requests
for select
to authenticated
using (profile_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.creator_payout_accounts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.creator_payout_requests;
exception when duplicate_object then null;
end $$;
