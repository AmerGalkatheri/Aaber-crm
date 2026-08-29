-- ============================================================
-- 040_channel_core.sql — ABAR CRM channel abstraction foundation
--
-- Additive migration. It does not remove or rewrite the existing
-- WhatsApp configuration so the current production flow remains
-- recoverable while the new channel core is introduced.
--
-- Design goals:
--   - Multiple channel accounts per ABAR account.
--   - Business-facing display names independent from phone numbers.
--   - A conversation belongs to the channel account that received it.
--   - Cross-channel customer identities can resolve to one contact.
--   - Credentials remain outside the public channel-account metadata.
-- ============================================================

-- ============================================================
-- CHANNEL ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS channel_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'instagram', 'messenger')),
  provider TEXT NOT NULL DEFAULT 'meta',
  display_name TEXT NOT NULL,
  external_account_id TEXT,
  external_phone_number_id TEXT,
  external_username TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'disconnected', 'pending', 'error', 'disabled')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ,
  last_health_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channel_accounts_account
  ON channel_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_channel_accounts_type
  ON channel_accounts(account_id, channel_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_accounts_whatsapp_phone
  ON channel_accounts(channel_type, external_phone_number_id)
  WHERE channel_type = 'whatsapp' AND external_phone_number_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_accounts_external_account
  ON channel_accounts(channel_type, provider, external_account_id)
  WHERE external_account_id IS NOT NULL;

ALTER TABLE channel_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Account members can view channel accounts" ON channel_accounts;
DROP POLICY IF EXISTS "Account admins can manage channel accounts" ON channel_accounts;
CREATE POLICY "Account members can view channel accounts"
  ON channel_accounts FOR SELECT
  USING (is_account_member(account_id, 'viewer'));
CREATE POLICY "Account admins can manage channel accounts"
  ON channel_accounts FOR ALL
  USING (is_account_member(account_id, 'admin'))
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON channel_accounts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON channel_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Keep at most one default channel account per channel type/account.
CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_accounts_one_default
  ON channel_accounts(account_id, channel_type)
  WHERE is_default = TRUE;

-- ============================================================
-- CHANNEL CREDENTIALS
-- ============================================================
-- Only encrypted values are stored here. The encryption key is an
-- application secret and must never be stored in this table.
CREATE TABLE IF NOT EXISTS channel_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_account_id UUID NOT NULL REFERENCES channel_accounts(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,
  secret_ciphertext TEXT NOT NULL,
  secret_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_account_id, credential_type)
);

CREATE INDEX IF NOT EXISTS idx_channel_credentials_channel
  ON channel_credentials(channel_account_id);

ALTER TABLE channel_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Account admins can manage channel credentials" ON channel_credentials;
CREATE POLICY "Account admins can manage channel credentials"
  ON channel_credentials FOR ALL
  USING (EXISTS (
    SELECT 1 FROM channel_accounts ca
    WHERE ca.id = channel_credentials.channel_account_id
      AND is_account_member(ca.account_id, 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM channel_accounts ca
    WHERE ca.id = channel_credentials.channel_account_id
      AND is_account_member(ca.account_id, 'admin')
  ));

DROP TRIGGER IF EXISTS set_updated_at ON channel_credentials;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON channel_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CUSTOMER IDENTITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel_account_id UUID REFERENCES channel_accounts(id) ON DELETE SET NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'instagram', 'messenger')),
  external_identity_id TEXT NOT NULL,
  display_name TEXT,
  username TEXT,
  phone TEXT,
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, channel_type, external_identity_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_identities_contact
  ON customer_identities(contact_id);
CREATE INDEX IF NOT EXISTS idx_customer_identities_channel
  ON customer_identities(account_id, channel_type, channel_account_id);

ALTER TABLE customer_identities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Account members can view customer identities" ON customer_identities;
DROP POLICY IF EXISTS "Account agents can manage customer identities" ON customer_identities;
CREATE POLICY "Account members can view customer identities"
  ON customer_identities FOR SELECT
  USING (is_account_member(account_id, 'viewer'));
CREATE POLICY "Account agents can manage customer identities"
  ON customer_identities FOR ALL
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP TRIGGER IF EXISTS set_updated_at ON customer_identities;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON customer_identities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CONVERSATION / MESSAGE CHANNEL LINKAGE
-- ============================================================
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS channel_account_id UUID REFERENCES channel_accounts(id) ON DELETE SET NULL;
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS channel_account_id UUID REFERENCES channel_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_channel_account
  ON conversations(channel_account_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_channel_account
  ON messages(channel_account_id, created_at DESC);

-- Backfill existing WhatsApp conversations/messages to a generated
-- channel account. This is intentionally conservative: it uses the
-- current account's existing WhatsApp config and does not duplicate
-- or delete any configuration.
DO $$
DECLARE
  r RECORD;
  v_channel_id UUID;
BEGIN
  FOR r IN
    SELECT wc.account_id, wc.phone_number_id, wc.waba_id
    FROM whatsapp_config wc
    WHERE wc.account_id IS NOT NULL
  LOOP
    SELECT ca.id INTO v_channel_id
    FROM channel_accounts ca
    WHERE ca.account_id = r.account_id
      AND ca.channel_type = 'whatsapp'
      AND ca.external_phone_number_id = r.phone_number_id
    LIMIT 1;

    IF v_channel_id IS NULL THEN
      INSERT INTO channel_accounts (
        account_id,
        channel_type,
        provider,
        display_name,
        external_account_id,
        external_phone_number_id,
        status,
        is_default,
        metadata
      )
      VALUES (
        r.account_id,
        'whatsapp',
        'meta',
        'WhatsApp',
        r.waba_id,
        r.phone_number_id,
        'disconnected',
        TRUE,
        jsonb_build_object('migrated_from', 'whatsapp_config')
      )
      RETURNING id INTO v_channel_id;
    END IF;

    UPDATE conversations
      SET channel_account_id = v_channel_id
    WHERE account_id = r.account_id
      AND channel_account_id IS NULL;

    UPDATE messages m
      SET channel_account_id = v_channel_id
    FROM conversations c
    WHERE c.id = m.conversation_id
      AND c.account_id = r.account_id
      AND m.channel_account_id IS NULL;
  END LOOP;
END $$;

COMMENT ON TABLE channel_accounts IS
  'ABAR omnichannel accounts. display_name is the business-facing identity; external IDs are provider identifiers.';
COMMENT ON TABLE channel_credentials IS
  'Encrypted provider credentials for channel accounts. Never store plaintext access tokens.';
COMMENT ON TABLE customer_identities IS
  'Maps provider identities from WhatsApp, Instagram and Messenger to one ABAR contact.';
