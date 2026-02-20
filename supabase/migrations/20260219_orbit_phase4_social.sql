-- Orbit Phase 4: Social core (DMs, friends, global presence support)
-- Run after Phase 2 + Phase 3 migrations.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'relationship_status'
  ) then
    create type public.relationship_status as enum ('PENDING', 'ACCEPTED', 'BLOCKED');
  end if;
end $$;

alter table public.profiles
  add column if not exists tag text;

update public.profiles
set tag = lpad(((floor(random() * 9000)::int) + 1000)::text, 4, '0')
where tag is null;

alter table public.profiles
  alter column tag set default lpad(((floor(random() * 9000)::int) + 1000)::text, 4, '0');

create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.relationship_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint relationships_unique_pair unique (requester_id, addressee_id),
  constraint relationships_not_self check (requester_id <> addressee_id)
);

create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dm_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (thread_id, profile_id)
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  content text,
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dm_message_has_content_or_file check (
    coalesce(length(trim(content)), 0) > 0 or file_url is not null
  )
);

create index if not exists idx_relationships_requester on public.relationships (requester_id);
create index if not exists idx_relationships_addressee on public.relationships (addressee_id);
create index if not exists idx_dm_participants_profile on public.dm_participants (profile_id);
create index if not exists idx_dm_participants_thread on public.dm_participants (thread_id);
create index if not exists idx_dm_messages_thread_created_at on public.dm_messages (thread_id, created_at);

drop trigger if exists trg_relationships_updated_at on public.relationships;
create trigger trg_relationships_updated_at
before update on public.relationships
for each row execute function public.set_updated_at();

drop trigger if exists trg_dm_threads_updated_at on public.dm_threads;
create trigger trg_dm_threads_updated_at
before update on public.dm_threads
for each row execute function public.set_updated_at();

drop trigger if exists trg_dm_participants_updated_at on public.dm_participants;
create trigger trg_dm_participants_updated_at
before update on public.dm_participants
for each row execute function public.set_updated_at();

drop trigger if exists trg_dm_messages_updated_at on public.dm_messages;
create trigger trg_dm_messages_updated_at
before update on public.dm_messages
for each row execute function public.set_updated_at();

create or replace function public.touch_dm_thread_updated_at()
returns trigger
language plpgsql
as $$
begin
  update public.dm_threads
  set updated_at = now()
  where id = new.thread_id;

  return new;
end;
$$;

drop trigger if exists trg_touch_dm_thread_on_message on public.dm_messages;
create trigger trg_touch_dm_thread_on_message
after insert on public.dm_messages
for each row execute function public.touch_dm_thread_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  suggested_username text;
begin
  suggested_username := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'user_name'), ''),
    nullif(trim(split_part(new.email, '@', 1)), ''),
    'orbit_' || substr(new.id::text, 1, 8)
  );

  insert into public.profiles (id, username, tag, full_name, avatar_url)
  values (
    new.id,
    suggested_username,
    lpad(((floor(random() * 9000)::int) + 1000)::text, 4, '0'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    username = coalesce(excluded.username, public.profiles.username),
    tag = coalesce(public.profiles.tag, excluded.tag),
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

create or replace function public.is_dm_participant(target_thread uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.dm_participants p
    where p.thread_id = target_thread
      and p.profile_id = auth.uid()
  );
$$;

alter table public.relationships enable row level security;
alter table public.dm_threads enable row level security;
alter table public.dm_participants enable row level security;
alter table public.dm_messages enable row level security;

drop policy if exists "relationships_select_own" on public.relationships;
create policy "relationships_select_own"
on public.relationships
for select
to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "relationships_insert_requester" on public.relationships;
create policy "relationships_insert_requester"
on public.relationships
for insert
to authenticated
with check (requester_id = auth.uid() and status = 'PENDING');

drop policy if exists "relationships_update_participants" on public.relationships;
create policy "relationships_update_participants"
on public.relationships
for update
to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid())
with check (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "relationships_delete_participants" on public.relationships;
create policy "relationships_delete_participants"
on public.relationships
for delete
to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "dm_threads_select_participants" on public.dm_threads;
create policy "dm_threads_select_participants"
on public.dm_threads
for select
to authenticated
using (public.is_dm_participant(id));

drop policy if exists "dm_threads_insert_authenticated" on public.dm_threads;
create policy "dm_threads_insert_authenticated"
on public.dm_threads
for insert
to authenticated
with check (true);

drop policy if exists "dm_participants_select_participants" on public.dm_participants;
create policy "dm_participants_select_participants"
on public.dm_participants
for select
to authenticated
using (public.is_dm_participant(thread_id));

drop policy if exists "dm_participants_insert_participants" on public.dm_participants;
create policy "dm_participants_insert_participants"
on public.dm_participants
for insert
to authenticated
with check (
  profile_id = auth.uid()
  or public.is_dm_participant(thread_id)
);

drop policy if exists "dm_messages_select_participants" on public.dm_messages;
create policy "dm_messages_select_participants"
on public.dm_messages
for select
to authenticated
using (public.is_dm_participant(thread_id));

drop policy if exists "dm_messages_insert_sender" on public.dm_messages;
create policy "dm_messages_insert_sender"
on public.dm_messages
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and public.is_dm_participant(thread_id)
);

drop policy if exists "dm_messages_update_sender" on public.dm_messages;
create policy "dm_messages_update_sender"
on public.dm_messages
for update
to authenticated
using (profile_id = auth.uid() and public.is_dm_participant(thread_id))
with check (profile_id = auth.uid() and public.is_dm_participant(thread_id));

drop policy if exists "dm_messages_delete_sender" on public.dm_messages;
create policy "dm_messages_delete_sender"
on public.dm_messages
for delete
to authenticated
using (profile_id = auth.uid() and public.is_dm_participant(thread_id));

do $$
begin
  alter publication supabase_realtime add table public.relationships;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.dm_threads;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.dm_participants;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.dm_messages;
exception when duplicate_object then null;
end $$;
