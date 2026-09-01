create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.inbox_threads(id) on delete cascade,
  channel_account_id uuid not null references public.channel_accounts(id) on delete restrict,
  external_message_id text not null,
  external_user_id text,
  direction text not null check (direction in ('inbound','outbound')),
  message_type text not null default 'text',
  body text,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (channel_account_id, external_message_id)
);

create index if not exists inbox_messages_thread_created_idx on public.inbox_messages(thread_id, created_at desc);
create index if not exists inbox_messages_account_created_idx on public.inbox_messages(channel_account_id, created_at desc);
create index if not exists inbox_messages_external_user_idx on public.inbox_messages(channel_account_id, external_user_id);

alter table public.inbox_messages enable row level security;

create policy "authenticated users can read inbox messages"
  on public.inbox_messages for select to authenticated using (true);
