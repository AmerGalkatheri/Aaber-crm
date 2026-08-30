-- ============================================================
-- 041_whatsapp_multi_number_compatibility.sql
-- ABAR CRM — migrate legacy WhatsApp configuration to the
-- multi-channel account model without deleting legacy data.
-- ============================================================

-- Business-facing name. The number remains a provider identifier;
-- employees should see this name in the ABAR UI.
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT 'WhatsApp';

-- The legacy table originally enforced one configuration per user.
-- Multi-number WhatsApp is now represented by channel_accounts.
-- Remove only the legacy user uniqueness constraint so additional
-- legacy rows can coexist during the transition. The provider-level
-- phone_number_id uniqueness remains enforced by migration 013.
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'whatsapp_config'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE 'UNIQUE (user_id)%'
  LOOP
    EXECUTE format('ALTER TABLE whatsapp_config DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

-- Every legacy WhatsApp configuration gets a corresponding channel
-- account. Existing channel accounts are reused by phone_number_id.
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
SELECT
  wc.account_id,
  'whatsapp',
  'meta',
  COALESCE(NULLIF(wc.display_name, ''), 'WhatsApp'),
  wc.waba_id,
  wc.phone_number_id,
  CASE
    WHEN wc.status = 'connected' THEN 'connected'
    ELSE 'disconnected'
  END,
  NOT EXISTS (
    SELECT 1 FROM channel_accounts existing_default
    WHERE existing_default.account_id = wc.account_id
      AND existing_default.channel_type = 'whatsapp'
      AND existing_default.is_default = TRUE
  ),
  jsonb_build_object('migrated_from', 'whatsapp_config', 'legacy_config_id', wc.id)
FROM whatsapp_config wc
WHERE wc.account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM channel_accounts ca
    WHERE ca.channel_type = 'whatsapp'
      AND ca.external_phone_number_id = wc.phone_number_id
  );

-- Keep the legacy record synchronized with the channel abstraction
-- during the transition. This avoids a split-brain configuration when
-- an operator edits a legacy WhatsApp row before the old UI is retired.
CREATE OR REPLACE FUNCTION sync_legacy_whatsapp_to_channel_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_id IS NULL THEN
    RETURN NEW;
  END IF;

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
    NEW.account_id,
    'whatsapp',
    'meta',
    COALESCE(NULLIF(NEW.display_name, ''), 'WhatsApp'),
    NEW.waba_id,
    NEW.phone_number_id,
    CASE WHEN NEW.status = 'connected' THEN 'connected' ELSE 'disconnected' END,
    NOT EXISTS (
      SELECT 1 FROM channel_accounts ca
      WHERE ca.account_id = NEW.account_id
        AND ca.channel_type = 'whatsapp'
        AND ca.is_default = TRUE
    ),
    jsonb_build_object('legacy_config_id', NEW.id)
  )
  ON CONFLICT (channel_type, external_phone_number_id)
  WHERE channel_type = 'whatsapp' AND external_phone_number_id IS NOT NULL
  DO UPDATE SET
    account_id = EXCLUDED.account_id,
    display_name = EXCLUDED.display_name,
    external_account_id = EXCLUDED.external_account_id,
    status = EXCLUDED.status,
    metadata = channel_accounts.metadata || EXCLUDED.metadata,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_legacy_whatsapp_channel_account ON whatsapp_config;
CREATE TRIGGER sync_legacy_whatsapp_channel_account
AFTER INSERT OR UPDATE OF account_id, phone_number_id, waba_id, status
ON whatsapp_config
FOR EACH ROW
EXECUTE FUNCTION sync_legacy_whatsapp_to_channel_account();

COMMENT ON FUNCTION sync_legacy_whatsapp_to_channel_account() IS
  'ABAR migration bridge: keeps legacy whatsapp_config represented in channel_accounts until legacy UI/API paths are retired.';
