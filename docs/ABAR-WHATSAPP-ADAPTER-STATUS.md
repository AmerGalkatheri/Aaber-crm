# ABAR WhatsApp Adapter — Implementation Status

## Completed

- Provider-neutral WhatsApp webhook normalization.
- `phone_number_id` is the authoritative business-account key.
- Customer external identity is kept separate from business account identity.
- Unified Inbox routing contract integration.
- Unit tests for normalization and routing.
- CI gate for lint, typecheck, and unit tests.
- Safe cutover and rollback checklist.

## Not yet cut over

- The existing production webhook handler has not been replaced.
- The existing outbound provider call has not been switched to account-scoped credentials.
- A real Meta test-number smoke test has not been run by this repository automation.

This boundary is intentional: it prevents a partial migration from silently changing production WhatsApp behavior.
