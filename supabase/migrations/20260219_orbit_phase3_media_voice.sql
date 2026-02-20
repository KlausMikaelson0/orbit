-- Orbit Phase 3: Media Storage + Moderation support
-- Run after Phase 2 migration.

create table if not exists public.server_bans (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  banned_by uuid not null references public.profiles (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (server_id, profile_id)
);

alter table public.server_bans enable row level security;

drop policy if exists "server_bans_select_staff" on public.server_bans;
create policy "server_bans_select_staff"
on public.server_bans
for select
to authenticated
using (public.is_server_staff(server_id));

drop policy if exists "server_bans_insert_staff" on public.server_bans;
create policy "server_bans_insert_staff"
on public.server_bans
for insert
to authenticated
with check (
  public.is_server_staff(server_id)
  and banned_by = auth.uid()
);

drop policy if exists "server_bans_delete_staff" on public.server_bans;
create policy "server_bans_delete_staff"
on public.server_bans
for delete
to authenticated
using (public.is_server_staff(server_id));

drop policy if exists "members_insert_self_or_staff" on public.members;
create policy "members_insert_self_or_staff"
on public.members
for insert
to authenticated
with check (
  (
    profile_id = auth.uid()
    and role = 'GUEST'
    and not exists (
      select 1
      from public.server_bans sb
      where sb.server_id = members.server_id
        and sb.profile_id = auth.uid()
    )
  )
  or public.is_server_staff(server_id)
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'message-attachments',
  'message-attachments',
  true,
  15728640,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "message_attachments_public_read" on storage.objects;
create policy "message_attachments_public_read"
on storage.objects
for select
to public
using (bucket_id = 'message-attachments');

drop policy if exists "message_attachments_authenticated_upload" on storage.objects;
create policy "message_attachments_authenticated_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'message-attachments'
  and owner = auth.uid()
);

drop policy if exists "message_attachments_owner_update" on storage.objects;
create policy "message_attachments_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'message-attachments'
  and owner = auth.uid()
)
with check (
  bucket_id = 'message-attachments'
  and owner = auth.uid()
);

drop policy if exists "message_attachments_owner_delete" on storage.objects;
create policy "message_attachments_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'message-attachments'
  and owner = auth.uid()
);

do $$
begin
  alter publication supabase_realtime add table public.server_bans;
exception when duplicate_object then null;
end $$;
