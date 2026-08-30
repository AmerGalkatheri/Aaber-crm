# ABAR CRM — Account-Scoped WhatsApp Outbound

## Flow

`Inbox Conversation → channel_account_id → server-side credentials → WhatsApp Graph API`

The sender never accepts an access token from the browser. The selected `channel_account_id` is resolved from the conversation and is the only source of the business phone-number identity.

## Contract

`sendWhatsAppText(credentials, message)` requires the server-resolved access token, phone-number ID, and Graph API version. It returns the provider message ID and the phone-number ID used.

## Cutover requirement

Before replacing the existing outbound route, the application layer must load credentials from the selected channel account and call this provider boundary. A legacy global credential must not be used as an automatic fallback for an account-scoped conversation.

## Test requirement

Automated tests cover selected-account URL construction, authorization header handling, validation failures, and provider error propagation. A real Meta test-number smoke test remains mandatory before production cutover.
