-- Orbit Phase 8: Quest economy + sponsored mission hooks
-- Run after Phase 2 through Phase 7 migrations.

create extension if not exists "pgcrypto";

create table if not exists public.orbit_quests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  category text not null default 'VISIT',
  action_type text not null default 'VISIT_APP',
  reward_starbits integer not null,
  target_count integer not null default 1,
  repeat_interval_hours integer not null default 24,
  sponsor_name text,
  sponsor_url text,
  is_active boolean not null default true,
  active_from timestamptz,
  active_to timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orbit_quests_category_check check (
    category in ('VISIT', 'WATCH', 'PLAY', 'SOCIAL')
  ),
  constraint orbit_quests_action_type_check check (
    action_type in ('VISIT_APP', 'WATCH_AD', 'PLAY_SESSION', 'SOCIAL_SHARE')
  ),
  constraint orbit_quests_reward_check check (reward_starbits > 0 and reward_starbits <= 5000),
  constraint orbit_quests_target_check check (target_count > 0 and target_count <= 100),
  constraint orbit_quests_repeat_check check (
    repeat_interval_hours > 0 and repeat_interval_hours <= 168
  )
);

create table if not exists public.profile_quest_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  quest_id uuid not null references public.orbit_quests (id) on delete cascade,
  progress_count integer not null default 0,
  target_count_snapshot integer not null default 1,
  completed_at timestamptz,
  last_action_at timestamptz,
  last_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, quest_id),
  constraint profile_quest_progress_count_check check (progress_count >= 0),
  constraint profile_quest_target_snapshot_check check (target_count_snapshot > 0)
);

create table if not exists public.orbit_quest_action_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  quest_id uuid not null references public.orbit_quests (id) on delete cascade,
  action_type text not null,
  amount integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint orbit_quest_action_events_type_check check (
    action_type in ('VISIT_APP', 'WATCH_AD', 'PLAY_SESSION', 'SOCIAL_SHARE')
  ),
  constraint orbit_quest_action_events_amount_check check (amount > 0 and amount <= 100)
);

create index if not exists idx_orbit_quests_active_order
  on public.orbit_quests (is_active, sort_order, reward_starbits);

create index if not exists idx_profile_quest_progress_profile
  on public.profile_quest_progress (profile_id, updated_at desc);

create index if not exists idx_orbit_quest_action_events_profile_created
  on public.orbit_quest_action_events (profile_id, created_at desc);

drop trigger if exists trg_orbit_quests_updated_at on public.orbit_quests;
create trigger trg_orbit_quests_updated_at
before update on public.orbit_quests
for each row execute function public.set_updated_at();

drop trigger if exists trg_profile_quest_progress_updated_at on public.profile_quest_progress;
create trigger trg_profile_quest_progress_updated_at
before update on public.profile_quest_progress
for each row execute function public.set_updated_at();

insert into public.orbit_quests (
  slug,
  title,
  description,
  category,
  action_type,
  reward_starbits,
  target_count,
  repeat_interval_hours,
  sponsor_name,
  sponsor_url,
  sort_order,
  is_active
)
values
  (
    'daily-orbit-checkin',
    'Daily Orbit Check-in',
    'Open Orbit and complete your daily check-in mission.',
    'VISIT',
    'VISIT_APP',
    80,
    1,
    24,
    null,
    null,
    10,
    true
  ),
  (
    'sponsor-video-spotlight',
    'Sponsor Spotlight',
    'Watch today''s sponsored spotlight clip to support creators.',
    'WATCH',
    'WATCH_AD',
    140,
    1,
    24,
    'Orbit Partners',
    'https://orbit.app/partners',
    20,
    true
  ),
  (
    'arena-mini-run',
    'Arena Mini Run',
    'Play two mini arena rounds and return with your score.',
    'PLAY',
    'PLAY_SESSION',
    190,
    2,
    24,
    'Nova Arcades',
    'https://orbit.app/arcade',
    30,
    true
  ),
  (
    'share-orbit-moment',
    'Share Orbit Moment',
    'Share your favorite Orbit moment with your community.',
    'SOCIAL',
    'SOCIAL_SHARE',
    120,
    1,
    24,
    null,
    null,
    40,
    true
  )
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  action_type = excluded.action_type,
  reward_starbits = excluded.reward_starbits,
  target_count = excluded.target_count,
  repeat_interval_hours = excluded.repeat_interval_hours,
  sponsor_name = excluded.sponsor_name,
  sponsor_url = excluded.sponsor_url,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

create or replace function public.ensure_profile_quest_progress(
  target_profile uuid,
  target_quest uuid,
  target_snapshot integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_quest_progress (
    profile_id,
    quest_id,
    progress_count,
    target_count_snapshot
  )
  values (
    target_profile,
    target_quest,
    0,
    greatest(target_snapshot, 1)
  )
  on conflict (profile_id, quest_id) do nothing;
end;
$$;

create or replace function public.orbit_log_quest_action(
  target_slug text,
  action_type text,
  amount integer default 1,
  metadata jsonb default '{}'::jsonb
)
returns table (
  quest_slug text,
  progress_count integer,
  target_count integer,
  completed boolean,
  can_claim boolean,
  next_reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_slug text;
  normalized_action text;
  safe_amount integer;
  quest_row public.orbit_quests%rowtype;
  progress_row public.profile_quest_progress%rowtype;
  cooldown_until timestamptz;
  next_progress integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_profile_monetization(auth.uid());

  normalized_slug := lower(trim(coalesce(target_slug, '')));
  normalized_action := upper(trim(coalesce(action_type, '')));
  safe_amount := greatest(coalesce(amount, 1), 1);

  if normalized_slug = '' then
    raise exception 'Quest slug is required';
  end if;

  if normalized_action = '' then
    raise exception 'Action type is required';
  end if;

  select *
  into quest_row
  from public.orbit_quests q
  where q.slug = normalized_slug
    and q.is_active = true
    and (q.active_from is null or q.active_from <= now())
    and (q.active_to is null or q.active_to >= now())
  limit 1;

  if quest_row.id is null then
    raise exception 'Quest not found or inactive';
  end if;

  if quest_row.action_type <> normalized_action then
    raise exception 'Invalid action type for quest';
  end if;

  perform public.ensure_profile_quest_progress(auth.uid(), quest_row.id, quest_row.target_count);

  select *
  into progress_row
  from public.profile_quest_progress p
  where p.profile_id = auth.uid()
    and p.quest_id = quest_row.id
  for update;

  if progress_row.id is null then
    raise exception 'Quest progress not found';
  end if;

  if progress_row.last_claimed_at is not null then
    cooldown_until := progress_row.last_claimed_at
      + make_interval(hours => quest_row.repeat_interval_hours);

    if now() < cooldown_until then
      return query
      select
        quest_row.slug,
        progress_row.progress_count,
        progress_row.target_count_snapshot,
        progress_row.completed_at is not null,
        false,
        cooldown_until;
      return;
    end if;
  end if;

  next_progress := least(
    progress_row.progress_count + safe_amount,
    quest_row.target_count
  );

  update public.profile_quest_progress
  set
    progress_count = next_progress,
    target_count_snapshot = quest_row.target_count,
    completed_at = case
      when next_progress >= quest_row.target_count then coalesce(progress_row.completed_at, now())
      else null
    end,
    last_action_at = now(),
    updated_at = now()
  where id = progress_row.id
  returning * into progress_row;

  insert into public.orbit_quest_action_events (
    profile_id,
    quest_id,
    action_type,
    amount,
    metadata
  )
  values (
    auth.uid(),
    quest_row.id,
    quest_row.action_type,
    safe_amount,
    coalesce(metadata, '{}'::jsonb)
  );

  return query
  select
    quest_row.slug,
    progress_row.progress_count,
    progress_row.target_count_snapshot,
    progress_row.completed_at is not null,
    progress_row.completed_at is not null,
    null::timestamptz;
end;
$$;

create or replace function public.orbit_claim_quest_reward(target_slug text)
returns table (
  quest_slug text,
  balance integer,
  rewarded integer,
  next_claim_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_slug text;
  quest_row public.orbit_quests%rowtype;
  progress_row public.profile_quest_progress%rowtype;
  wallet_row public.profile_wallets%rowtype;
  cooldown_until timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_profile_monetization(auth.uid());

  normalized_slug := lower(trim(coalesce(target_slug, '')));
  if normalized_slug = '' then
    raise exception 'Quest slug is required';
  end if;

  select *
  into quest_row
  from public.orbit_quests q
  where q.slug = normalized_slug
    and q.is_active = true
    and (q.active_from is null or q.active_from <= now())
    and (q.active_to is null or q.active_to >= now())
  limit 1;

  if quest_row.id is null then
    raise exception 'Quest not found or inactive';
  end if;

  perform public.ensure_profile_quest_progress(auth.uid(), quest_row.id, quest_row.target_count);

  select *
  into progress_row
  from public.profile_quest_progress p
  where p.profile_id = auth.uid()
    and p.quest_id = quest_row.id
  for update;

  if progress_row.id is null then
    raise exception 'Quest progress not found';
  end if;

  if progress_row.completed_at is null then
    raise exception 'Quest is not completed yet';
  end if;

  if progress_row.last_claimed_at is not null
     and progress_row.last_claimed_at >= progress_row.completed_at then
    cooldown_until := progress_row.last_claimed_at
      + make_interval(hours => quest_row.repeat_interval_hours);
    return query
    select
      quest_row.slug,
      (select w.starbits_balance from public.profile_wallets w where w.profile_id = auth.uid()),
      0,
      cooldown_until;
    return;
  end if;

  select *
  into wallet_row
  from public.profile_wallets w
  where w.profile_id = auth.uid()
  for update;

  if wallet_row.profile_id is null then
    raise exception 'Wallet not found';
  end if;

  update public.profile_wallets
  set
    starbits_balance = starbits_balance + quest_row.reward_starbits,
    lifetime_earned = lifetime_earned + quest_row.reward_starbits,
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
    quest_row.reward_starbits,
    'QUEST_REWARD',
    jsonb_build_object(
      'quest_slug', quest_row.slug,
      'category', quest_row.category,
      'action_type', quest_row.action_type
    ),
    wallet_row.starbits_balance
  );

  update public.profile_quest_progress
  set
    progress_count = 0,
    completed_at = null,
    last_claimed_at = now(),
    target_count_snapshot = quest_row.target_count,
    updated_at = now()
  where id = progress_row.id
  returning * into progress_row;

  cooldown_until := progress_row.last_claimed_at
    + make_interval(hours => quest_row.repeat_interval_hours);

  return query
  select
    quest_row.slug,
    wallet_row.starbits_balance,
    quest_row.reward_starbits,
    cooldown_until;
end;
$$;

alter table public.orbit_quests enable row level security;
alter table public.profile_quest_progress enable row level security;
alter table public.orbit_quest_action_events enable row level security;

drop policy if exists "orbit_quests_select_authenticated" on public.orbit_quests;
create policy "orbit_quests_select_authenticated"
on public.orbit_quests
for select
to authenticated
using (is_active = true);

drop policy if exists "profile_quest_progress_select_own" on public.profile_quest_progress;
create policy "profile_quest_progress_select_own"
on public.profile_quest_progress
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "orbit_quest_action_events_select_own" on public.orbit_quest_action_events;
create policy "orbit_quest_action_events_select_own"
on public.orbit_quest_action_events
for select
to authenticated
using (profile_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.orbit_quests;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profile_quest_progress;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.orbit_quest_action_events;
exception when duplicate_object then null;
end $$;
