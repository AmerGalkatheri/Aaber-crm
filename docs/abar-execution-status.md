# ABAR CRM — Execution Status

Source of truth: `ABAR_CRM_Technical_SRS_v1.0.docx`.

## Migration sequence

| Phase | Scope | Status |
|---|---|---|
| 0 | Fork + Baseline + CI/CD + Backup | In progress |
| 1 | ABAR Branding + RTL/LTR | In progress |
| 2 | Channel Abstraction + Multi-number WhatsApp | In progress |
| 3 | Unified Inbox + Routing + Identity | Planned |
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

## Acceptance targets for Phase 2

- Multiple WhatsApp accounts can be represented independently.
- Each account can carry department/team/routing/AI associations.
- Provider-specific operations remain behind the adapter contract.
- Webhook validation is explicit and can be tested independently.

The migration deliberately preserves the mature WA CRM core and adds the channel/domain layers incrementally.
