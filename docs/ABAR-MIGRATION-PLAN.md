# ABAR CRM — Migration & Product Engineering Plan

## 1. Product identity

- Product name: ABAR CRM
- Arabic name: عابر CRM
- Company: عابر للسفر والسياحة
- Architecture: Single Organization
- Multi-Tenant: Out of scope
- Locales: Arabic RTL and English LTR

## 2. Keep / Refactor / New

### KEEP

- Next.js / React / TypeScript / Tailwind foundation.
- Supabase PostgreSQL, Auth, Storage, RLS and Realtime.
- WhatsApp Cloud API integration.
- Contacts, tags and custom fields.
- Shared Inbox core.
- Sales pipelines.
- Broadcasts and templates.
- Existing automation engine and visual flows.
- Team accounts and role-based access.
- Public API, webhooks and MCP capabilities where useful.

### REFACTOR / EXTEND

- Replace WhatsApp-centric configuration with channel accounts.
- Convert Inbox into a true Unified Inbox.
- Add multi-number WhatsApp routing.
- Add customer identity resolution across channels.
- Expand roles and permissions.
- Upgrade AI Assistant into an AI Gateway and Agent system.
- Extend automations with travel, supplier, document and AI events.
- Improve webhook idempotency, retries and execution observability.

### BUILD NEW

- Messenger channel adapter.
- Instagram channel adapter.
- Supplier Management module.
- Supplier WhatsApp Bot.
- Secure Document Requests and Upload Links.
- Shortlink/token service with expiry, revocation and tracking.
- Employee Knowledge Hub with permission-aware RAG.
- AI Tool Registry and permission gateway.
- Travel CRM extensions for bookings and visa workflows.

## 3. Delivery sequence

1. Baseline and branding.
2. Channel abstraction.
3. Multi-number WhatsApp.
4. Unified Inbox and routing.
5. Customer identity resolution.
6. Messenger and Instagram.
7. CRM improvements.
8. AI Gateway and Agents.
9. Knowledge Base / RAG.
10. Automation expansion.
11. Supplier Management and Supplier Bot.
12. Secure Documents and tracked links.
13. Travel operations extensions.
14. Security, testing, performance and production hardening.

## 4. Engineering rules

- Do not rewrite the working core without a measured reason.
- New channels must implement the common channel adapter contract.
- Sensitive files must remain private and be accessed using short-lived signed URLs.
- Store hashes of secure upload tokens rather than plaintext tokens.
- All sensitive mutations require authorization and audit logging.
- AI tool calls require explicit permission checks.
- Webhook processing must be idempotent and asynchronous where possible.
- Keep the original MIT license and copyright notice.
- Never commit production secrets.

## 5. First implementation branch

`feature/abar-branding`

Initial changes in this branch establish ABAR package metadata, application metadata and the migration plan. Feature branches should be created from `develop` after the baseline is reviewed.
