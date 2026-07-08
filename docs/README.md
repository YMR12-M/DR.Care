# 📚 توثيق مشروع DR.Care

فهرس كل ملفات التوثيق. للنظرة العامة على المشروع نفسه (تشغيل، بنية المجلدات، الصفحات) راجع [README.md](../README.md) في الجذر.

| الملف | المحتوى |
|-------|---------|
| **[FEATURES.md](./FEATURES.md)** | **الدليل الشامل** — كل ميزة، كل endpoint، وكل جدول قاعدة بيانات بالتفصيل |
| [BOOKING_WORKFLOW.md](./BOOKING_WORKFLOW.md) | دورة حياة الحجز (State Machine)، مخططات mermaid للبنية والتدفقات |
| [CUSTOMER_SYSTEM.md](./CUSTOMER_SYSTEM.md) | تسجيل/دخول العميل، تفعيل البريد، استعادة كلمة المرور، الملف الشخصي |
| [LOGIN_SYSTEM.md](./LOGIN_SYSTEM.md) | تسجيل دخول لوحة الإدارة |
| [PROFILE_SYSTEM.md](./PROFILE_SYSTEM.md) | صفحة الملف الشخصي للعميل وتدفقات UX |
| [ADMIN_SYSTEM.md](./ADMIN_SYSTEM.md) | لوحة الإدارة الكاملة — حجوزات، كوبونات، مواعيد، عملاء، بث |
| [POS_SYSTEM.md](./POS_SYSTEM.md) | نقطة البيع (الفرع) — فواتير مباشرة، بحث، إحصائيات |
| [PRICING_SYSTEM.md](./PRICING_SYSTEM.md) | مصدر الأسعار الفعلي + تحذير مهم عن `pricing.php`/Java غير المتزامنين |
| [NOTIFICATIONS_SYSTEM.md](./NOTIFICATIONS_SYSTEM.md) | البريد، واتساب، Web Push — ونقطة ضعف حقيقية في push للضيوف |
| [LOYALTY_REFERRAL_SYSTEM.md](./LOYALTY_REFERRAL_SYSTEM.md) | نقاط الولاء، الإحالة، استبدال النقاط بكوبونات |
| **[MOBILE_APP.md](./MOBILE_APP.md)** | **تطبيق React الجديد** — ⚠️ الحجز مكسور بالكامل فيه حالياً، تفاصيل دقيقة |
| [TESTING.md](./TESTING.md) | الاختبارات وCI — وفجوة إن `mobile-app/` مالوش أي اختبار أو CI |
| [ROADMAP.md](./ROADMAP.md) | خطة عمل مرتبة بالأولوية لكل الفجوات المكتشفة |

## من أين أبدأ؟

- **جديد على المشروع؟** ابدأ بـ [FEATURES.md](./FEATURES.md) ثم [BOOKING_WORKFLOW.md](./BOOKING_WORKFLOW.md).
- **بتشتغل على حجز/حالة/دفع؟** [BOOKING_WORKFLOW.md](./BOOKING_WORKFLOW.md) + [PRICING_SYSTEM.md](./PRICING_SYSTEM.md).
- **بتشتغل على حساب عميل؟** [CUSTOMER_SYSTEM.md](./CUSTOMER_SYSTEM.md) + [LOYALTY_REFERRAL_SYSTEM.md](./LOYALTY_REFERRAL_SYSTEM.md).
- **بتشتغل على إشعارات؟** [NOTIFICATIONS_SYSTEM.md](./NOTIFICATIONS_SYSTEM.md) — فيه فجوة حقيقية مذكورة بالتفصيل (push بيوصل لكل الناس بدل الشخص الصح).
- **بتشتغل على `mobile-app/`؟** اقرأ [MOBILE_APP.md](./MOBILE_APP.md) **قبل** أي حاجة تانية — الحجز مكسور فيه حالياً لأسباب موثّقة بالسطر.
- **عايز تعرف إيه الناقص؟** [ROADMAP.md](./ROADMAP.md).

## قاعدة أساسية لكل من يعدّل هذه الملفات

كل ملف هنا وُثّق بقراءة الكود الفعلي وقت الكتابة، مش افتراضات. لو غيّرت سلوك في الكود يخالف حاجة موثّقة هنا، حدّث الملف المعني في نفس الـ commit — التوثيق القديم أخطر من عدم وجود توثيق أصلاً (زي ما حصل في `FEATURES.md` §8.5 و§9.2 قبل ما نصححهم).

---

**آخر تحديث:** 2026
