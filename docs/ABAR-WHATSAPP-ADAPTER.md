# ABAR CRM — WhatsApp Adapter

The WhatsApp adapter is the provider boundary between Meta webhook payloads and the ABAR Unified Inbox.

## Inbound flow

`Meta Webhook → normalizeWhatsAppWebhook → channelAccountExternalId → channel_accounts → customer_identities → conversation → Unified Inbox`

For WhatsApp, `metadata.phone_number_id` is the authoritative channel-account key. The customer's `from` value is only the external customer identity and must never be used to select the business account.

## Normalized event

The adapter emits a provider-neutral shape containing:

- channel
- channel account external ID
- external customer ID
- external message ID
- timestamp
- message type
- text when present
- customer profile name when present
- provider metadata

## Safety

- Unknown `phone_number_id` must be rejected by the persistence layer/resolver rather than falling back to another account.
- Provider credentials must remain server-side.
- External message IDs should be used for idempotency before persistence.
- The adapter must not expose access tokens in normalized events.

## Outbound boundary

Outbound sending must receive a resolved `channel_account_id`, load that account's credentials server-side, and send through that account's WhatsApp phone-number identity. A global WhatsApp credential must not be used for account-scoped sends.

## Current scope

This commit implements normalization and the Unified Inbox contract. Provider HTTP delivery and production webhook handler replacement remain a separate integration step so existing WhatsApp behavior can be smoke-tested before cutover.
