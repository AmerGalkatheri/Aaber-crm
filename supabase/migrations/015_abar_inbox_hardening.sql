-- ABAR Inbox hardening: database-level idempotency and fast inbox lookups.
-- Safe to run repeatedly.

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_channel_external_id
  ON messages (channel_account_id, external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_inbox_order
  ON conversations (account_id, status, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_conversations_channel_mode
  ON conversations (account_id, channel_account_id, mode, priority);

CREATE INDEX IF NOT EXISTS idx_customer_identities_external_lookup
  ON customer_identities (channel_account_id, external_user_id);
