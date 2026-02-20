-- Orbit Phase 2: Database Schema + Realtime foundation
-- Run this migration in Supabase SQL Editor.

create extension if not exists "pgcrypto";

drop table if exists public.messages cascade;
drop table if exists public.members cascade;
drop table if exists public.channels cascade;
drop table if exists public.servers cascade;
drop table if exists public.profiles cascade;

drop type if exists public.channel_type cascade;
drop type if exists public.member_role cascade;

create type public.channel_type as enum ('TEXT', 'AUDIO', 'VIDEO');
create type public.member_role as enum ('ADMIN', 'MODERATOR', 'GUEST');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

create table public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  invite_code text not null unique,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.channel_type not null default 'TEXT',
  server_id uuid not null references public.servers (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  role public.member_role not null default 'GUEST',
  profile_id uuid not null references public.profiles (id) on delete cascade,
  server_id uuid not null references public.servers (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, server_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  content text,
  file_url text,
  member_id uuid not null references public.members (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_has_content_or_file check (
    coalesce(length(trim(content)), 0) > 0 or file_url is not null
  )
);

create index idx_servers_owner_id on public.servers (owner_id);
create index idx_channels_server_id on public.channels (server_id);
create index idx_members_profile_id on public.members (profile_id);
create index idx_members_server_id on public.members (server_id);
create index idx_messages_channel_id_created_at on public.messages (channel_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_servers_updated_at
before update on public.servers
for each row execute function public.set_updated_at();

create trigger trg_channels_updated_at
before update on public.channels
for each row execute function public.set_updated_at();

create trigger trg_members_updated_at
before update on public.members
for each row execute function public.set_updated_at();

create trigger trg_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

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

  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    suggested_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    username = coalesce(excluded.username, public.profiles.username),
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.is_server_member(target_server uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.members m
    where m.server_id = target_server
      and m.profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.servers s
    where s.id = target_server
      and s.owner_id = auth.uid()
  );
$$;

create or replace function public.is_server_staff(target_server uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.members m
    where m.server_id = target_server
      and m.profile_id = auth.uid()
      and m.role in ('ADMIN', 'MODERATOR')
  )
  or exists (
    select 1
    from public.servers s
    where s.id = target_server
      and s.owner_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.servers enable row level security;
alter table public.channels enable row level security;
alter table public.members enable row level security;
alter table public.messages enable row level security;

create policy "profiles_select_authenticated"
on public.profiles
for select to authenticated
using (true);

create policy "profiles_insert_own"
on public.profiles
for insert to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "servers_select_for_members"
on public.servers
for select to authenticated
using (public.is_server_member(id) or owner_id = auth.uid());

create policy "servers_insert_owner_only"
on public.servers
for insert to authenticated
with check (owner_id = auth.uid());

create policy "servers_update_owner_only"
on public.servers
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "channels_select_for_members"
on public.channels
for select to authenticated
using (public.is_server_member(server_id));

create policy "channels_insert_staff"
on public.channels
for insert to authenticated
with check (public.is_server_staff(server_id));

create policy "channels_update_staff"
on public.channels
for update to authenticated
using (public.is_server_staff(server_id))
with check (public.is_server_staff(server_id));

create policy "members_select_server_members"
on public.members
for select to authenticated
using (public.is_server_member(server_id));

create policy "members_insert_self_or_staff"
on public.members
for insert to authenticated
with check (
  (profile_id = auth.uid() and role = 'GUEST')
  or public.is_server_staff(server_id)
);

create policy "members_update_staff"
on public.members
for update to authenticated
using (public.is_server_staff(server_id))
with check (public.is_server_staff(server_id));

create policy "messages_select_server_members"
on public.messages
for select to authenticated
using (
  exists (
    select 1
    from public.channels c
    where c.id = messages.channel_id
      and public.is_server_member(c.server_id)
  )
);

create policy "messages_insert_own_member"
on public.messages
for insert to authenticated
with check (
  exists (
    select 1
    from public.members m
    join public.channels c on c.server_id = m.server_id
    where m.id = messages.member_id
      and m.profile_id = auth.uid()
      and c.id = messages.channel_id
  )
);

create policy "messages_update_owner"
on public.messages
for update to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.id = messages.member_id
      and m.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.members m
    where m.id = messages.member_id
      and m.profile_id = auth.uid()
  )
);

create policy "messages_delete_owner_or_staff"
on public.messages
for delete to authenticated
using (
  exists (
    select 1
    from public.members m
    join public.channels c on c.server_id = m.server_id
    where m.id = messages.member_id
      and (
        m.profile_id = auth.uid()
        or public.is_server_staff(c.server_id)
      )
  )
);

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.servers;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.channels;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.members;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
