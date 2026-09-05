-- ABAR channel accounts: replaces channel-specific configuration as the integration boundary.
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE CHECK (key IN ('whatsapp','messenger','instagram')),
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO channels (key, name) VALUES
  ('whatsapp','WhatsApp'),
  ('messenger','Messenger'),
  ('instagram','Instagram')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS channel_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE RESTRICT,
  display_name text NOT NULL,
  external_account_id text NOT NULL,
  external_business_id text,
  department_id uuid,
  ai_agent_id uuid REFERENCES ai_agents(id) ON DELETE SET NULL,
  routing_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected','error')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, external_account_id)
);

CREATE TABLE IF NOT EXISTS channel_credentials (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_account_id uuid NOT NULL UNIQUE REFERENCES channel_accounts(id) ON DELETE CASCADE,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  rotated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channel_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_account_id uuid REFERENCES channel_accounts(id) ON DELETE SET NULL,
  event_key text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_key)
);

CREATE INDEX IF NOT EXISTS idx_channel_accounts_channel ON channel_accounts(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_events_account_created ON channel_events(channel_account_id, created_at DESC);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_events ENABLE ROW LEVEL SECURITY;

-- Single-organization deployment: authenticated staff can read integration metadata;
-- secrets and event writes remain server-side through the service role.
DROP POLICY IF EXISTS "Authenticated users can view channels" ON channels;
CREATE POLICY "Authenticated users can view channels" ON channels FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can view channel accounts" ON channel_accounts;
CREATE POLICY "Authenticated users can view channel accounts" ON channel_accounts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Service role manages channel accounts" ON channel_accounts;
CREATE POLICY "Service role manages channel accounts" ON channel_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role manages channel credentials" ON channel_credentials;
CREATE POLICY "Service role manages channel credentials" ON channel_credentials FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role manages channel events" ON channel_events;
CREATE POLICY "Service role manages channel events" ON channel_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS set_updated_at ON channel_accounts;
DROP TRIGGER IF EXISTS set_updated_at ON channel_credentials;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON channel_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON channel_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
