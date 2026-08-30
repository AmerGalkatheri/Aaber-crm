# ABAR Channel Core — Test & Acceptance Plan

## Scope

These tests define the minimum acceptance criteria for the channel-account migration. They are intentionally implementation-agnostic and must pass before merging channel routing into `develop`.

## Test Matrix

| ID | Area | Scenario | Expected result |
|---|---|---|---|
| CH-001 | WhatsApp | Receive a webhook containing a known `phone_number_id` | The event resolves to exactly one active `channel_account`. |
| CH-002 | WhatsApp | Receive a webhook for an unknown `phone_number_id` | Event is rejected/isolated without being attached to another account. |
| CH-003 | WhatsApp | Two active WhatsApp accounts receive messages concurrently | Each conversation/message remains attached to its originating `channel_account`. |
| CH-004 | Display name | Inbox renders a channel account | `display_name` is the primary business-facing label; technical IDs remain secondary. |
| CH-005 | Outbound | Send a message from WhatsApp account A | The provider request uses account A credentials/phone-number identity. |
| CH-006 | Outbound | Send from account B after switching conversation account | The request uses account B and never falls back to account A. |
| CH-007 | Identity | Same customer contacts from two configured channel accounts | Identities can be associated with the same customer without overwriting either external identity. |
| CH-008 | Security | User without channel-account permission requests account data | Access is denied by application authorization/RLS policy. |
| CH-009 | Idempotency | Same inbound event is delivered twice | The second delivery does not create a duplicate message/conversation. |
| CH-010 | Failure | Provider send fails | Failure is persisted with enough context for retry/diagnostics and does not report success to the UI. |

## Required Automated Coverage

1. Unit tests for phone-number/account resolution.
2. Unit tests for customer-identity resolution.
3. Integration tests for inbound webhook persistence.
4. Integration tests for outbound account selection.
5. Database tests for unique channel-account identifiers.
6. Authorization tests for channel-account visibility.
7. Idempotency tests for duplicate webhook delivery.

## Pre-merge Gate

- `npm run lint`
- `npm run typecheck`
- `npm test`
- Database migration applies cleanly to a fresh database.
- Existing WhatsApp data remains readable after migration.
- CH-001 through CH-010 pass.

## Release Rule

Do not merge the routing implementation into `develop` until all automated checks pass and a real Meta webhook/send smoke test has been completed with at least two WhatsApp channel accounts.
