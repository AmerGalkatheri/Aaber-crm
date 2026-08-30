# ABAR CRM — Multi-Number WhatsApp Migration

## Objective

Move WhatsApp from the legacy single-configuration model to the ABAR `channel_accounts` model while preserving existing conversations, credentials, and webhook compatibility during the transition.

## Implemented in this phase

- Legacy `whatsapp_config` now has a business-facing `display_name`.
- The old one-user/one-WhatsApp uniqueness rule is removed; provider `phone_number_id` uniqueness remains protected.
- Existing WhatsApp configurations are represented in `channel_accounts`.
- A database bridge keeps legacy configuration changes synchronized with the channel abstraction.
- Existing conversations/messages remain linked to their generated channel account through migration 040.

## Routing contract for the next application phase

1. Resolve inbound WhatsApp events by Meta `phone_number_id` to `channel_accounts`.
2. Resolve the customer through `customer_identities`.
3. Resolve or create a conversation using `conversation.channel_account_id`.
4. Apply routing rules for account/team/agent/AI.
5. Send replies using the selected `channel_account_id`, never a global WhatsApp configuration.

## Safety rules

- Do not delete `whatsapp_config` yet.
- Do not expose access tokens to browser clients.
- Do not use a single-row `.single()` lookup for WhatsApp configuration after multi-number support is enabled.
- Keep `phone_number_id` as the provider routing key and `display_name` as the employee-facing business identity.

## Exit criteria

The legacy WhatsApp configuration can be retired only after inbound webhook routing, outbound sending, templates, media, registration, health checks, and UI settings all use `channel_accounts`.
