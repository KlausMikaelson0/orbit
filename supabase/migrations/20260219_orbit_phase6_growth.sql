-- Orbit Phase 6: Growth + ecosystem foundations
-- Run after Phase 2, 3, 4, and 5 migrations.

create extension if not exists "pgcrypto";

create table if not exists public.server_webhooks (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  sender_member_id uuid not null references public.members (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  secret_hash text not null,
  is_active boolean not null default true,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_server_webhooks_server_id
  on public.server_webhooks (server_id);

create index if not exists idx_server_webhooks_channel_id
  on public.server_webhooks (channel_id);

create index if not exists idx_server_webhooks_active
  on public.server_webhooks (is_active, channel_id);

create or replace function public.validate_server_webhook_targets()
returns trigger
language plpgsql
as $$
declare
  channel_server_id uuid;
  member_server_id uuid;
begin
  select c.server_id
  into channel_server_id
  from public.channels c
  where c.id = new.channel_id;

  select m.server_id
  into member_server_id
  from public.members m
  where m.id = new.sender_member_id;

  if channel_server_id is null then
    raise exception 'Invalid channel_id for webhook';
  end if;

  if member_server_id is null then
    raise exception 'Invalid sender_member_id for webhook';
  end if;

  if channel_server_id <> new.server_id then
    raise exception 'Webhook server_id must match channel server_id';
  end if;

  if member_server_id <> new.server_id then
    raise exception 'Webhook sender member must belong to webhook server_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_server_webhooks on public.server_webhooks;
create trigger trg_validate_server_webhooks
before insert or update on public.server_webhooks
for each row execute function public.validate_server_webhook_targets();

drop trigger if exists trg_server_webhooks_updated_at on public.server_webhooks;
create trigger trg_server_webhooks_updated_at
before update on public.server_webhooks
for each row execute function public.set_updated_at();

alter table public.server_webhooks enable row level security;

drop policy if exists "server_webhooks_select_staff" on public.server_webhooks;
create policy "server_webhooks_select_staff"
on public.server_webhooks
for select
to authenticated
using (public.is_server_staff(server_id));

drop policy if exists "server_webhooks_insert_staff" on public.server_webhooks;
create policy "server_webhooks_insert_staff"
on public.server_webhooks
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_server_staff(server_id)
);

drop policy if exists "server_webhooks_update_staff" on public.server_webhooks;
create policy "server_webhooks_update_staff"
on public.server_webhooks
for update
to authenticated
using (public.is_server_staff(server_id))
with check (public.is_server_staff(server_id));

drop policy if exists "server_webhooks_delete_staff" on public.server_webhooks;
create policy "server_webhooks_delete_staff"
on public.server_webhooks
for delete
to authenticated
using (public.is_server_staff(server_id));

do $$
begin
  alter publication supabase_realtime add table public.server_webhooks;
exception when duplicate_object then null;
end $$;
