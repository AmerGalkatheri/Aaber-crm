# ABAR CRM — Channel Core

## Status

Phase 1 foundation. This change is intentionally additive and does not switch the existing WhatsApp webhook or configuration routes yet.

## Supported channels

- WhatsApp — multiple phone numbers per ABAR account.
- Instagram — Meta account adapter planned in the next channel adapter step.
- Messenger — Meta account adapter planned in the next channel adapter step.

## Business identity

Every channel account has a required `display_name`. The UI should present this name as the primary business identity. Provider identifiers such as WhatsApp phone number IDs remain technical identifiers and are shown only where operationally useful.

## Data model

`channel_accounts` is the provider-neutral registry. It identifies the business-facing channel account and its provider metadata.

`channel_credentials` stores encrypted provider secrets. Plaintext access tokens must never be persisted.

`customer_identities` maps a provider identity to one ABAR contact. This is the foundation for resolving a customer across WhatsApp, Instagram and Messenger without creating duplicate CRM contacts.

`conversations.channel_account_id` and `messages.channel_account_id` record which business channel account handled the communication.

## Compatibility rule

The legacy `whatsapp_config` table remains in place during migration. Existing WhatsApp routes continue to work until the channel-account service and multi-number UI are migrated together.

## Next implementation step

1. Create a channel-account service with account-scoped CRUD.
2. Migrate WhatsApp configuration UI from one config to a list of channel accounts.
3. Update webhook resolution to resolve by `external_phone_number_id` → `channel_accounts.id`.
4. Update send-message and templates to require a channel account.
5. Add Messenger and Instagram adapters using the same normalized event contract.
6. Add unified routing by channel account, department and agent.
