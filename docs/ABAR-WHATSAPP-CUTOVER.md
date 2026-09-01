# ABAR WhatsApp Adapter — Cutover Checklist

1. Deploy the adapter to Preview.
2. Configure one Meta test number as a `channel_account`.
3. Send an inbound text and verify `phone_number_id` resolves to the expected account.
4. Verify the customer identity is scoped to that account.
5. Verify the conversation appears in Unified Inbox with the ABAR `display_name`.
6. Send an outbound reply and verify the same channel account is used.
7. Repeat with a second WhatsApp number and verify there is no cross-account routing.
8. Deliver the same webhook twice and verify idempotency.
9. Confirm secrets are never returned to the browser or persisted in conversation records.
10. Only after all checks pass, replace the legacy single-account path.

## Rollback

Keep the legacy `whatsapp_config` path available until the two-number smoke test is signed off. Rollback means routing new traffic back to the legacy handler without deleting channel-account records or identities.
