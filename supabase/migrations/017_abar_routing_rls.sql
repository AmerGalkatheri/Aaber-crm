-- ABAR routing + assignment hardening
-- Adds explicit routing metadata without changing the mature WA CRM core.

alter table if exists public.conversations
  add column if not exists department_id uuid,
  add column if not exists routing_profile_id uuid;

create index if not exists conversations_account_status_updated_idx
  on public.conversations(account_id, status, updated_at desc);

create index if not exists conversations_account_assigned_idx
  on public.conversations(account_id, assigned_agent_id)
  where assigned_agent_id is not null;

create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at desc);

create index if not exists customer_identities_external_lookup_idx
  on public.customer_identities(channel_account_id, external_user_id);

-- A channel event is processed at most once. This is intentionally database-level.
create unique index if not exists channel_events_event_key_unique
  on public.channel_events(event_key);

comment on column public.conversations.department_id is 'ABAR routing department/team identifier';
comment on column public.conversations.routing_profile_id is 'ABAR routing profile identifier';
