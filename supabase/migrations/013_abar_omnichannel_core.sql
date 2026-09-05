-- ABAR CRM Phase 2-3: Channel abstraction, multi-number WhatsApp,
-- unified inbox, customer identity resolution and audit primitives.
-- Designed to extend WA CRM without rewriting its mature core.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE CHECK (key IN ('whatsapp','messenger','instagram')),
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channel_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL,
  external_account_id TEXT,
  external_phone_number_id TEXT,
  business_account_id TEXT,
  routing_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  department TEXT,
  team TEXT,
  ai_agent_key TEXT,
  credentials_ref TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','error')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_id, external_account_id),
  UNIQUE(user_id, external_phone_number_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_accounts_user ON channel_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_accounts_channel ON channel_accounts(channel_id);

CREATE TABLE IF NOT EXISTS channel_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_account_id UUID REFERENCES channel_accounts(id) ON DELETE SET NULL,
  external_event_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature_valid BOOLEAN,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel_account_id, external_event_id)
);
CREATE INDEX IF NOT EXISTS idx_channel_events_account_created ON channel_events(channel_account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  locale TEXT DEFAULT 'ar',
  timezone TEXT,
  lifecycle_stage TEXT NOT NULL DEFAULT 'lead',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(user_id, phone);

CREATE TABLE IF NOT EXISTS customer_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE RESTRICT,
  channel_account_id UUID REFERENCES channel_accounts(id) ON DELETE SET NULL,
  external_user_id TEXT NOT NULL,
  external_username TEXT,
  external_phone TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel_id, channel_account_id, external_user_id)
);
CREATE INDEX IF NOT EXISTS idx_customer_identities_customer ON customer_identities(customer_id);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel_account_id UUID REFERENCES channel_accounts(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'human' CHECK (mode IN ('human','ai'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS routing_profile JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_channel TEXT;
CREATE INDEX IF NOT EXISTS idx_conversations_channel_account ON conversations(channel_account_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('customer','agent','bot')),
  external_identity_id UUID REFERENCES customer_identities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel_account_id UUID REFERENCES channel_accounts(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_message_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound','outbound'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS raw_payload JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_messages_channel_account ON messages(channel_account_id);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_message_id);

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assignments_conversation_active ON assignments(conversation_id, active);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_address INET,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at DESC);

-- Seed supported channels. Safe on repeated migration runs.
INSERT INTO channels (key, name) VALUES
  ('whatsapp','WhatsApp'),
  ('messenger','Messenger'),
  ('instagram','Instagram')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name;

-- RLS: single-organization model, data owned by the authenticated user.
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view channels" ON channels;
CREATE POLICY "Authenticated users can view channels" ON channels FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users manage own channel accounts" ON channel_accounts;
CREATE POLICY "Users manage own channel accounts" ON channel_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own channel events" ON channel_events;
CREATE POLICY "Users manage own channel events" ON channel_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own customers" ON customers;
CREATE POLICY "Users manage own customers" ON customers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage customer identities" ON customer_identities;
CREATE POLICY "Users manage customer identities" ON customer_identities FOR ALL USING (
  EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_identities.customer_id AND c.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_identities.customer_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users manage conversation participants" ON conversation_participants;
CREATE POLICY "Users manage conversation participants" ON conversation_participants FOR ALL USING (
  EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_participants.conversation_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users manage assignments" ON assignments;
CREATE POLICY "Users manage assignments" ON assignments FOR ALL USING (auth.uid() = user_id OR auth.uid() = assigned_by);

DROP POLICY IF EXISTS "Users view own audit logs" ON audit_logs;
CREATE POLICY "Users view own audit logs" ON audit_logs FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE channel_accounts IS 'ABAR channel abstraction: one organization may connect multiple accounts/numbers per channel.';
COMMENT ON TABLE customer_identities IS 'Maps external identities from WhatsApp, Messenger and Instagram to one internal customer.';
COMMENT ON TABLE channel_events IS 'Webhook/event inbox supporting idempotency and asynchronous processing.';
