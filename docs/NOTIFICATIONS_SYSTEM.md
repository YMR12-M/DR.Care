## 🔔 نظام الإشعارات في DR.Care

## نظرة عامة

ثلاث قنوات إشعار منفصلة تماماً، كل واحدة بآلية تفعيل واعتماديات مختلفة:

| القناة | متى تُرسَل | يعتمد على |
|--------|-----------|-----------|
| **بريد إلكتروني** | حجز جديد → للأدمن فقط | SMTP أو دالة `mail()` PHP |
| **واتساب (WhatsApp Cloud API)** | حجز جديد + كل تغيير حالة → للعميل | Meta Cloud API token |
| **Web Push (VAPID)** | تغيير حالة حجز (من الأدمن) + استرجاع سنوي + بث يدوي → للعميل | مفتاح VAPID + اشتراك المتصفح |

## 1) البريد الإلكتروني

**الملف:** `sendEmail()` + `sendBookingNotification()` في `api/bootstrap.php`.

- `sendBookingNotification($booking)` تُرسَل تلقائياً بعد كل حجز جديد (ويب أو POS) إلى بريد واحد ثابت يُحدَّد بـ `DRCARE_NOTIFICATION_EMAIL` في `.env` (بريد الإدارة — **ليس** بريد العميل).
- `sendEmail()` تجرّب SMTP أولاً (`MAILER_SMTP_HOST`) ثم `mail()` PHP كـ fallback، وإلا تُرجع `false` بصمت.
- تُستخدم أيضاً في `api/customer-login.php` لإرسال رابط تفعيل البريد (`sendVerificationEmail`) وفي `api/password-reset.php` لإرسال رابط استعادة كلمة المرور.

## 2) واتساب (Meta Cloud API)

**الملف:** `sendWhatsApp()` في `api/bootstrap.php`.

- يتطلب `WHATSAPP_API_TOKEN` و`WHATSAPP_PHONE_NUMBER_ID` في `.env` — بدونهما تُرجع الدالة `false` فوراً بدون أي محاولة اتصال (مفيد في بيئة الاختبار: `tests/` لا تحتاج توكن حقيقي).
- تُطبّع رقم الهاتف المصري (`01xxxxxxxxx`) لصيغة دولية (`20xxxxxxxxx`) قبل الإرسال.
- **نقاط الاستدعاء الفعلية:**
  - عند إنشاء حجز جديد (ويب أو POS): رسالة تأكيد استلام — من `api/bookings.php` و`api/pos.php` مباشرة (وليس عبر state machine، لأنها ليست تغيير حالة).
  - عند أي تغيير حالة حجز (`confirmed`/`in_service`/`completed`/`cancelled`): عبر `BookingStateMachine::applyStatusSideEffects()` — **موحّدة الآن بين لوحة الأدمن ونقطة البيع (POS)** بعد إدخال `api/BookingStateMachine.php` (راجع `BOOKING_WORKFLOW.md`). قبل ذلك كانت محصورة في لوحة الأدمن فقط.
  - بث جماعي يدوي من الأدمن: `api/whatsapp-broadcast.php` (`POST { phones: [...], message }`) — يُصفّي الأرقام المصرية الصحيحة فقط ويُسجَّل في `audit_log` (`whatsapp.broadcast`).

## 3) Web Push (VAPID)

**الملفات:** `api/push-subscribe.php` (تسجيل/حذف اشتراك المتصفح)، `api/push-send.php` (الإرسال الفعلي)، `api/anniversary-notify.php` (استخدام مجدوَل)، `sw.js` (Service Worker يستقبل ويعرض الإشعار في المتصفح).

- تنفيذ VAPID مباشر بدون مكتبات خارجية (بناء JWT بتوقيع ES256 عبر `openssl` يدوياً في `push-send.php`).
- يتطلب `VAPID_PUBLIC_KEY` + ملف `data/vapid_private.pem` — بدونهما `sendPushNotification()` تُرجع `0` فوراً.
- كل اشتراك مرتبط بـ `endpoint` فريد في جدول `push_subscriptions`، مربوط اختيارياً بـ `customer_id`. اشتراك يفشل الإرسال إليه (منتهي/غير صالح) يُحذف تلقائياً.

### نقاط الاستدعاء الفعلية

| المصدر | `customer_id` الممرَّر | الأثر |
|--------|------------------------|-------|
| `admin.js` عند تغيير حالة حجز (سطر ~781) | `booking.customer_id` إن وُجد، وإلا `null` | ⚠️ **راجع التحذير أدناه** |
| `api/anniversary-notify.php` (زر يدوي في لوحة الأدمن) | معرّف كل عميل ببلوغ ذكرى انضمامه اليوم | إشعار مستهدف صحيح |
| بث يدوي عام من الأدمن (`push-send.php` مباشرة) | حسب إدخال الأدمن، قد يُترك فارغاً عمداً للبث للجميع | مقصود |

### ⚠️ فجوة حقيقية: حجوزات الضيوف تستقبل push للجميع بدل تجاهله

في `admin.js`، عند تحديث حالة أي حجز، يُرسَل تلقائياً:
```js
body: JSON.stringify({ title, body, url, customer_id: customerId }) // customerId قد تكون null لحجوزات الضيوف
```
وفي `api/push-send.php`:
```php
$cid = isset($input['customer_id']) ? (int)$input['customer_id'] : null;
```
بما أن قيمة JSON المُرسلة هي `null` حرفياً، فإن `isset($input['customer_id'])` تُرجع **`false`** في PHP (isset يعتبر القيمة `null` "غير موجودة")، فتصبح `$cid = null` دائماً لحجوزات الضيوف. ثم:
```php
$sent = sendPushNotification($pdo, $title, $body, $url, $cid ?: null);
```
تمرير `$customerId = null` لـ `sendPushNotification()` يُشغّل فرع "أرسل لكل المشتركين" (`SELECT * FROM push_subscriptions` بدون `WHERE`) بدل تجاهل الإرسال. **النتيجة: كل تحديث حالة لحجز ضيف (بدون حساب) يُرسل إشعاراً غير ذي صلة لكل من فعّل الإشعارات في المتصفح.** موثّق كبند أولوية في `ROADMAP.md`.

## قاعدة البيانات

```sql
CREATE TABLE push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,      -- NULL لو غير مرتبط بحساب عميل
  endpoint TEXT UNIQUE,
  p256dh TEXT,
  auth TEXT,
  created_at TEXT
);
```

---

**آخر تحديث:** 2026
