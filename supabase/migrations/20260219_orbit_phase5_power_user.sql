-- Orbit Phase 5: Power user features + production readiness primitives
-- Run after Phase 2, 3, and 4 migrations.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'channel_task_status'
  ) then
    create type public.channel_task_status as enum ('TODO', 'IN_PROGRESS', 'DONE');
  end if;
end $$;

create or replace function public.is_channel_member(target_channel uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.channels c
    where c.id = target_channel
      and public.is_server_member(c.server_id)
  );
$$;

create table if not exists public.orbit_bots (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null unique references public.servers (id) on delete cascade,
  name text not null default 'Orbit-Bot',
  provider text not null default 'mock',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.channel_tasks (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  creator_profile_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  status public.channel_task_status not null default 'TODO',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_tasks_content_check check (
    length(trim(content)) > 0 and length(content) <= 500
  )
);

create table if not exists public.message_flags (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  flagged_by uuid not null references public.profiles (id) on delete cascade,
  model text not null default 'orbit-sentiment-v1',
  score numeric(5,4) not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (message_id, flagged_by, model)
);

alter table public.messages
  add column if not exists thread_parent_id uuid references public.messages (id) on delete cascade;

create index if not exists idx_messages_channel_thread_parent
  on public.messages (channel_id, thread_parent_id, created_at);

create index if not exists idx_channel_tasks_channel_created_at
  on public.channel_tasks (channel_id, created_at);

create index if not exists idx_message_flags_message_id
  on public.message_flags (message_id);

drop trigger if exists trg_orbit_bots_updated_at on public.orbit_bots;
create trigger trg_orbit_bots_updated_at
before update on public.orbit_bots
for each row execute function public.set_updated_at();

drop trigger if exists trg_channel_tasks_updated_at on public.channel_tasks;
create trigger trg_channel_tasks_updated_at
before update on public.channel_tasks
for each row execute function public.set_updated_at();

create or replace function public.ensure_orbit_bot_for_server()
returns trigger
language plpgsql
as $$
begin
  insert into public.orbit_bots (server_id)
  values (new.id)
  on conflict (server_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_servers_create_orbit_bot on public.servers;
create trigger trg_servers_create_orbit_bot
after insert on public.servers
for each row execute function public.ensure_orbit_bot_for_server();

insert into public.orbit_bots (server_id)
select s.id
from public.servers s
left join public.orbit_bots b on b.server_id = s.id
where b.id is null;

alter table public.orbit_bots enable row level security;
alter table public.channel_tasks enable row level security;
alter table public.message_flags enable row level security;

drop policy if exists "orbit_bots_select_members" on public.orbit_bots;
create policy "orbit_bots_select_members"
on public.orbit_bots
for select
to authenticated
using (public.is_server_member(server_id));

drop policy if exists "orbit_bots_insert_staff" on public.orbit_bots;
create policy "orbit_bots_insert_staff"
on public.orbit_bots
for insert
to authenticated
with check (public.is_server_staff(server_id));

drop policy if exists "orbit_bots_update_staff" on public.orbit_bots;
create policy "orbit_bots_update_staff"
on public.orbit_bots
for update
to authenticated
using (public.is_server_staff(server_id))
with check (public.is_server_staff(server_id));

drop policy if exists "channel_tasks_select_members" on public.channel_tasks;
create policy "channel_tasks_select_members"
on public.channel_tasks
for select
to authenticated
using (public.is_channel_member(channel_id));

drop policy if exists "channel_tasks_insert_member" on public.channel_tasks;
create policy "channel_tasks_insert_member"
on public.channel_tasks
for insert
to authenticated
with check (
  creator_profile_id = auth.uid()
  and public.is_channel_member(channel_id)
);

drop policy if exists "channel_tasks_update_owner_or_staff" on public.channel_tasks;
create policy "channel_tasks_update_owner_or_staff"
on public.channel_tasks
for update
to authenticated
using (
  creator_profile_id = auth.uid()
  or exists (
    select 1
    from public.channels c
    where c.id = channel_tasks.channel_id
      and public.is_server_staff(c.server_id)
  )
)
with check (
  public.is_channel_member(channel_id)
  and (
    creator_profile_id = auth.uid()
    or exists (
      select 1
      from public.channels c
      where c.id = channel_tasks.channel_id
        and public.is_server_staff(c.server_id)
    )
  )
);

drop policy if exists "channel_tasks_delete_owner_or_staff" on public.channel_tasks;
create policy "channel_tasks_delete_owner_or_staff"
on public.channel_tasks
for delete
to authenticated
using (
  creator_profile_id = auth.uid()
  or exists (
    select 1
    from public.channels c
    where c.id = channel_tasks.channel_id
      and public.is_server_staff(c.server_id)
  )
);

drop policy if exists "message_flags_select_staff" on public.message_flags;
create policy "message_flags_select_staff"
on public.message_flags
for select
to authenticated
using (
  exists (
    select 1
    from public.messages m
    join public.channels c on c.id = m.channel_id
    where m.id = message_flags.message_id
      and public.is_server_staff(c.server_id)
  )
);

drop policy if exists "message_flags_insert_member" on public.message_flags;
create policy "message_flags_insert_member"
on public.message_flags
for insert
to authenticated
with check (
  flagged_by = auth.uid()
  and exists (
    select 1
    from public.messages m
    join public.channels c on c.id = m.channel_id
    where m.id = message_flags.message_id
      and public.is_server_member(c.server_id)
  )
);

do $$
begin
  alter publication supabase_realtime add table public.orbit_bots;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.channel_tasks;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.message_flags;
exception when duplicate_object then null;
end $$;
