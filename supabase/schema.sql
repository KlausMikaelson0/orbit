create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'channel_type') then
    create type public.channel_type as enum ('TEXT', 'AUDIO', 'VIDEO');
  end if;

  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type public.member_role as enum ('ADMIN', 'MODERATOR', 'GUEST');
  end if;

  if not exists (select 1 from pg_type where typname = 'profile_status') then
    create type public.profile_status as enum ('ONLINE', 'AWAY', 'OFFLINE');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  display_name text,
  avatar_url text,
  status public.profile_status not null default 'ONLINE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  invite_code text not null unique,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  name text not null,
  type public.channel_type not null default 'TEXT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (server_id, name)
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'GUEST',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (server_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text,
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_requires_content_or_file check (
    coalesce(length(trim(content)), 0) > 0 or file_url is not null
  )
);

create index if not exists idx_servers_owner_id on public.servers (owner_id);
create index if not exists idx_channels_server_id on public.channels (server_id);
create index if not exists idx_members_server_id on public.members (server_id);
create index if not exists idx_members_user_id on public.members (user_id);
create index if not exists idx_messages_channel_id on public.messages (channel_id);
create index if not exists idx_messages_user_id on public.messages (user_id);
create index if not exists idx_messages_created_at on public.messages (created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_servers_updated_at on public.servers;
create trigger set_servers_updated_at
before update on public.servers
for each row
execute function public.set_updated_at();

drop trigger if exists set_channels_updated_at on public.channels;
create trigger set_channels_updated_at
before update on public.channels
for each row
execute function public.set_updated_at();

drop trigger if exists set_members_updated_at on public.members;
create trigger set_members_updated_at
before update on public.members
for each row
execute function public.set_updated_at();

drop trigger if exists set_messages_updated_at on public.messages;
create trigger set_messages_updated_at
before update on public.messages
for each row
execute function public.set_updated_at();

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_created();

create or replace function public.can_access_server(target_server uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.servers s
    left join public.members m
      on m.server_id = s.id
      and m.user_id = auth.uid()
    where s.id = target_server
      and (s.owner_id = auth.uid() or m.user_id is not null)
  );
$$;

create or replace function public.has_server_staff_access(target_server uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.servers s
    left join public.members m
      on m.server_id = s.id
      and m.user_id = auth.uid()
    where s.id = target_server
      and (
        s.owner_id = auth.uid()
        or m.role in ('ADMIN', 'MODERATOR')
      )
  );
$$;

alter table public.profiles enable row level security;
alter table public.servers enable row level security;
alter table public.channels enable row level security;
alter table public.members enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Members can read servers" on public.servers;
create policy "Members can read servers"
on public.servers
for select
to authenticated
using (public.can_access_server(id));

drop policy if exists "Owners can create servers" on public.servers;
create policy "Owners can create servers"
on public.servers
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Owners can update servers" on public.servers;
create policy "Owners can update servers"
on public.servers
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete servers" on public.servers;
create policy "Owners can delete servers"
on public.servers
for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Members can read channels" on public.channels;
create policy "Members can read channels"
on public.channels
for select
to authenticated
using (public.can_access_server(server_id));

drop policy if exists "Staff can create channels" on public.channels;
create policy "Staff can create channels"
on public.channels
for insert
to authenticated
with check (public.has_server_staff_access(server_id));

drop policy if exists "Staff can update channels" on public.channels;
create policy "Staff can update channels"
on public.channels
for update
to authenticated
using (public.has_server_staff_access(server_id))
with check (public.has_server_staff_access(server_id));

drop policy if exists "Staff can delete channels" on public.channels;
create policy "Staff can delete channels"
on public.channels
for delete
to authenticated
using (public.has_server_staff_access(server_id));

drop policy if exists "Members can read members list" on public.members;
create policy "Members can read members list"
on public.members
for select
to authenticated
using (public.can_access_server(server_id));

drop policy if exists "Staff can manage members" on public.members;
create policy "Staff can manage members"
on public.members
for all
to authenticated
using (public.has_server_staff_access(server_id))
with check (public.has_server_staff_access(server_id));

drop policy if exists "Members can read messages" on public.messages;
create policy "Members can read messages"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.channels c
    where c.id = messages.channel_id
      and public.can_access_server(c.server_id)
  )
);

drop policy if exists "Users can create messages in accessible channels" on public.messages;
create policy "Users can create messages in accessible channels"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.channels c
    where c.id = messages.channel_id
      and public.can_access_server(c.server_id)
  )
);

drop policy if exists "Users can update own messages" on public.messages;
create policy "Users can update own messages"
on public.messages
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own messages or staff can moderate" on public.messages;
create policy "Users can delete own messages or staff can moderate"
on public.messages
for delete
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.channels c
    where c.id = messages.channel_id
      and public.has_server_staff_access(c.server_id)
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Attachment bucket is public readable" on storage.objects;
create policy "Attachment bucket is public readable"
on storage.objects
for select
to public
using (bucket_id = 'attachments');

drop policy if exists "Authenticated users can upload attachments" on storage.objects;
create policy "Authenticated users can upload attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'attachments'
  and owner = auth.uid()
);

drop policy if exists "Users can update own attachments" on storage.objects;
create policy "Users can update own attachments"
on storage.objects
for update
to authenticated
using (bucket_id = 'attachments' and owner = auth.uid())
with check (bucket_id = 'attachments' and owner = auth.uid());

drop policy if exists "Users can delete own attachments" on storage.objects;
create policy "Users can delete own attachments"
on storage.objects
for delete
to authenticated
using (bucket_id = 'attachments' and owner = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.servers;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.channels;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.members;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;
