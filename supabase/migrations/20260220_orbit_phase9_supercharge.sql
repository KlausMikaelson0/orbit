-- Orbit Phase 9: Discord-plus foundations (templates, forums, events, creator economy, marketplace)
-- Run after Phase 2 through Phase 8 migrations.

create extension if not exists "pgcrypto";

do $$
begin
  alter type public.channel_type add value if not exists 'FORUM';
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists performance_mode boolean not null default false;

create table if not exists public.orbit_server_templates (
  key text primary key,
  name text not null,
  description text not null,
  channels jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.orbit_server_templates (
  key,
  name,
  description,
  channels,
  sort_order
)
values
  (
    'community',
    'Community Hub',
    'Announcements, social chat, and event stage setup.',
    '[
      {"name":"announcements","type":"TEXT"},
      {"name":"general","type":"TEXT"},
      {"name":"events","type":"FORUM"},
      {"name":"town-hall","type":"AUDIO"}
    ]'::jsonb,
    10
  ),
  (
    'gaming',
    'Gaming Squad',
    'LFG rooms, clips, and voice channels for squads.',
    '[
      {"name":"lobby","type":"TEXT"},
      {"name":"squad-chat","type":"TEXT"},
      {"name":"clips","type":"FORUM"},
      {"name":"voice-1","type":"AUDIO"},
      {"name":"stream-room","type":"VIDEO"}
    ]'::jsonb,
    20
  ),
  (
    'startup',
    'Startup Team',
    'Ship faster with async updates, planning forum, and standups.',
    '[
      {"name":"announcements","type":"TEXT"},
      {"name":"ops","type":"TEXT"},
      {"name":"product-forum","type":"FORUM"},
      {"name":"standup-live","type":"AUDIO"}
    ]'::jsonb,
    30
  )
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  channels = excluded.channels,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

create table if not exists public.channel_role_permissions (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  role public.member_role not null,
  can_view boolean not null default true,
  can_post boolean not null default true,
  can_connect boolean not null default true,
  can_manage boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id, role)
);

create index if not exists idx_channel_role_permissions_server_channel
  on public.channel_role_permissions (server_id, channel_id, role);

create or replace function public.validate_channel_role_permissions_scope()
returns trigger
language plpgsql
as $$
declare
  channel_server_id uuid;
begin
  select c.server_id
  into channel_server_id
  from public.channels c
  where c.id = new.channel_id;

  if channel_server_id is null then
    raise exception 'Invalid channel_id for permission row';
  end if;

  if channel_server_id <> new.server_id then
    raise exception 'Permission server_id must match channel server_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_channel_role_permissions_scope on public.channel_role_permissions;
create trigger trg_channel_role_permissions_scope
before insert or update on public.channel_role_permissions
for each row execute function public.validate_channel_role_permissions_scope();

drop trigger if exists trg_channel_role_permissions_updated_at on public.channel_role_permissions;
create trigger trg_channel_role_permissions_updated_at
before update on public.channel_role_permissions
for each row execute function public.set_updated_at();

create or replace function public.seed_default_channel_permissions()
returns trigger
language plpgsql
as $$
begin
  insert into public.channel_role_permissions (
    server_id,
    channel_id,
    role,
    can_view,
    can_post,
    can_connect,
    can_manage,
    created_by
  )
  values
    (new.server_id, new.id, 'ADMIN', true, true, true, true, null),
    (new.server_id, new.id, 'MODERATOR', true, true, true, false, null),
    (new.server_id, new.id, 'GUEST', true, true, true, false, null)
  on conflict (channel_id, role) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_channels_seed_default_permissions on public.channels;
create trigger trg_channels_seed_default_permissions
after insert on public.channels
for each row execute function public.seed_default_channel_permissions();

insert into public.channel_role_permissions (
  server_id,
  channel_id,
  role,
  can_view,
  can_post,
  can_connect,
  can_manage,
  created_by
)
select
  c.server_id,
  c.id,
  defaults.role,
  defaults.can_view,
  defaults.can_post,
  defaults.can_connect,
  defaults.can_manage,
  null::uuid
from public.channels c
cross join (
  values
    ('ADMIN'::public.member_role, true, true, true, true),
    ('MODERATOR'::public.member_role, true, true, true, false),
    ('GUEST'::public.member_role, true, true, true, false)
) as defaults(role, can_view, can_post, can_connect, can_manage)
on conflict (channel_id, role) do nothing;

create table if not exists public.server_events (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  channel_id uuid references public.channels (id) on delete set null,
  host_profile_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null default 'STAGE',
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  cover_image_url text,
  is_recording_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint server_events_type_check check (event_type in ('STAGE', 'LIVE', 'COMMUNITY')),
  constraint server_events_title_check check (length(trim(title)) between 2 and 120),
  constraint server_events_window_check check (
    ends_at is null or ends_at > starts_at
  )
);

create index if not exists idx_server_events_server_start
  on public.server_events (server_id, starts_at desc);

drop trigger if exists trg_server_events_updated_at on public.server_events;
create trigger trg_server_events_updated_at
before update on public.server_events
for each row execute function public.set_updated_at();

create or replace function public.validate_server_events_scope()
returns trigger
language plpgsql
as $$
declare
  channel_server_id uuid;
begin
  if new.channel_id is null then
    return new;
  end if;

  select c.server_id
  into channel_server_id
  from public.channels c
  where c.id = new.channel_id;

  if channel_server_id is null then
    raise exception 'Invalid event channel';
  end if;

  if channel_server_id <> new.server_id then
    raise exception 'Event channel must belong to event server';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_server_events_scope on public.server_events;
create trigger trg_server_events_scope
before insert or update on public.server_events
for each row execute function public.validate_server_events_scope();

create table if not exists public.forum_tags (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  slug text not null,
  label text not null,
  color_hex text not null default '#a78bfa',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (server_id, slug)
);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  author_profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  locked boolean not null default false,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forum_posts_title_check check (length(trim(title)) between 3 and 150),
  constraint forum_posts_body_check check (length(trim(body)) between 1 and 8000)
);

create table if not exists public.forum_post_tags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  tag_id uuid not null references public.forum_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, tag_id)
);

create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  author_profile_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forum_replies_body_check check (length(trim(body)) between 1 and 4000)
);

create index if not exists idx_forum_tags_server_slug
  on public.forum_tags (server_id, slug);

create index if not exists idx_forum_posts_channel_activity
  on public.forum_posts (channel_id, pinned desc, last_activity_at desc);

create index if not exists idx_forum_post_tags_post
  on public.forum_post_tags (post_id);

create index if not exists idx_forum_replies_post_created
  on public.forum_replies (post_id, created_at);

drop trigger if exists trg_forum_tags_updated_at on public.forum_tags;
create trigger trg_forum_tags_updated_at
before update on public.forum_tags
for each row execute function public.set_updated_at();

drop trigger if exists trg_forum_posts_updated_at on public.forum_posts;
create trigger trg_forum_posts_updated_at
before update on public.forum_posts
for each row execute function public.set_updated_at();

drop trigger if exists trg_forum_replies_updated_at on public.forum_replies;
create trigger trg_forum_replies_updated_at
before update on public.forum_replies
for each row execute function public.set_updated_at();

create or replace function public.validate_forum_post_scope()
returns trigger
language plpgsql
as $$
declare
  channel_server_id uuid;
  channel_type public.channel_type;
begin
  select c.server_id, c.type
  into channel_server_id, channel_type
  from public.channels c
  where c.id = new.channel_id;

  if channel_server_id is null then
    raise exception 'Invalid forum channel';
  end if;

  if channel_type <> 'FORUM' then
    raise exception 'Forum posts can only be created in FORUM channels';
  end if;

  if channel_server_id <> new.server_id then
    raise exception 'Forum post server_id must match channel server_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_forum_posts_scope on public.forum_posts;
create trigger trg_forum_posts_scope
before insert or update on public.forum_posts
for each row execute function public.validate_forum_post_scope();

create or replace function public.validate_forum_post_tag_scope()
returns trigger
language plpgsql
as $$
declare
  post_server_id uuid;
  tag_server_id uuid;
begin
  select p.server_id
  into post_server_id
  from public.forum_posts p
  where p.id = new.post_id;

  select t.server_id
  into tag_server_id
  from public.forum_tags t
  where t.id = new.tag_id;

  if post_server_id is null or tag_server_id is null then
    raise exception 'Invalid post/tag link';
  end if;

  if post_server_id <> tag_server_id then
    raise exception 'Forum post tag must belong to same server';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_forum_post_tags_scope on public.forum_post_tags;
create trigger trg_forum_post_tags_scope
before insert or update on public.forum_post_tags
for each row execute function public.validate_forum_post_tag_scope();

create or replace function public.touch_forum_post_activity()
returns trigger
language plpgsql
as $$
begin
  update public.forum_posts
  set
    last_activity_at = now(),
    updated_at = now()
  where id = coalesce(new.post_id, old.post_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_forum_replies_touch_post on public.forum_replies;
create trigger trg_forum_replies_touch_post
after insert or update or delete on public.forum_replies
for each row execute function public.touch_forum_post_activity();

create table if not exists public.call_clips (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  channel_id uuid references public.channels (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  clip_url text not null,
  preview_image_url text,
  duration_seconds integer not null default 0,
  created_at timestamptz not null default now(),
  constraint call_clips_title_check check (length(trim(title)) between 2 and 120),
  constraint call_clips_url_check check (length(trim(clip_url)) > 0),
  constraint call_clips_duration_check check (duration_seconds >= 0 and duration_seconds <= 900)
);

create index if not exists idx_call_clips_server_created
  on public.call_clips (server_id, created_at desc);

create table if not exists public.server_ai_settings (
  server_id uuid primary key references public.servers (id) on delete cascade,
  auto_moderation_enabled boolean not null default true,
  auto_summary_enabled boolean not null default true,
  ai_assistant_enabled boolean not null default true,
  smart_reply_enabled boolean not null default false,
  summarize_interval_minutes integer not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint server_ai_settings_interval_check check (
    summarize_interval_minutes between 5 and 240
  )
);

drop trigger if exists trg_server_ai_settings_updated_at on public.server_ai_settings;
create trigger trg_server_ai_settings_updated_at
before update on public.server_ai_settings
for each row execute function public.set_updated_at();

create or replace function public.ensure_server_ai_settings(target_server uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_server is null then
    return;
  end if;

  insert into public.server_ai_settings (server_id)
  values (target_server)
  on conflict (server_id) do nothing;
end;
$$;

insert into public.server_ai_settings (server_id)
select s.id
from public.servers s
left join public.server_ai_settings ai on ai.server_id = s.id
where ai.server_id is null;

create or replace function public.handle_server_ai_settings_bootstrap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_server_ai_settings(new.id);
  return new;
end;
$$;

drop trigger if exists trg_servers_bootstrap_ai_settings on public.servers;
create trigger trg_servers_bootstrap_ai_settings
after insert on public.servers
for each row execute function public.handle_server_ai_settings_bootstrap();

create table if not exists public.orbit_seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  xp_per_level integer not null default 120,
  max_level integer not null default 80,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orbit_seasons_window_check check (ends_at > starts_at),
  constraint orbit_seasons_xp_check check (xp_per_level between 10 and 5000),
  constraint orbit_seasons_max_level_check check (max_level between 1 and 500)
);

drop trigger if exists trg_orbit_seasons_updated_at on public.orbit_seasons;
create trigger trg_orbit_seasons_updated_at
before update on public.orbit_seasons
for each row execute function public.set_updated_at();

insert into public.orbit_seasons (
  slug,
  name,
  description,
  starts_at,
  ends_at,
  xp_per_level,
  max_level,
  is_active
)
values (
  'constellation-s1',
  'Constellation Season 1',
  'Launch season with battle pass style progression and rewards.',
  now() - interval '2 days',
  now() + interval '120 days',
  120,
  80,
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  xp_per_level = excluded.xp_per_level,
  max_level = excluded.max_level,
  is_active = excluded.is_active,
  updated_at = now();

create table if not exists public.profile_season_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  season_id uuid not null references public.orbit_seasons (id) on delete cascade,
  xp integer not null default 0,
  level integer not null default 1,
  claimed_level integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, season_id),
  constraint profile_season_progress_xp_check check (xp >= 0),
  constraint profile_season_progress_level_check check (level >= 1),
  constraint profile_season_progress_claimed_check check (claimed_level >= 0)
);

drop trigger if exists trg_profile_season_progress_updated_at on public.profile_season_progress;
create trigger trg_profile_season_progress_updated_at
before update on public.profile_season_progress
for each row execute function public.set_updated_at();

create index if not exists idx_profile_season_progress_profile
  on public.profile_season_progress (profile_id, updated_at desc);

create table if not exists public.orbit_achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  metric_type text not null default 'MESSAGES',
  target_value integer not null,
  reward_starbits integer not null default 100,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orbit_achievements_metric_check check (
    metric_type in ('MESSAGES', 'LOGINS', 'QUESTS', 'VOICE_MINUTES', 'SOCIAL')
  ),
  constraint orbit_achievements_target_check check (target_value > 0),
  constraint orbit_achievements_reward_check check (reward_starbits >= 0)
);

drop trigger if exists trg_orbit_achievements_updated_at on public.orbit_achievements;
create trigger trg_orbit_achievements_updated_at
before update on public.orbit_achievements
for each row execute function public.set_updated_at();

insert into public.orbit_achievements (
  slug,
  title,
  description,
  metric_type,
  target_value,
  reward_starbits,
  sort_order,
  is_active
)
values
  (
    'first-steps',
    'First Steps',
    'Log your first activity in Orbit progression.',
    'SOCIAL',
    1,
    120,
    10,
    true
  ),
  (
    'message-sprinter',
    'Message Sprinter',
    'Complete 50 tracked message actions.',
    'MESSAGES',
    50,
    260,
    20,
    true
  ),
  (
    'quest-master',
    'Quest Master',
    'Complete 15 tracked quest actions.',
    'QUESTS',
    15,
    350,
    30,
    true
  )
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  metric_type = excluded.metric_type,
  target_value = excluded.target_value,
  reward_starbits = excluded.reward_starbits,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

create table if not exists public.profile_achievement_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.orbit_achievements (id) on delete cascade,
  progress_value integer not null default 0,
  unlocked_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, achievement_id),
  constraint profile_achievement_progress_value_check check (progress_value >= 0)
);

drop trigger if exists trg_profile_achievement_progress_updated_at on public.profile_achievement_progress;
create trigger trg_profile_achievement_progress_updated_at
before update on public.profile_achievement_progress
for each row execute function public.set_updated_at();

create index if not exists idx_profile_achievement_progress_profile
  on public.profile_achievement_progress (profile_id, updated_at desc);

create table if not exists public.profile_competitive_points (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  points integer not null default 0,
  wins integer not null default 0,
  streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_competitive_points_points_check check (points >= 0),
  constraint profile_competitive_points_wins_check check (wins >= 0),
  constraint profile_competitive_points_streak_check check (streak >= 0)
);

drop trigger if exists trg_profile_competitive_points_updated_at on public.profile_competitive_points;
create trigger trg_profile_competitive_points_updated_at
before update on public.profile_competitive_points
for each row execute function public.set_updated_at();

create index if not exists idx_profile_competitive_points_leaderboard
  on public.profile_competitive_points (points desc, updated_at asc);

create or replace function public.ensure_profile_competitive_points(target_profile uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_profile is null then
    return;
  end if;

  insert into public.profile_competitive_points (profile_id)
  values (target_profile)
  on conflict (profile_id) do nothing;
end;
$$;

create or replace function public.orbit_record_activity(
  metric text,
  base_points integer default 12,
  amount integer default 1
)
returns table (
  total_points integer,
  season_slug text,
  season_level integer,
  season_xp integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_metric text;
  safe_points integer;
  safe_amount integer;
  awarded_points integer;
  points_row public.profile_competitive_points%rowtype;
  season_row public.orbit_seasons%rowtype;
  season_progress_row public.profile_season_progress%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  normalized_metric := upper(trim(coalesce(metric, 'SOCIAL')));
  safe_points := greatest(coalesce(base_points, 12), 1);
  safe_amount := greatest(coalesce(amount, 1), 1);
  awarded_points := safe_points * safe_amount;

  perform public.ensure_profile_competitive_points(auth.uid());

  update public.profile_competitive_points
  set
    points = points + awarded_points,
    updated_at = now()
  where profile_id = auth.uid()
  returning * into points_row;

  select *
  into season_row
  from public.orbit_seasons s
  where s.is_active = true
    and s.starts_at <= now()
    and s.ends_at >= now()
  order by s.starts_at asc
  limit 1;

  if season_row.id is not null then
    insert into public.profile_season_progress (
      profile_id,
      season_id,
      xp,
      level,
      claimed_level
    )
    values (auth.uid(), season_row.id, 0, 1, 0)
    on conflict (profile_id, season_id) do nothing;

    update public.profile_season_progress
    set
      xp = xp + awarded_points,
      level = least(
        season_row.max_level,
        greatest(1, ((xp + awarded_points) / season_row.xp_per_level) + 1)
      ),
      updated_at = now()
    where profile_id = auth.uid()
      and season_id = season_row.id
    returning * into season_progress_row;
  end if;

  insert into public.profile_achievement_progress (
    profile_id,
    achievement_id
  )
  select auth.uid(), a.id
  from public.orbit_achievements a
  where a.is_active = true
    and a.metric_type = normalized_metric
  on conflict (profile_id, achievement_id) do nothing;

  update public.profile_achievement_progress p
  set
    progress_value = least(a.target_value, p.progress_value + safe_amount),
    unlocked_at = case
      when p.progress_value + safe_amount >= a.target_value
        then coalesce(p.unlocked_at, now())
      else p.unlocked_at
    end,
    updated_at = now()
  from public.orbit_achievements a
  where p.profile_id = auth.uid()
    and p.achievement_id = a.id
    and a.is_active = true
    and a.metric_type = normalized_metric;

  return query
  select
    points_row.points,
    season_row.slug,
    coalesce(season_progress_row.level, 1),
    coalesce(season_progress_row.xp, 0);
end;
$$;

create or replace function public.orbit_claim_achievement_reward(target_slug text)
returns table (
  achievement_slug text,
  rewarded integer,
  balance integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_slug text;
  achievement_row public.orbit_achievements%rowtype;
  progress_row public.profile_achievement_progress%rowtype;
  wallet_row public.profile_wallets%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  normalized_slug := lower(trim(coalesce(target_slug, '')));
  if normalized_slug = '' then
    raise exception 'Achievement slug is required';
  end if;

  perform public.ensure_profile_monetization(auth.uid());

  select *
  into achievement_row
  from public.orbit_achievements a
  where a.slug = normalized_slug
    and a.is_active = true
  limit 1;

  if achievement_row.id is null then
    raise exception 'Achievement not found';
  end if;

  insert into public.profile_achievement_progress (
    profile_id,
    achievement_id
  )
  values (auth.uid(), achievement_row.id)
  on conflict (profile_id, achievement_id) do nothing;

  select *
  into progress_row
  from public.profile_achievement_progress p
  where p.profile_id = auth.uid()
    and p.achievement_id = achievement_row.id
  for update;

  if progress_row.unlocked_at is null then
    raise exception 'Achievement is not unlocked yet';
  end if;

  select *
  into wallet_row
  from public.profile_wallets w
  where w.profile_id = auth.uid()
  for update;

  if progress_row.claimed_at is not null then
    return query
    select achievement_row.slug, 0, wallet_row.starbits_balance;
    return;
  end if;

  update public.profile_wallets
  set
    starbits_balance = starbits_balance + achievement_row.reward_starbits,
    lifetime_earned = lifetime_earned + achievement_row.reward_starbits,
    updated_at = now()
  where profile_id = auth.uid()
  returning * into wallet_row;

  update public.profile_achievement_progress
  set
    claimed_at = now(),
    updated_at = now()
  where id = progress_row.id;

  insert into public.profile_wallet_transactions (
    profile_id,
    amount,
    reason,
    metadata,
    balance_after
  )
  values (
    auth.uid(),
    achievement_row.reward_starbits,
    'ACHIEVEMENT_REWARD',
    jsonb_build_object('achievement_slug', achievement_row.slug),
    wallet_row.starbits_balance
  );

  return query
  select achievement_row.slug, achievement_row.reward_starbits, wallet_row.starbits_balance;
end;
$$;

create or replace function public.orbit_claim_season_levels(target_level integer)
returns table (
  season_slug text,
  levels_claimed integer,
  rewarded integer,
  balance integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_level integer;
  season_row public.orbit_seasons%rowtype;
  progress_row public.profile_season_progress%rowtype;
  wallet_row public.profile_wallets%rowtype;
  claim_count integer;
  reward_total integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  requested_level := greatest(coalesce(target_level, 0), 0);
  if requested_level = 0 then
    raise exception 'target_level must be greater than 0';
  end if;

  perform public.ensure_profile_monetization(auth.uid());

  select *
  into season_row
  from public.orbit_seasons s
  where s.is_active = true
    and s.starts_at <= now()
    and s.ends_at >= now()
  order by s.starts_at asc
  limit 1;

  if season_row.id is null then
    raise exception 'No active season';
  end if;

  insert into public.profile_season_progress (
    profile_id,
    season_id,
    xp,
    level,
    claimed_level
  )
  values (auth.uid(), season_row.id, 0, 1, 0)
  on conflict (profile_id, season_id) do nothing;

  select *
  into progress_row
  from public.profile_season_progress p
  where p.profile_id = auth.uid()
    and p.season_id = season_row.id
  for update;

  if progress_row.level < requested_level then
    raise exception 'Requested level is not unlocked yet';
  end if;

  claim_count := requested_level - progress_row.claimed_level;
  if claim_count <= 0 then
    select *
    into wallet_row
    from public.profile_wallets w
    where w.profile_id = auth.uid();

    return query
    select season_row.slug, 0, 0, wallet_row.starbits_balance;
    return;
  end if;

  reward_total := claim_count * 35;

  select *
  into wallet_row
  from public.profile_wallets w
  where w.profile_id = auth.uid()
  for update;

  update public.profile_wallets
  set
    starbits_balance = starbits_balance + reward_total,
    lifetime_earned = lifetime_earned + reward_total,
    updated_at = now()
  where profile_id = auth.uid()
  returning * into wallet_row;

  update public.profile_season_progress
  set
    claimed_level = requested_level,
    updated_at = now()
  where id = progress_row.id;

  insert into public.profile_wallet_transactions (
    profile_id,
    amount,
    reason,
    metadata,
    balance_after
  )
  values (
    auth.uid(),
    reward_total,
    'SEASON_PASS_REWARD',
    jsonb_build_object(
      'season_slug', season_row.slug,
      'levels_claimed', claim_count,
      'target_level', requested_level
    ),
    wallet_row.starbits_balance
  );

  return query
  select season_row.slug, claim_count, reward_total, wallet_row.starbits_balance;
end;
$$;

create table if not exists public.creator_tiers (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references public.profiles (id) on delete cascade,
  server_id uuid references public.servers (id) on delete set null,
  slug text not null,
  title text not null,
  monthly_price_starbits integer not null,
  benefits text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_profile_id, slug),
  constraint creator_tiers_price_check check (monthly_price_starbits >= 50)
);

drop trigger if exists trg_creator_tiers_updated_at on public.creator_tiers;
create trigger trg_creator_tiers_updated_at
before update on public.creator_tiers
for each row execute function public.set_updated_at();

create table if not exists public.creator_support_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tier_id uuid not null references public.creator_tiers (id) on delete cascade,
  creator_profile_id uuid not null references public.profiles (id) on delete cascade,
  supporter_profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'ACTIVE',
  started_at timestamptz not null default now(),
  renews_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tier_id, supporter_profile_id),
  constraint creator_support_status_check check (status in ('ACTIVE', 'CANCELED'))
);

drop trigger if exists trg_creator_support_subscriptions_updated_at on public.creator_support_subscriptions;
create trigger trg_creator_support_subscriptions_updated_at
before update on public.creator_support_subscriptions
for each row execute function public.set_updated_at();

create table if not exists public.creator_tips (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references public.profiles (id) on delete cascade,
  supporter_profile_id uuid not null references public.profiles (id) on delete cascade,
  amount_starbits integer not null,
  note text,
  created_at timestamptz not null default now(),
  constraint creator_tips_amount_check check (amount_starbits > 0 and amount_starbits <= 50000)
);

create index if not exists idx_creator_tips_creator_created
  on public.creator_tips (creator_profile_id, created_at desc);

create or replace function public.orbit_send_creator_tip(
  creator_profile uuid,
  tip_amount integer,
  note text default null
)
returns table (
  balance integer,
  tipped integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_tip integer;
  sender_wallet public.profile_wallets%rowtype;
  creator_wallet public.profile_wallets%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if creator_profile is null then
    raise exception 'creator_profile is required';
  end if;

  safe_tip := greatest(coalesce(tip_amount, 0), 0);
  if safe_tip <= 0 then
    raise exception 'tip_amount must be greater than zero';
  end if;

  perform public.ensure_profile_monetization(auth.uid());
  perform public.ensure_profile_monetization(creator_profile);

  select *
  into sender_wallet
  from public.profile_wallets w
  where w.profile_id = auth.uid()
  for update;

  if sender_wallet.starbits_balance < safe_tip then
    raise exception 'Not enough Starbits';
  end if;

  update public.profile_wallets
  set
    starbits_balance = starbits_balance - safe_tip,
    updated_at = now()
  where profile_id = auth.uid()
  returning * into sender_wallet;

  update public.profile_wallets
  set
    starbits_balance = starbits_balance + safe_tip,
    lifetime_earned = lifetime_earned + safe_tip,
    updated_at = now()
  where profile_id = creator_profile
  returning * into creator_wallet;

  insert into public.creator_tips (
    creator_profile_id,
    supporter_profile_id,
    amount_starbits,
    note
  )
  values (
    creator_profile,
    auth.uid(),
    safe_tip,
    case
      when note is null then null
      else left(trim(note), 280)
    end
  );

  insert into public.profile_wallet_transactions (
    profile_id,
    amount,
    reason,
    metadata,
    balance_after
  )
  values
    (
      auth.uid(),
      safe_tip * -1,
      'CREATOR_TIP_SENT',
      jsonb_build_object('creator_profile', creator_profile),
      sender_wallet.starbits_balance
    ),
    (
      creator_profile,
      safe_tip,
      'CREATOR_TIP_RECEIVED',
      jsonb_build_object('supporter_profile', auth.uid()),
      creator_wallet.starbits_balance
    );

  return query
  select sender_wallet.starbits_balance, safe_tip;
end;
$$;

create table if not exists public.marketplace_apps (
  slug text primary key,
  name text not null,
  description text not null,
  category text not null default 'UTILITY',
  developer_name text not null,
  install_url text,
  icon_emoji text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_apps_category_check check (
    category in ('UTILITY', 'ENGAGEMENT', 'MODERATION', 'MONETIZATION', 'AI')
  )
);

drop trigger if exists trg_marketplace_apps_updated_at on public.marketplace_apps;
create trigger trg_marketplace_apps_updated_at
before update on public.marketplace_apps
for each row execute function public.set_updated_at();

insert into public.marketplace_apps (
  slug,
  name,
  description,
  category,
  developer_name,
  install_url,
  icon_emoji,
  sort_order,
  is_active
)
values
  (
    'orbit-polls',
    'Orbit Polls',
    'Native poll workflows with advanced vote analytics.',
    'ENGAGEMENT',
    'Orbit Labs',
    'https://orbit.app/apps/orbit-polls',
    'POLL',
    10,
    true
  ),
  (
    'shield-ai',
    'Shield AI',
    'Automated moderation and toxicity triage flows.',
    'MODERATION',
    'Orbit Labs',
    'https://orbit.app/apps/shield-ai',
    'SHIELD',
    20,
    true
  ),
  (
    'creator-link',
    'Creator Link',
    'Subscription, perks, and creator storefront integration.',
    'MONETIZATION',
    'Orbit Labs',
    'https://orbit.app/apps/creator-link',
    'CREATOR',
    30,
    true
  ),
  (
    'orbit-assist',
    'Orbit Assist',
    'In-channel smart drafting, summarization, and replies.',
    'AI',
    'Orbit Labs',
    'https://orbit.app/apps/orbit-assist',
    'AI',
    40,
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  developer_name = excluded.developer_name,
  install_url = excluded.install_url,
  icon_emoji = excluded.icon_emoji,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

create table if not exists public.server_installed_apps (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  app_slug text not null references public.marketplace_apps (slug) on delete cascade,
  installed_by uuid not null references public.profiles (id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (server_id, app_slug)
);

create index if not exists idx_server_installed_apps_server
  on public.server_installed_apps (server_id, created_at desc);

alter table public.orbit_server_templates enable row level security;
alter table public.channel_role_permissions enable row level security;
alter table public.server_events enable row level security;
alter table public.forum_tags enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_post_tags enable row level security;
alter table public.forum_replies enable row level security;
alter table public.call_clips enable row level security;
alter table public.server_ai_settings enable row level security;
alter table public.orbit_seasons enable row level security;
alter table public.profile_season_progress enable row level security;
alter table public.orbit_achievements enable row level security;
alter table public.profile_achievement_progress enable row level security;
alter table public.profile_competitive_points enable row level security;
alter table public.creator_tiers enable row level security;
alter table public.creator_support_subscriptions enable row level security;
alter table public.creator_tips enable row level security;
alter table public.marketplace_apps enable row level security;
alter table public.server_installed_apps enable row level security;

drop policy if exists "orbit_server_templates_select_authenticated" on public.orbit_server_templates;
create policy "orbit_server_templates_select_authenticated"
on public.orbit_server_templates
for select
to authenticated
using (is_active = true);

drop policy if exists "channel_role_permissions_select_members" on public.channel_role_permissions;
create policy "channel_role_permissions_select_members"
on public.channel_role_permissions
for select
to authenticated
using (public.is_server_member(server_id));

drop policy if exists "channel_role_permissions_insert_staff" on public.channel_role_permissions;
create policy "channel_role_permissions_insert_staff"
on public.channel_role_permissions
for insert
to authenticated
with check (public.is_server_staff(server_id));

drop policy if exists "channel_role_permissions_update_staff" on public.channel_role_permissions;
create policy "channel_role_permissions_update_staff"
on public.channel_role_permissions
for update
to authenticated
using (public.is_server_staff(server_id))
with check (public.is_server_staff(server_id));

drop policy if exists "channel_role_permissions_delete_staff" on public.channel_role_permissions;
create policy "channel_role_permissions_delete_staff"
on public.channel_role_permissions
for delete
to authenticated
using (public.is_server_staff(server_id));

drop policy if exists "server_events_select_members" on public.server_events;
create policy "server_events_select_members"
on public.server_events
for select
to authenticated
using (public.is_server_member(server_id));

drop policy if exists "server_events_insert_staff" on public.server_events;
create policy "server_events_insert_staff"
on public.server_events
for insert
to authenticated
with check (
  host_profile_id = auth.uid()
  and public.is_server_staff(server_id)
);

drop policy if exists "server_events_update_host_or_staff" on public.server_events;
create policy "server_events_update_host_or_staff"
on public.server_events
for update
to authenticated
using (
  host_profile_id = auth.uid()
  or public.is_server_staff(server_id)
)
with check (
  host_profile_id = auth.uid()
  or public.is_server_staff(server_id)
);

drop policy if exists "server_events_delete_host_or_staff" on public.server_events;
create policy "server_events_delete_host_or_staff"
on public.server_events
for delete
to authenticated
using (
  host_profile_id = auth.uid()
  or public.is_server_staff(server_id)
);

drop policy if exists "forum_tags_select_members" on public.forum_tags;
create policy "forum_tags_select_members"
on public.forum_tags
for select
to authenticated
using (public.is_server_member(server_id));

drop policy if exists "forum_tags_insert_staff" on public.forum_tags;
create policy "forum_tags_insert_staff"
on public.forum_tags
for insert
to authenticated
with check (
  public.is_server_staff(server_id)
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "forum_tags_update_staff" on public.forum_tags;
create policy "forum_tags_update_staff"
on public.forum_tags
for update
to authenticated
using (public.is_server_staff(server_id))
with check (public.is_server_staff(server_id));

drop policy if exists "forum_posts_select_members" on public.forum_posts;
create policy "forum_posts_select_members"
on public.forum_posts
for select
to authenticated
using (public.is_server_member(server_id));

drop policy if exists "forum_posts_insert_members" on public.forum_posts;
create policy "forum_posts_insert_members"
on public.forum_posts
for insert
to authenticated
with check (
  author_profile_id = auth.uid()
  and public.is_server_member(server_id)
);

drop policy if exists "forum_posts_update_author_or_staff" on public.forum_posts;
create policy "forum_posts_update_author_or_staff"
on public.forum_posts
for update
to authenticated
using (
  author_profile_id = auth.uid()
  or public.is_server_staff(server_id)
)
with check (
  author_profile_id = auth.uid()
  or public.is_server_staff(server_id)
);

drop policy if exists "forum_posts_delete_author_or_staff" on public.forum_posts;
create policy "forum_posts_delete_author_or_staff"
on public.forum_posts
for delete
to authenticated
using (
  author_profile_id = auth.uid()
  or public.is_server_staff(server_id)
);

drop policy if exists "forum_post_tags_select_members" on public.forum_post_tags;
create policy "forum_post_tags_select_members"
on public.forum_post_tags
for select
to authenticated
using (
  exists (
    select 1
    from public.forum_posts p
    where p.id = forum_post_tags.post_id
      and public.is_server_member(p.server_id)
  )
);

drop policy if exists "forum_post_tags_insert_author_or_staff" on public.forum_post_tags;
create policy "forum_post_tags_insert_author_or_staff"
on public.forum_post_tags
for insert
to authenticated
with check (
  exists (
    select 1
    from public.forum_posts p
    where p.id = forum_post_tags.post_id
      and (
        p.author_profile_id = auth.uid()
        or public.is_server_staff(p.server_id)
      )
  )
);

drop policy if exists "forum_post_tags_delete_author_or_staff" on public.forum_post_tags;
create policy "forum_post_tags_delete_author_or_staff"
on public.forum_post_tags
for delete
to authenticated
using (
  exists (
    select 1
    from public.forum_posts p
    where p.id = forum_post_tags.post_id
      and (
        p.author_profile_id = auth.uid()
        or public.is_server_staff(p.server_id)
      )
  )
);

drop policy if exists "forum_replies_select_members" on public.forum_replies;
create policy "forum_replies_select_members"
on public.forum_replies
for select
to authenticated
using (
  exists (
    select 1
    from public.forum_posts p
    where p.id = forum_replies.post_id
      and public.is_server_member(p.server_id)
  )
);

drop policy if exists "forum_replies_insert_members" on public.forum_replies;
create policy "forum_replies_insert_members"
on public.forum_replies
for insert
to authenticated
with check (
  author_profile_id = auth.uid()
  and exists (
    select 1
    from public.forum_posts p
    where p.id = forum_replies.post_id
      and public.is_server_member(p.server_id)
      and p.locked = false
  )
);

drop policy if exists "forum_replies_update_author_or_staff" on public.forum_replies;
create policy "forum_replies_update_author_or_staff"
on public.forum_replies
for update
to authenticated
using (
  author_profile_id = auth.uid()
  or exists (
    select 1
    from public.forum_posts p
    where p.id = forum_replies.post_id
      and public.is_server_staff(p.server_id)
  )
)
with check (
  author_profile_id = auth.uid()
  or exists (
    select 1
    from public.forum_posts p
    where p.id = forum_replies.post_id
      and public.is_server_staff(p.server_id)
  )
);

drop policy if exists "forum_replies_delete_author_or_staff" on public.forum_replies;
create policy "forum_replies_delete_author_or_staff"
on public.forum_replies
for delete
to authenticated
using (
  author_profile_id = auth.uid()
  or exists (
    select 1
    from public.forum_posts p
    where p.id = forum_replies.post_id
      and public.is_server_staff(p.server_id)
  )
);

drop policy if exists "call_clips_select_members" on public.call_clips;
create policy "call_clips_select_members"
on public.call_clips
for select
to authenticated
using (public.is_server_member(server_id));

drop policy if exists "call_clips_insert_members" on public.call_clips;
create policy "call_clips_insert_members"
on public.call_clips
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_server_member(server_id)
);

drop policy if exists "call_clips_delete_creator_or_staff" on public.call_clips;
create policy "call_clips_delete_creator_or_staff"
on public.call_clips
for delete
to authenticated
using (
  created_by = auth.uid()
  or public.is_server_staff(server_id)
);

drop policy if exists "server_ai_settings_select_members" on public.server_ai_settings;
create policy "server_ai_settings_select_members"
on public.server_ai_settings
for select
to authenticated
using (public.is_server_member(server_id));

drop policy if exists "server_ai_settings_insert_staff" on public.server_ai_settings;
create policy "server_ai_settings_insert_staff"
on public.server_ai_settings
for insert
to authenticated
with check (public.is_server_staff(server_id));

drop policy if exists "server_ai_settings_update_staff" on public.server_ai_settings;
create policy "server_ai_settings_update_staff"
on public.server_ai_settings
for update
to authenticated
using (public.is_server_staff(server_id))
with check (public.is_server_staff(server_id));

drop policy if exists "orbit_seasons_select_authenticated" on public.orbit_seasons;
create policy "orbit_seasons_select_authenticated"
on public.orbit_seasons
for select
to authenticated
using (is_active = true);

drop policy if exists "profile_season_progress_select_own" on public.profile_season_progress;
create policy "profile_season_progress_select_own"
on public.profile_season_progress
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "orbit_achievements_select_authenticated" on public.orbit_achievements;
create policy "orbit_achievements_select_authenticated"
on public.orbit_achievements
for select
to authenticated
using (is_active = true);

drop policy if exists "profile_achievement_progress_select_own" on public.profile_achievement_progress;
create policy "profile_achievement_progress_select_own"
on public.profile_achievement_progress
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "profile_competitive_points_select_authenticated" on public.profile_competitive_points;
create policy "profile_competitive_points_select_authenticated"
on public.profile_competitive_points
for select
to authenticated
using (true);

drop policy if exists "creator_tiers_select_authenticated" on public.creator_tiers;
create policy "creator_tiers_select_authenticated"
on public.creator_tiers
for select
to authenticated
using (is_active = true);

drop policy if exists "creator_tiers_insert_owner" on public.creator_tiers;
create policy "creator_tiers_insert_owner"
on public.creator_tiers
for insert
to authenticated
with check (
  creator_profile_id = auth.uid()
  and (server_id is null or public.is_server_staff(server_id))
);

drop policy if exists "creator_tiers_update_owner" on public.creator_tiers;
create policy "creator_tiers_update_owner"
on public.creator_tiers
for update
to authenticated
using (creator_profile_id = auth.uid())
with check (creator_profile_id = auth.uid());

drop policy if exists "creator_support_subscriptions_select_related" on public.creator_support_subscriptions;
create policy "creator_support_subscriptions_select_related"
on public.creator_support_subscriptions
for select
to authenticated
using (
  supporter_profile_id = auth.uid()
  or creator_profile_id = auth.uid()
);

drop policy if exists "creator_support_subscriptions_insert_supporter" on public.creator_support_subscriptions;
create policy "creator_support_subscriptions_insert_supporter"
on public.creator_support_subscriptions
for insert
to authenticated
with check (
  supporter_profile_id = auth.uid()
  and creator_profile_id <> auth.uid()
);

drop policy if exists "creator_support_subscriptions_update_related" on public.creator_support_subscriptions;
create policy "creator_support_subscriptions_update_related"
on public.creator_support_subscriptions
for update
to authenticated
using (
  supporter_profile_id = auth.uid()
  or creator_profile_id = auth.uid()
)
with check (
  supporter_profile_id = auth.uid()
  or creator_profile_id = auth.uid()
);

drop policy if exists "creator_tips_select_related" on public.creator_tips;
create policy "creator_tips_select_related"
on public.creator_tips
for select
to authenticated
using (
  creator_profile_id = auth.uid()
  or supporter_profile_id = auth.uid()
);

drop policy if exists "marketplace_apps_select_authenticated" on public.marketplace_apps;
create policy "marketplace_apps_select_authenticated"
on public.marketplace_apps
for select
to authenticated
using (is_active = true);

drop policy if exists "server_installed_apps_select_members" on public.server_installed_apps;
create policy "server_installed_apps_select_members"
on public.server_installed_apps
for select
to authenticated
using (public.is_server_member(server_id));

drop policy if exists "server_installed_apps_insert_staff" on public.server_installed_apps;
create policy "server_installed_apps_insert_staff"
on public.server_installed_apps
for insert
to authenticated
with check (
  installed_by = auth.uid()
  and public.is_server_staff(server_id)
);

drop policy if exists "server_installed_apps_delete_staff" on public.server_installed_apps;
create policy "server_installed_apps_delete_staff"
on public.server_installed_apps
for delete
to authenticated
using (public.is_server_staff(server_id));

do $$
begin
  alter publication supabase_realtime add table public.channel_role_permissions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.server_events;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.forum_posts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.forum_replies;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.call_clips;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.server_ai_settings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profile_season_progress;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profile_achievement_progress;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profile_competitive_points;
exception when duplicate_object then null;
end $$;
