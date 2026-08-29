# ABAR CRM — عابر

> منصة CRM واتصالات ومبيعات وخدمة عملاء لعابر للسفر والسياحة، مبنية على قاعدة WA CRM ومهيأة للتوسع إلى منصة Omnichannel Travel CRM.

## الرؤية

ABAR CRM هو النظام الداخلي الموحد لإدارة العملاء والمبيعات وخدمة العملاء والموردين والمحادثات الرقمية والأتمتة والذكاء الاصطناعي والمستندات الآمنة.

## النطاق المستهدف

- صندوق وارد موحد للقنوات الرقمية.
- دعم عدة أرقام WhatsApp Business ضمن المؤسسة.
- تكامل Messenger وInstagram.
- CRM للعملاء والعملاء المحتملين والفرص ومسارات المبيعات.
- AI Agents للمبيعات وخدمة العملاء والحجوزات والتأشيرات والموردين.
- قاعدة معرفة للموظفين مع استرجاع دلالي وصلاحيات.
- Automation & Workflow Engine.
- إدارة الموردين وطلبات عروض الأسعار.
- Supplier WhatsApp Bot دون لوحة تحكم للمورد في الإصدار الأساسي.
- روابط قصيرة وآمنة ومحددة الصلاحية لرفع المستندات، مع التتبع والإلغاء والاستخدام لمرة واحدة عند الحاجة.
- امتدادات الحجوزات والتأشيرات وعمليات السفر.
- دعم العربية RTL والإنجليزية LTR.
- Single Organization — لا Multi-Tenant في النطاق المستهدف.

## التقنية

- Next.js 16 / React 19 / TypeScript.
- Tailwind CSS.
- Supabase: PostgreSQL + Auth + Storage + RLS + Realtime.
- Channel Adapter Architecture للقنوات الرقمية.
- REST API + Webhooks + Queue/Workers.
- AI Gateway مستقل عن مزود النموذج.

## منهج التحويل

هذا المستودع هو Fork مستقل لقاعدة WA CRM. لن تتم إعادة كتابة المنتج بالكامل؛ سيتم الاحتفاظ بالـCore الناضج مثل Inbox وContacts وPipelines وAutomations، ثم إعادة هيكلته وتوسيعه وفق متطلبات ABAR.

### حالة المشروع

**Phase 0 — Baseline / Branding**

- إنشاء فرع `feature/abar-branding`.
- بدء تحويل metadata وpackage identity إلى ABAR.
- توثيق المعمارية المستهدفة وخطة التحويل.

### المراحل التالية

1. Channel Abstraction + Multi-number WhatsApp.
2. Unified Inbox + Customer Identity Resolution.
3. Messenger + Instagram.
4. CRM expansion.
5. AI Gateway + Agents + Tools + Human Handoff.
6. Employee Knowledge Base / RAG.
7. Automation expansion.
8. Supplier Management + Supplier Bot.
9. Secure Document Links + Tracking.
10. Travel CRM extensions.
11. Security, performance, testing and production hardening.

## الترخيص

يتم الاحتفاظ بترخيص MIT وإشعار حقوق النشر الأصلي وفق متطلبات الترخيص. تعديلات ABAR وإضافاته خاصة بهذا الـFork.

## ملاحظة تشغيلية

يجب عدم وضع مفاتيح API أو أسرار Meta أو Supabase أو مفاتيح التشفير في المستودع. استخدم متغيرات البيئة وSecrets Manager/Environment Variables في بيئة التشغيل.
