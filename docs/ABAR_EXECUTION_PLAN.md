# ABAR CRM — Execution Plan

Based on ABAR CRM Technical SRS v1.0 and the approved customer-experience documents.

## Delivery rule

Do not rewrite the WA CRM core. Keep mature Inbox, Contacts, Pipelines, Automations, Flows, Roles and API foundations, then add modular domain capabilities around them.

## Phases

| Phase | Scope | Exit gate |
|---|---|---|
| 0 | Fork, baseline, CI/CD, backup | reproducible build + backup/restore procedure |
| 1 | ABAR branding + Arabic RTL / English LTR | ABAR identity and locale direction are active |
| 2 | Channel abstraction + multi-number WhatsApp | provider-independent adapter contract |
| 3 | Unified Inbox + routing + identity | channel messages resolve to one customer identity |
| 4 | Messenger + Instagram | verified webhooks and normalized messaging |
| 5 | CRM | travel-oriented leads/opportunities/pipelines |
| 6 | AI Gateway + Agents + Tools | permission checked tool calls + human handoff |
| 7 | Knowledge / RAG | permission-filtered Arabic/English retrieval |
| 8 | Automation expansion | travel + AI events/actions |
| 9 | Supplier Management + Supplier Bot | supplier requests/quotes and bot workflow |
| 10 | Secure Documents + Shortlinks | expiring, revocable, auditable links |
| 11 | Travel CRM | booking, visa and travel operations extensions |
| 12 | Security, load, monitoring, production hardening | all technical acceptance criteria pass |

## Customer-experience automations

The implementation should operationalize the approved journey: booking confirmation, digital guide, pre-travel reminders, driver/vehicle details, hotel/check-in coordination, support availability, and post-trip feedback. For Umrah journeys, the approved material additionally calls for preparation checklists, airport/visa/hotel/transport guidance, virtual assistance, and reassurance through repeated confirmations.

## Current implementation slice

Phase 1 has started in branch `feat/abar-phase-0-1-foundation`:

- ABAR product constants.
- Arabic locale dictionary baseline.
- Arabic RTL document direction.
- ABAR root metadata/branding.
- Provider-independent channel adapter contract for WhatsApp, Messenger and Instagram.
- Channel registry for adapter registration.

## Next engineering slices

1. Add `channels`, `channel_accounts`, `channel_credentials`, and `channel_events` migrations with RLS.
2. Refactor existing WhatsApp code behind the adapter contract without changing user-visible behavior.
3. Add multi-number account management and routing profiles.
4. Introduce `customer_identities` and deterministic identity resolution.
5. Refactor Inbox into the Messaging Core + Unified Inbox boundary.
6. Add Messenger and Instagram adapters with signature verification.
7. Add integration/E2E tests for inbound, outbound, idempotency, permissions and handoff.

## Acceptance gates

- Multiple WhatsApp numbers appear in one inbox.
- Messenger and Instagram use the same Messaging Core.
- AI tools enforce authorization before every call.
- Knowledge retrieval respects employee permissions.
- Secure document links expire, can be revoked, and emit audit events.
- Supplier requests and quotes are auditable.
- Sensitive operations are present in audit logs.
- CI runs lint, typecheck, tests, security scan, build and migration checks before production.
