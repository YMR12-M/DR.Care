## 🧾 نظام نقطة البيع (POS) في DR.Care

## نظرة عامة

واجهة مستقلة لموظف الفرع لإنشاء فواتير حجز مباشرة (عميل حضر شخصياً بدون حجز أونلاين مسبق)، بدون الحاجة لحساب عميل أو تسجيل دخول أدمن. تعتمد على توكن ثابت (`POS_TOKEN`) بدل الجلسات.

- إنشاء فاتورة/حجز جديد فوري (`source = 'pos'`)
- عرض حجوزات اليوم + الإيرادات
- سجل تاريخي بحث بالاسم/الهاتف/رقم اللوحة
- تطبيق كوبون أو خصم يدوي (نسبة أو مبلغ ثابت)
- طباعة الفاتورة + رابط QR لربط الحجز بحساب عميل لاحقاً (`claim_token`)
- إحصائيات يومية (حسب الباقة/نوع العربية/طريقة الدفع)

## الملفات الأساسية

- `CarWash-POS/index.html` — واجهة الموظف (فورم فاتورة + جدول اليوم + بحث + إحصائيات)
- `CarWash-POS/script.js` — كل منطق الواجهة (fetch لـ `api/pos.php`، التوكن يُقرأ من حقل إدخال `#posToken` وليس من `localStorage`)
- `api/pos.php` — الـ endpoint الوحيد لكل عمليات POS (GET/POST/PATCH)
- `api/BookingStateMachine.php` — يتحقق من صحة انتقالات الحالة عند PATCH (نفس القواعد المستخدمة في لوحة الأدمن، راجع `BOOKING_WORKFLOW.md`)
- `api/claim-booking.php` — يسمح للعميل بربط حجز POS بحسابه لاحقاً عبر `claim_token`

## المصادقة

- توكن ثابت واحد لكل الفروع، مُعرَّف في `.env` كـ `POS_TOKEN` (بدون قيمة افتراضية — الـ endpoint يرفض الطلب بـ `503` لو غير مضبوط).
- يُرسل عبر الهيدر `X-POS-Token` (GET/موصى به) أو داخل الـ body كـ `token` (POST/PATCH).
- **لا يوجد تمييز بين الفروع أو الموظفين** — نفس التوكن لكل من يستخدم POS. لا user/session خاص بكل موظف.

## واجهات API — `api/pos.php`

### `GET api/pos.php` (بدون `action`)

Health check — لا يتطلب توكن.

```json
{ "ok": true, "message": "DR.Care POS متصل ✓", "time": "14:32" }
```

### `GET api/pos.php?action=today`

حجوزات اليوم (`source='pos'` فقط) + الإيرادات (بعد استبعاد الملغاة).

### `GET api/pos.php?action=history&limit=50&offset=0`

سجل كامل لحجوزات POS، بالتصفح (`limit` أقصاه 200).

### `GET api/pos.php?action=search&q=...`

بحث بالاسم أو الهاتف أو رقم اللوحة (أقصى 20 نتيجة).

### `GET api/pos.php?action=detail&id=...`

تفاصيل حجز واحد (لإعادة الطباعة).

### `GET api/pos.php?action=coupon&code=...&total=...`

التحقق من كوبون وحساب الخصم قبل تأكيد الفاتورة.

### `GET api/pos.php?action=stats&date=YYYY-MM-DD`

توزيع الإيرادات حسب الباقة/نوع العربية/طريقة الدفع لليوم المحدد.

### `POST api/pos.php` — إنشاء فاتورة جديدة

Request body (أهم الحقول):

```json
{
  "token": "...",
  "name": "عميل الفرع",
  "phone": "01012345678",
  "packageCode": "outside",
  "carType": "sedan",
  "branch": "قليوب — شارع العروبة",
  "paymentMethod": "كاش",
  "plateNumber": "أ ب ج 123",
  "coupon_code": "SAVE10",
  "manual_discount": 20,
  "manual_discount_type": "fixed"
}
```

- يدعم كوبون **و** خصم يدوي معاً (يُجمعان، ثم يُحدّان بحد أقصى = سعر الباقة قبل الخصم).
- الحالة الافتراضية دائماً `new`.
- يُنشأ `claim_token` فريد (32 حرف hex) لكل حجز POS — يُستخدم لاحقاً في `api/claim-booking.php` وQR الطباعة.
- إرسال إشعار بريد (`sendBookingNotification`) + رسالة واتساب تأكيد للعميل تلقائياً (مثل حجوزات الويب تماماً).

### `PATCH api/pos.php` — تحديث حالة الحجز/الدفع

```json
{ "token": "...", "id": 42, "status": "confirmed" }
```

- يمر عبر `BookingStateMachine::assertTransition()` — انتقال غير صالح يُرفض بـ `409`.
- عند نجاح الانتقال: نفس الآثار الجانبية للوحة الأدمن بالضبط — رسالة واتساب للعميل + نقاط ولاء عند `completed` لأول مرة (موحّد منذ إدخال `BookingStateMachine`، راجع `BOOKING_WORKFLOW.md`).

## قاعدة البيانات

لا جداول خاصة بـ POS — يستخدم جدول `bookings` نفسه مع `source = 'pos'` و`claim_token` (عمود موجود لكل الحجوزات لكنه يُملأ فقط لحجوزات POS).

## ملاحظات وفجوات معروفة

- واجهة `<select class="pos-status-select">` في `CarWash-POS/script.js` تعرض حالياً **كل** الحالات الخمس دائماً بدل الانتقالات الصالحة فقط فقط (نفس العلة التي أُصلحت في `admin.js` عبر `STATUS_TRANSITIONS`) — مذكورة في `ROADMAP.md` كبند مستقل لم يُعالَج بعد.
- لا يوجد تمييز بين موظفي الفرع في `audit_log` — كل تحديث من POS يُسجَّل بـ `actor_type='pos'` و`actor_id=null` (`api/pos.php` → `logAudit($pdo, 'pos', null, ...)`).

---

**آخر تحديث:** 2026
