-- ABAR Channel Core: make the originating channel account explicit on conversations.
-- This is additive and keeps existing conversations valid during migration.

alter table public.conversations
  add column if not exists channel_account_id uuid
  references public.channel_accounts(id)
  on delete set null;

create index if not exists conversations_channel_account_idx
  on public.conversations(channel_account_id, updated_at desc);

-- Existing conversations are intentionally left NULL. A later backfill job
-- can resolve them from legacy WhatsApp metadata when the mapping is certain.
-- We must not guess a channel account for historical rows.
