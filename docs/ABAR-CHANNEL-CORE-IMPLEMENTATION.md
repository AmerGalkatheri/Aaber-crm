# ABAR Channel Core — Implementation Status

## Implemented in this stage

- `conversations.channel_account_id` is now available as an additive foreign key.
- A deterministic channel-account resolver validates WhatsApp `phone_number_id` before processing an inbound event.
- Inactive/error channel accounts are rejected rather than silently routed elsewhere.
- Unit tests cover successful resolution, unknown IDs, inactive accounts, and missing WhatsApp identity.

## Compatibility rule

Historical conversations are not guessed into a channel account. They remain nullable until a deterministic backfill source is available.

## Next integration step

The existing WhatsApp webhook and outbound send core must call the resolver and persist/use the resolved `channel_account_id`. That integration should be merged only after the existing route tests and the new resolver tests pass in CI.

## Verification

Required CI commands:

```text
npm run lint
npm run typecheck
npm test
```

A real Meta webhook/send smoke test with two WhatsApp numbers remains required before production enablement.
