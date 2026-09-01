# WhatsApp Adapter Acceptance Tests

| ID | Test | Expected |
|---|---|---|
| WA-AD-001 | Valid message webhook | One normalized event is produced. |
| WA-AD-002 | Multiple entries/messages | Every message is normalized independently. |
| WA-AD-003 | Known phone_number_id | Event can be resolved to its channel account. |
| WA-AD-004 | Unknown phone_number_id | No fallback to another WhatsApp account. |
| WA-AD-005 | Same customer on two business numbers | External identities remain scoped to each channel account. |
| WA-AD-006 | Duplicate provider message ID | Persistence layer treats it as idempotent. |
| WA-AD-007 | Outbound account A | Account A credentials and phone-number identity are used. |
| WA-AD-008 | Outbound account B | Account B credentials and phone-number identity are used. |
| WA-AD-009 | Business display name | Inbox displays channel account `display_name`. |
| WA-AD-010 | Provider secret exposure | Normalized event contains no access token or secret. |

## Required checks

- `npm run lint`
- `npm run typecheck`
- `npm test`
- Integration test against a non-production Meta test number before production cutover.
