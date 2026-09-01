# ABAR CRM — Inbound Persistence

## Lifecycle

`Normalized event → channel account → customer identity → inbox thread → message → thread update`

The persistence service is deliberately provider-neutral. WhatsApp, Instagram, and Messenger adapters produce the normalized record; the persistence layer stores it without depending on provider payload shapes.

## Idempotency

The service checks `(channel_account_id, external_message_id)` before creating a message. The database should enforce the same invariant with a unique constraint/index on the message table when that table is introduced or identified.

## Identity isolation

Customer identities are resolved by `(channel_account_id, external_user_id)`. The same external user identifier may therefore exist independently under different business channel accounts.

## Conversation isolation

Threads are resolved by `(channel_account_id, external_conversation_id)`. An unknown or mismatched account must never fall back to another account.

## Current repository boundary

The service is a persistence contract. The concrete Supabase repository implementation must map its methods to the existing `customers`, `customer_identities`, and `inbox_threads` tables and to the repository's actual message table before production cutover.
