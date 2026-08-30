# ABAR CRM — Unified Inbox Core

## Objective

Provide one conversation workspace for WhatsApp, Instagram, and Messenger while preserving the originating channel account and the ABAR business-facing display name.

## Conversation identity

Every conversation is scoped by `channel_account_id`. A customer may have multiple external identities, but each external identity remains unique to its channel account.

## Display rules

The UI should show `channel_accounts.display_name` as the primary channel label. Technical provider identifiers such as phone number IDs, page IDs, and access tokens must not be presented as the business-facing name.

## Routing precedence

1. Explicit agent assignment.
2. Channel-account routing profile plus department target.
3. Department target.
4. Unassigned queue.

AI routing can be inserted before step 4 or configured as a routing profile, but AI must never silently take over a conversation explicitly assigned to a human.

## Channel adapters

The inbox consumes normalized events. Provider-specific payload parsing belongs in channel adapters; the inbox should not depend on Meta-specific payload shapes.

Normalized inbound event minimum:

- channel
- channel account ID
- external conversation/user ID
- customer identity
- message ID
- message type
- message timestamp
- content/media reference
- provider metadata

## Safety requirements

- Never fall back from an unknown channel account to another account.
- Never use a global WhatsApp credential for an account-scoped send.
- Enforce authorization for channel-account visibility.
- Make inbound event processing idempotent.
- Keep provider secrets out of conversation records and UI responses.
