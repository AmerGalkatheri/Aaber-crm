# ABAR CRM — Execution Status

Source of truth: `ABAR_CRM_Technical_SRS_v1.0.docx`.

## Migration sequence

| Phase | Scope | Status |
|---|---|---|
| 0 | Fork + Baseline + CI/CD + Backup | In progress |
| 1 | ABAR Branding + RTL/LTR | In progress |
| 2 | Channel Abstraction + Multi-number WhatsApp | In progress |
| 3 | Unified Inbox + Routing + Identity | In progress |
| 4 | Messenger + Instagram | Planned |
| 5 | CRM | Planned |
| 6 | AI Gateway + Agents + Tools | Planned |
| 7 | Knowledge / RAG | Planned |
| 8 | Automation Expansion | Planned |
| 9 | Supplier Management + Supplier Bot | Planned |
| 10 | Secure Documents + Shortlinks | Planned |
| 11 | Travel CRM | Planned |
| 12 | Security + Load + Monitoring + Production Hardening | Planned |

## Current implementation slice

- ABAR product constants and branding baseline.
- Arabic RTL / English LTR baseline.
- Provider-neutral channel contract.
- Channel registry with multi-account primitives.
- WhatsApp adapter boundary ready for provider-specific integration.
- Supabase compatibility layer for the deployed WACRM application core (`profiles`, `contacts`, `conversations`, `messages`, WhatsApp config, templates, pipelines and broadcasts).
- Phase 3 database foundation: routing profiles/members, assignment history, thread tags/notes/attachments and per-thread AI/priority settings.
- Phase 3 pure routing engine with round-robin, weighted round-robin and least-loaded selection, covered by unit tests.

## Phase 3 acceptance targets

- Unified Inbox supports channel/account/department/employee/status/priority filtering.
- Conversations can be assigned manually or automatically.
- Routing is deterministic, testable and separated from persistence.
- Assignment history is auditable.
- Human / AI / handoff state is stored per conversation.
- Tags, internal notes and attachments have dedicated persistence models.
- Customer identity can be resolved through `customer_identities` without duplicating customers.
- Realtime events remain best-effort and the Inbox can resync after reconnect/visibility changes.

## Database deployment note

The hosted Supabase project now contains both the original ABAR foundation tables and the mature application-facing compatibility tables required by the deployed Next.js code. The schema changes were applied as idempotent migrations so existing data is preserved.

The migration deliberately preserves the mature WA CRM core and adds the channel/domain layers incrementally.
