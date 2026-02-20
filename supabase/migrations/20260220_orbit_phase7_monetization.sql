-- Orbit Phase 7: Monetization (Orbit Pulse + Orbit Vault store)
-- Run after Phase 2, 3, 4, 5, and 6 migrations.

create extension if not exists "pgcrypto";

create table if not exists public.profile_subscriptions (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  tier text not null default 'FREE',
  status text not null default 'ACTIVE',
  renews_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_subscriptions_tier_check check (
    tier in ('FREE', 'PULSE', 'PULSE_PLUS')
  ),
  constraint profile_subscriptions_status_check check (
    status in ('ACTIVE', 'PAST_DUE', 'CANCELED')
  )
);

create table if not exists public.profile_wallets (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  starbits_balance integer not null default 1200,
  lifetime_earned integer not null default 1200,
  last_daily_claim_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_wallets_balance_check check (starbits_balance >= 0),
  constraint profile_wallets_lifetime_check check (lifetime_earned >= 0)
);

create table if not exists public.profile_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  balance_after integer not null,
  created_at timestamptz not null default now(),
  constraint profile_wallet_transactions_balance_check check (balance_after >= 0)
);

create table if not exists public.orbit_store_items (
  slug text primary key,
  name text not null,
  description text not null,
  category text not null default 'BACKGROUND',
  rarity text not null default 'COMMON',
  price_starbits integer not null,
  css_background text,
  preview_emoji text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orbit_store_items_category_check check (
    category in ('BACKGROUND', 'PROFILE_FLARE', 'SFX_PACK')
  ),
  constraint orbit_store_items_price_check check (price_starbits >= 0),
  constraint orbit_store_items_background_css_check check (
    category <> 'BACKGROUND'
    or (
      css_background is not null
      and length(trim(css_background)) > 0
    )
  )
);

create table if not exists public.profile_store_inventory (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_slug text not null references public.orbit_store_items (slug) on delete cascade,
  purchased_at timestamptz not null default now(),
  unique (profile_id, item_slug)
);

alter table public.profiles
  add column if not exists active_background_slug text,
  add column if not exists active_background_css text;

create index if not exists idx_profile_wallet_transactions_profile_created
  on public.profile_wallet_transactions (profile_id, created_at desc);

create index if not exists idx_profile_store_inventory_profile
  on public.profile_store_inventory (profile_id, purchased_at desc);

create index if not exists idx_orbit_store_items_active_order
  on public.orbit_store_items (is_active, sort_order, price_starbits);

drop trigger if exists trg_profile_subscriptions_updated_at on public.profile_subscriptions;
create trigger trg_profile_subscriptions_updated_at
before update on public.profile_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists trg_profile_wallets_updated_at on public.profile_wallets;
create trigger trg_profile_wallets_updated_at
before update on public.profile_wallets
for each row execute function public.set_updated_at();

drop trigger if exists trg_orbit_store_items_updated_at on public.orbit_store_items;
create trigger trg_orbit_store_items_updated_at
before update on public.orbit_store_items
for each row execute function public.set_updated_at();

create or replace function public.ensure_profile_monetization(target_profile uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_profile is null then
    return;
  end if;

  insert into public.profile_wallets (profile_id)
  values (target_profile)
  on conflict (profile_id) do nothing;

  insert into public.profile_subscriptions (profile_id)
  values (target_profile)
  on conflict (profile_id) do nothing;
end;
$$;

create or replace function public.handle_profile_monetization_bootstrap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_profile_monetization(new.id);
  return new;
end;
$$;

drop trigger if exists trg_profiles_bootstrap_monetization on public.profiles;
create trigger trg_profiles_bootstrap_monetization
after insert on public.profiles
for each row execute function public.handle_profile_monetization_bootstrap();

insert into public.profile_wallets (profile_id)
select p.id
from public.profiles p
left join public.profile_wallets w on w.profile_id = p.id
where w.profile_id is null;

insert into public.profile_subscriptions (profile_id)
select p.id
from public.profiles p
left join public.profile_subscriptions s on s.profile_id = p.id
where s.profile_id is null;

insert into public.orbit_store_items (
  slug,
  name,
  description,
  category,
  rarity,
  price_starbits,
  css_background,
  preview_emoji,
  sort_order
)
values
  (
    'nebula-drift',
    'Nebula Drift',
    'Deep violet nebula with soft edge glow.',
    'BACKGROUND',
    'COMMON',
    260,
    'radial-gradient(120% 120% at 8% 15%, rgba(236,72,153,0.42), transparent 48%), radial-gradient(130% 140% at 88% 82%, rgba(59,130,246,0.4), transparent 52%), linear-gradient(140deg, #0a0b16 0%, #1a1236 45%, #220d2e 100%)',
    'NEBULA',
    10
  ),
  (
    'solar-ember',
    'Solar Ember',
    'Warm orange flare with dark space depth.',
    'BACKGROUND',
    'COMMON',
    290,
    'radial-gradient(125% 125% at 16% 20%, rgba(251,146,60,0.52), transparent 50%), radial-gradient(120% 140% at 78% 78%, rgba(244,63,94,0.32), transparent 58%), linear-gradient(135deg, #120b08 0%, #2f1910 48%, #0b111a 100%)',
    'SOLAR',
    20
  ),
  (
    'quantum-frost',
    'Quantum Frost',
    'Icy cyan beam lines over midnight blue.',
    'BACKGROUND',
    'RARE',
    420,
    'radial-gradient(130% 120% at 84% 18%, rgba(34,211,238,0.45), transparent 52%), radial-gradient(130% 120% at 18% 76%, rgba(14,165,233,0.28), transparent 48%), linear-gradient(150deg, #050b16 0%, #0a1b34 52%, #142237 100%)',
    'FROST',
    30
  ),
  (
    'void-lux',
    'Void Lux',
    'Premium black-on-onyx gradient with neon rim.',
    'BACKGROUND',
    'EPIC',
    680,
    'radial-gradient(120% 120% at 12% 14%, rgba(147,51,234,0.32), transparent 45%), radial-gradient(140% 140% at 92% 86%, rgba(16,185,129,0.22), transparent 55%), linear-gradient(140deg, #030303 0%, #0a0a0f 56%, #11111b 100%)',
    'VOID',
    40
  ),
  (
    'stellar-frame-pack',
    'Stellar Frame Pack',
    'Animated avatar frames (equipping support coming soon).',
    'PROFILE_FLARE',
    'RARE',
    350,
    null,
    'FRAME',
    50
  ),
  (
    'warp-sfx-kit',
    'Warp SFX Kit',
    'Custom ping + join sounds (desktop support coming soon).',
    'SFX_PACK',
    'RARE',
    500,
    null,
    'SFX',
    60
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  rarity = excluded.rarity,
  price_starbits = excluded.price_starbits,
  css_background = excluded.css_background,
  preview_emoji = excluded.preview_emoji,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

create or replace function public.claim_daily_starbits(reward integer default 120)
returns table (
  balance integer,
  rewarded integer,
  next_claim_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_row public.profile_wallets%rowtype;
  cooldown interval := interval '20 hours';
  unlocked_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if reward < 1 or reward > 1000 then
    raise exception 'Reward out of allowed range';
  end if;

  perform public.ensure_profile_monetization(auth.uid());

  select *
  into wallet_row
  from public.profile_wallets
  where profile_id = auth.uid()
  for update;

  if wallet_row.profile_id is null then
    raise exception 'Wallet not found';
  end if;

  if wallet_row.last_daily_claim_at is not null then
    unlocked_at := wallet_row.last_daily_claim_at + cooldown;
    if now() < unlocked_at then
      return query
      select wallet_row.starbits_balance, 0, unlocked_at;
      return;
    end if;
  end if;

  update public.profile_wallets
  set
    starbits_balance = starbits_balance + reward,
    lifetime_earned = lifetime_earned + reward,
    last_daily_claim_at = now(),
    updated_at = now()
  where profile_id = auth.uid()
  returning * into wallet_row;

  insert into public.profile_wallet_transactions (
    profile_id,
    amount,
    reason,
    metadata,
    balance_after
  )
  values (
    auth.uid(),
    reward,
    'DAILY_CLAIM',
    jsonb_build_object('reward', reward),
    wallet_row.starbits_balance
  );

  return query
  select wallet_row.starbits_balance, reward, now() + cooldown;
end;
$$;

create or replace function public.buy_store_item(target_slug text)
returns table (
  balance integer,
  item_slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_slug text;
  item_row public.orbit_store_items%rowtype;
  wallet_row public.profile_wallets%rowtype;
  inserted_slug text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  normalized_slug := lower(trim(coalesce(target_slug, '')));
  if normalized_slug = '' then
    raise exception 'Item slug is required';
  end if;

  perform public.ensure_profile_monetization(auth.uid());

  select *
  into item_row
  from public.orbit_store_items
  where slug = normalized_slug
    and is_active = true;

  if item_row.slug is null then
    raise exception 'Store item not found';
  end if;

  select *
  into wallet_row
  from public.profile_wallets
  where profile_id = auth.uid()
  for update;

  if wallet_row.profile_id is null then
    raise exception 'Wallet not found';
  end if;

  if exists (
    select 1
    from public.profile_store_inventory i
    where i.profile_id = auth.uid()
      and i.item_slug = item_row.slug
  ) then
    return query
    select wallet_row.starbits_balance, item_row.slug;
    return;
  end if;

  if wallet_row.starbits_balance < item_row.price_starbits then
    raise exception 'Not enough Starbits';
  end if;

  insert into public.profile_store_inventory (profile_id, item_slug)
  values (auth.uid(), item_row.slug)
  on conflict (profile_id, item_slug) do nothing
  returning item_slug into inserted_slug;

  if inserted_slug is null then
    return query
    select wallet_row.starbits_balance, item_row.slug;
    return;
  end if;

  update public.profile_wallets
  set
    starbits_balance = starbits_balance - item_row.price_starbits,
    updated_at = now()
  where profile_id = auth.uid()
  returning * into wallet_row;

  insert into public.profile_wallet_transactions (
    profile_id,
    amount,
    reason,
    metadata,
    balance_after
  )
  values (
    auth.uid(),
    item_row.price_starbits * -1,
    'STORE_PURCHASE',
    jsonb_build_object(
      'item_slug', item_row.slug,
      'category', item_row.category,
      'price', item_row.price_starbits
    ),
    wallet_row.starbits_balance
  );

  if item_row.category = 'BACKGROUND' then
    update public.profiles
    set
      active_background_slug = coalesce(active_background_slug, item_row.slug),
      active_background_css = case
        when active_background_css is null then item_row.css_background
        else active_background_css
      end,
      updated_at = now()
    where id = auth.uid();
  end if;

  return query
  select wallet_row.starbits_balance, item_row.slug;
end;
$$;

create or replace function public.set_active_store_background(target_slug text)
returns table (
  active_slug text,
  active_css text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_slug text;
  item_row public.orbit_store_items%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if target_slug is null or trim(target_slug) = '' then
    update public.profiles
    set
      active_background_slug = null,
      active_background_css = null,
      updated_at = now()
    where id = auth.uid();

    return query select null::text, null::text;
    return;
  end if;

  normalized_slug := lower(trim(target_slug));
  select *
  into item_row
  from public.orbit_store_items
  where slug = normalized_slug
    and category = 'BACKGROUND'
    and is_active = true;

  if item_row.slug is null then
    raise exception 'Background item not found';
  end if;

  if not exists (
    select 1
    from public.profile_store_inventory i
    where i.profile_id = auth.uid()
      and i.item_slug = item_row.slug
  ) then
    raise exception 'Background is not owned by this account';
  end if;

  update public.profiles
  set
    active_background_slug = item_row.slug,
    active_background_css = item_row.css_background,
    updated_at = now()
  where id = auth.uid();

  return query
  select item_row.slug, item_row.css_background;
end;
$$;

alter table public.profile_subscriptions enable row level security;
alter table public.profile_wallets enable row level security;
alter table public.profile_wallet_transactions enable row level security;
alter table public.orbit_store_items enable row level security;
alter table public.profile_store_inventory enable row level security;

drop policy if exists "profile_subscriptions_select_own" on public.profile_subscriptions;
create policy "profile_subscriptions_select_own"
on public.profile_subscriptions
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "profile_subscriptions_update_own" on public.profile_subscriptions;
create policy "profile_subscriptions_update_own"
on public.profile_subscriptions
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "profile_wallets_select_own" on public.profile_wallets;
create policy "profile_wallets_select_own"
on public.profile_wallets
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "profile_wallet_transactions_select_own" on public.profile_wallet_transactions;
create policy "profile_wallet_transactions_select_own"
on public.profile_wallet_transactions
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "orbit_store_items_select_authenticated" on public.orbit_store_items;
create policy "orbit_store_items_select_authenticated"
on public.orbit_store_items
for select
to authenticated
using (true);

drop policy if exists "profile_store_inventory_select_own" on public.profile_store_inventory;
create policy "profile_store_inventory_select_own"
on public.profile_store_inventory
for select
to authenticated
using (profile_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.profile_subscriptions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profile_wallets;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profile_wallet_transactions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.orbit_store_items;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profile_store_inventory;
exception when duplicate_object then null;
end $$;
