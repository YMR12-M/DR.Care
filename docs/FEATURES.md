# DR.Care — دليل المميزات والتفاصيل الدقيقة

> مرجع شامل لكل قدرات النظام: واجهات، APIs، قواعد العمل، حدود التحقق، وحالات الحافة.  
> الإصدار الموثَّق: **2.0** · يكمّل [README.md](./README.md).

---

## جدول المحتويات

1. [ملخص القدرات](#1-ملخص-القدرات)
2. [الموقع الرئيسي index.html](#2-الموقع-الرئيسي-indexhtml)
3. [نسخة الموبايل](#3-نسخة-الموبايل)
4. [نظام العملاء](#4-نظام-العملاء)
5. [تتبع الحجز العام](#5-تتبع-الحجز-العام)
6. [لوحة الإدارة](#6-لوحة-الإدارة)
7. [نقطة البيع CarWash-POS](#7-نقطة-البيع-carwash-pos)
8. [نظام الحجوزات (Backend)](#8-نظام-الحجوزات-backend)
9. [التسعير](#9-التسعير)
10. [الكوبونات](#10-الكوبونات)
11. [التقييمات](#11-التقييمات)
12. [PWA والعمل دون اتصال](#12-pwa-والعمل-دون-اتصال)
13. [البريد الإلكتروني](#13-البريد-الإلكتروني)
14. [Web Push](#14-web-push)
15. [قاعدة البيانات](#15-قاعدة-البيانات)
16. [الأمان والحدود](#16-الأمان-والحدود)
17. [أدوات CLI](#17-أدوات-cli)
18. [ما لا يفعله النظام حالياً](#18-ما-لا-يفعله-النظام-حالياً)

---

## 1. ملخص القدرات

| المجال | الميزات |
|--------|---------|
| **حجز ويب** | نموذج كامل، معاينة سعر، كوبون، موعد، فرع، دفع، لوحة |
| **حسابات** | تسجيل/دخول عميل، ملف شخصي، حجوزات، تقييم |
| **إدارة** | جدول طلبات، فلاتر، تقارير، JSON export، كوبونات، polling |
| **POS** | فاتورة فرع، سجل اليوم، بحث، تحديث حالة |
| **تتبع** | بدون حساب: رقم حجز + موبايل، timeline، تحديث كل 15 ث |
| **إشعارات** | SMTP للإدارة، Desktop notif للمسؤول، Push للعميل |
| **تقني** | SQLite، جلسات PHP، CSRF، rate limit، CI |

---

## 2. الموقع الرئيسي `index.html`

### 2.1 الأقسام (Sections)

| ID | القسم | المحتوى |
|----|--------|---------|
| `#home` | Hero | عنوان DR.Care، CTA حجز/باقات، عناصر ثقة (فروع، تقييم، سرعة) |
| `#services` | الخدمات | بطاقات: غسلة خارجية، داخلية، تفصيل، عناية إطارات |
| `#packages` | الباقات | 4 باقات مع أسعار ووصف؛ أزرار `data-select-package` تقفز لنموذج الحجز |
| `#why` | لماذا نحن | شارة «صُنع في مصر»، فروع: القاهرة الجديدة، مدينة نصر، الشيخ زايد |
| — | How it works | 4 خطوات: حجز → تأكيد → غسيل → تسليم |
| `#reviews` | التقييمات | متوسط، أشرطة توزيع 1–5 نجوم، آخر 20 تقييم |
| `#booking` | الحجز | النموذج المتصل بـ API |

### 2.2 شريط التنقل

- روابط: الخدمات، الباقات، لماذا نحن، الحجز، **حسابي**
- زر **احجز الآن** (`nav-cta`)
- **حسابي** ديناميكي (`script.js`):
  - غير مسجل → `customer-login.html`
  - مسجل → `customer-profile.html` + نص «مرحباً {الاسم}»
  - رابط **خروج** يُنشأ ديناميكياً
- قائمة همبرغر للموبايل (`menu-toggle` + `mainNav`)

### 2.3 نموذج الحجز — الحقول

| الحقل | `name` / ID | مطلوب | تفاصيل |
|-------|-------------|-------|--------|
| الاسم | `name` | نعم | 2+ حرف |
| البريد | `email` | نعم | صيغة email صالحة |
| الموبايل | `phone` | نعم | `01[0125]` + 8 أرقام |
| الباقة | `servicePackage` | نعم | من `api/packages.php` |
| نوع العربية | `carType` | نعم | sedan / suv / van / pickup |
| الفرع | `branch` | نعم | من القائمة في config |
| الموعد | `appointment` | لا | `datetime-local`؛ الحد الأدنى = الآن + 30 دقيقة (واجهة) |
| طريقة الدفع | `paymentMethod` | نعم | كاش، Instapay، Vodafone Cash، بطاقة بنكية |
| رقم اللوحة | `plateNumber` | لا | حتى 20 حرفاً (حروف/أرقام/مسافات/شرطة) |
| ملاحظات | `notes` | لا | حتى **280** حرف (واجهة) / **300** (خادم) |
| كود خصم | `couponCode` | لا | يُطبَّق عبر `api/coupons.php?action=validate` |

### 2.4 معاينة السعر (`updateEstimate`)

- **الصيغة:** `سعر الباقة + extra نوع العربية − خصم الكوبون`
- باقة `fleet` → يعرض **«حسب التعاقد»** بدل رقم
- عند تغيير الباقة/النوع → **يُلغى الكوبون المطبَّق** تلقائياً

### 2.5 شروط إتمام الحجز

1. **جلسة عميل نشطة** — عند الضغط على «تأكيد الحجز» أو CTA الحجز:
   - فحص `GET api/customer-login.php?action=check`
   - إن لم يكن مسجلاً: رسالة + توجيه لـ `customer-login.html?return=index.html%23booking`
   - `sessionStorage.bookingPromptShown` يمنع تكرار التنبيه المزعج
2. **اتصال بالإنترنت** عند الإرسال — إن `!navigator.onLine` → رسالة خطأ (لا queue في هذه الحالة من الواجهة مباشرة قبل المحاولة)
3. **CSRF** — رأس `X-CSRF-Token` من `GET api/csrf.php`
4. **تحقق client** ثم **server** في `api/bookings.php`

### 2.6 بعد الحجز الناجح

- رسالة نجاح برقم الحجز والسعر
- إعادة تعيين النموذج + إلغاء الكوبون
- بعد **2 ثانية** → `customer-bookings.html`
- إيميل للإدارة (إن SMTP مفعّل)
- `used_count` للكوبون يزيد +1

### 2.7 فشل الحجز + وضع Offline

إن فشل `fetch` و`window.drcareIDB` متاح:

1. يحفظ الـ payload في IndexedDB (`drcare-sync` / `outbox`)
2. يحاول `registration.sync.register('sync-bookings')`
3. رسالة: «تم حفظ الحجز مؤقتاً…»
4. Service Worker يعيد المحاولة عند المزامنة (**ملاحظة:** الطلب من SW قد يفشل بدون جلسة/CSRF — يُفضّل إعادة الحجز يدوياً بعد عودة الاتصال)

### 2.8 PWA على الصفحة الرئيسية

| الميزة | التفاصيل |
|--------|----------|
| `beforeinstallprompt` | يخزن الحدث ويعرض `#pwaInstallBanner` |
| تثبيت | `#pwaInstallBtn` يستدعي `prompt()` |
| إغلاق البانر | `#pwaDismissBtn` |
| `appinstalled` | يخفي البانر |
| Service Worker | تسجيل `/sw.js` |
| online/offline | `#offlineToast` — نص مختلف عند قطع/عودة الاتصال |
| تحديث SW | عند `installed` + controller موجود → `confirm` لإعادة تحميل الصفحة |

### 2.9 التقييمات على الرئيسية (`loadReviews`)

- `GET api/reviews.php` — آخر 20
- يعرض: متوسط، نجوم، أشرطة نسبة لكل مستوى 5→1، بطاقات (تعليق، باقة، تاريخ)
- XSS: escape للتعليقات في HTML
- عناصر `.reveal` تُراقب بـ `IntersectionObserver` (ظهور تدريجي)

### 2.10 تحميل الإعدادات

- `GET api/packages.php` عند التحميل
- عند الفشل → `fallbackConfig` في `script.js` (نفس أسعار config الافتراضية)

### 2.11 `index-2.html`

- نسخة بديلة/تجريبية لواجهة الموقع (نفس العائلة البصرية) — للتجارب وليس المسار الافتراضي للإنتاج.

---

## 3. نسخة الموبايل

| الملف | الغرض |
|-------|--------|
| `mobile.html` | صفحة حجز/رئيسية مبسطة للشاشات الصغيرة |
| `mobile-bookings.html` | حجوزات العميل (نسخة موبايل) |
| `mobile-profile.html` | الملف الشخصي (نسخة موبايل) |
| `assets/css/mobile.css` / `assets/js/mobile.js` | أنماط ومنطق منفصل مع `fallbackConfig` مطابق |

**السلوك:** نفس APIs والتحققات؛ تسجيل خروج GET قد يوجّه لـ `mobile-bookings.html` (legacy في `customer-login.php`).

---

## 4. نظام العملاء

### 4.1 `customer-login.html`

| الإجراء | API | Rate limit |
|---------|-----|------------|
| تسجيل | `POST` `action: register` | **3** / ساعة / IP |
| دخول | `POST` `action: login` | **5** / 5 دقائق / IP |

**تسجيل — التحقق:**

| الحقل | القاعدة |
|-------|---------|
| `name` | `[\p{L}\s]{2,80}` |
| `email` | فريد، `FILTER_VALIDATE_EMAIL` |
| `phone` | `^01[0125][0-9]{8}$` |
| `password` | ≥ 6 أحرف |

**بعد التسجيل/الدخول:**

- `session_regenerate_id(true)`
- الجلسة: `customer_id`, `customer_email`, `customer_name`
- تحديث `last_login` عند الدخول

**فحص الجلسة:**

```http
GET /api/customer-login.php?action=check
```

```json
{ "ok": true, "authenticated": true, "name": "...", "email": "..." }
```

**خروج:**

- `POST` body `{ "action": "logout" }` أو
- `GET ?action=logout` (legacy → redirect mobile)

### 4.2 `customer-bookings.html`

**يتطلب جلسة** — وإلا redirect لصفحة الدخول.

| ميزة | التفاصيل |
|------|----------|
| رأس الحساب | أفاتار (أول حرف)، اسم، بريد من الجلسة/API |
| تبويبات | الكل / نشطة / مكتملة |
| نشطة | `new`, `confirmed`, `in_service` |
| مكتملة | `completed`, `cancelled` |
| شريط ملخص | إجمالي حجوزات، نشطة، إنفاق (مجموع `completed`) |
| بطاقة حجز | تفاصيل: باقة، فرع، موعد، دفع، سعر، لوحة |
| رابط تتبع | للحجوزات النشطة → `booking-tracker.html?id={id}` |
| تقييم | يظهر لـ `completed` فقط إن لم يُقيَّم |
| نموذج تقييم | نجوم 1–5، تعليق حتى 500 حرف |
| Push | زر `#notifBtn` — اشتراك VAPID |
| تحديث | تحميل من `GET api/customer-bookings.php` |
| خروج | `POST logout` |

**تقييم من الحجوزات:**

- `POST api/reviews.php` + CSRF
- `booking_id`, `rating`, `comment` اختياري

### 4.3 `customer-profile.html`

**3 تبويبات:**

| التبويب | الإجراء | API |
|---------|---------|-----|
| بيانات شخصية | تعديل اسم + موبايل | `PATCH` `{ name, phone }` + CSRF |
| كلمة المرور | حالي + جديد | `PATCH` `{ current_password, new_password }` |
| نشاط | عرض فقط | `created_at`, `last_login`, `booking_count`, `is_active` |

**قيود:**

- **البريد غير قابل للتعديل** (معرّف الحساب)
- كلمة المرور الجديدة ≥ 6
- `booking_count` = عدد حجوزات بنفس `customer_id` **أو** نفس `email`

---

## 5. تتبع الحجز العام

**الملف:** `booking-tracker.html`

### 5.1 المدخلات

- `track_id` — رقم الحجز (integer)
- `track_phone` — نفس رقم الموبايل المسجّل في الحجز

### 5.2 API

```http
GET /api/customer-bookings.php?track_id=42&track_phone=01012345678
```

- **بدون جلسة**
- مطابقة **كلاهما** `id` و `phone` — وإلا 404
- لا يكشف وجود حجز برقم فقط (أمان نسبي)

### 5.3 الواجهة

- **Timeline** بخطوات: جديد → مؤكد → قيد التنفيذ → تم التسليم
- `cancelled` → حالة حمراء «ملغي»
- شريط تقدم نسبي حسب `status`
- تفاصيل: باقة، نوع، فرع، موعد، دفع، سعر
- **تحديث تلقائي كل 15 ثانية** (`setInterval`)
- دعم `?id=` في URL لفتح حجز مباشرة

---

## 6. لوحة الإدارة

**الملفات:** `login.html` → `admin.html` + `admin.js` v3.0

### 6.1 دخول المسؤول

| | |
|---|---|
| API | `POST api/admin-login.php` |
| Body | `{ "username", "password" }` |
| Rate limit | **5** / 10 دقائق / IP |
| الجلسة | `admin_id`, `admin_username` |
| فحص | `GET ?action=check` → `{ authenticated, username }` |
| خروج | `POST { "action": "logout" }` |

**تهيئة أول حساب:**

- `GET api/admin-init.php` — ينشئ من `.env` إن الجدول فارغ
- أو `DRCARE_DEFAULT_ADMIN_AUTO_CREATE=1` في bootstrap

### 6.2 بطاقات الإحصائيات (أعلى اللوحة)

| العنصر | الحساب |
|--------|--------|
| إجمالي الطلبات | `bookings.length` |
| طلبات جديدة | `status === 'new'` |
| إيراد متوقع | مجموع `total_price` لغير الملغاة |
| عملاء فريدون | `Set` من emails غير الفارغة |

### 6.3 تقارير الفترة

| المؤشر | التعريف |
|--------|---------|
| حجوزات اليوم | `created_at` ≥ بداية اليوم المحلي |
| حجوزات الشهر | `created_at` ≥ أول الشهر |
| إيراد اليوم/الشهر | مجموع الأسعار؛ **يستثني** `cancelled` |

### 6.4 جدول الحجوزات

**أعمدة معروضة:** ID، عميل، باقة، فرع، سعر، حالة (قائمة منسدلة)، تفاصيل

**فلاتر:**

| الفلتر | القيم |
|--------|-------|
| حالة | all / new / confirmed / in_service / completed / cancelled |
| فرع | ديناميكي من البيانات |
| دفع | ديناميكي من البيانات |
| بحث | debounce 250ms — id, name, phone, package, branch, payment, plate |

**عداد:** `#resultsCount` يعرض عدد النتائج بعد الفلترة

### 6.5 نافذة التفاصيل (Modal)

- كل حقول الحجز منسقة بالعربية
- أزرار **إجراءات سريعة** لتغيير الحالة
- إغلاق: زر X، خلفية، مفتاح Escape
- عند تغيير الحالة من القائمة → rollback للقيمة السابقة عند الفشل (`data-prev-value`)

### 6.6 تحديث الحالة

```http
PATCH /api/bookings.php
{ "id": 42, "status": "confirmed" }
```

**بعد النجاح:**

1. Toast نجاح
2. `POST api/push-send.php` — إشعار عام (كل المشتركين، ليس مفلتراً بـ customer_id في هذا الاستدعاء)
3. إعادة تحميل الجدول

### 6.7 تصدير JSON

- زر `#downloadJson`
- ملف: `dr-care-bookings-YYYY-MM-DD.json`
- كل الحجوزات المحمّلة (غير المفلترة)

### 6.8 مراقبة الحجوزات الجديدة (Poller)

| الإعداد | القيمة |
|---------|--------|
| الفترة | كل **30 ثانية** |
| الشرط | `id > _lastBookingId` و `status === 'new'` |
| أول تحميل | يضبط baseline فقط (بدون إنذار) |
| صوت | نغمة 880Hz عبر Web Audio |
| إشعار سطح المكتب | `Notification` API — يطلب إذناً |
| عنوان التبويب | `(N) DR.Care | لوحة الإدارة` |
| عند focus التبويب | يصفّر العداد |

### 6.9 إدارة الكوبونات (لوحة مدمجة)

- زر تبديل يخفي جدول الحجوزات ويعرض `#couponsPanel`
- **إنشاء:** code, type (percent/fixed), value, min_order, max_uses, expires_at
- **جدول:** كود، نوع، قيمة، حد أدنى، استخدامات، انتهاء، نشط، إيقاف/حذف
- APIs: انظر [القسم 10](#10-الكوبونات)

### 6.10 Toast و UX

- `#toastBar` — 3.5 ثانية، أنواع success/error
- Header `is-scrolled` بعد 16px scroll
- Service Worker مسجّل على `/sw.js`

---

## 7. نقطة البيع CarWash-POS

**المسار:** `CarWash-POS/index.html`  
**API:** `api/pos.php`  
**المصادقة:** `POS_TOKEN` في `.env` — مقارنة `hash_equals`

### 7.1 الشاشات / التبويبات

| تبويب | الوظيفة |
|-------|---------|
| فاتورة جديدة | نموذج عميل + شبكة باقات |
| سجل اليوم | جدول حجوزات `source=pos` لليوم + إيراد |
| بحث | `action=search&q=` — اسم/موبايل/لوحة، حد 20 |

### 7.2 إنشاء حجز POS

```http
POST /api/pos.php
```

**Body:** `token`, `name`, `phone`, `email?`, `packageCode`, `carType`, `branch`, `paymentMethod`, `plateNumber?`, `notes?`

| الحقل | قواعد |
|-------|-------|
| name | 2–80 حرف |
| phone | مصري 11 رقم |
| email | اختياري؛ إن وُجد يُتحقق منه |
| branch | من config فقط |

**النتيجة:**

- `source = 'pos'`
- `status = 'new'`
- `appointment` غير مطلوب (غالباً null)
- إيميل إشعار للإدارة
- عرض فاتورة في الواجهة + **طباعة** (`printBtn`)

### 7.3 سجل اليوم

```http
GET /api/pos.php?action=today&token=...
```

- `revenue` = مجموع `total_price` لغير `cancelled`
- تحديث حالة من `<select class="pos-status-select">`

### 7.4 ساعة حية

- تحديث كل ثانية بتنسيق `ar-EG` 24h

### 7.5 اتصال الخادم

- `GET /api/pos.php` بدون action → `{ ok, message, time }`
- عند الفشل: النموذج معطّل (opacity 0.45)

---

## 8. نظام الحجوزات (Backend)

### 8.1 مصادر الحجز `source`

| القيمة | المنشأ |
|--------|--------|
| `web` | `api/bookings.php` POST (عميل مسجل) |
| `pos` | `api/pos.php` POST |

### 8.2 حالات الحجز `status`

| القيمة | التسمية | ملاحظات |
|--------|---------|---------|
| `new` | جديد | افتراضي عند الإنشاء |
| `confirmed` | مؤكد | |
| `in_service` | قيد التنفيذ | |
| `completed` | تم التسليم | يسمح بالتقييم |
| `cancelled` | ملغي | مستثنى من الإيرادات |

### 8.3 `GET api/bookings.php`

- **مسؤول فقط** (`requireAdmin`)
- ترتيب: `id DESC`
- يعيد كل الأعمدة

### 8.4 `POST api/bookings.php`

- **عميل مسجل** (`requireCustomerSession`)
- CSRF إن وُجد token في الجلسة
- يطبّق الكوبون server-side (لا يعتمد على client فقط)
- `customer_id` من الجلسة
- إشعار بريد `sendBookingNotification`

### 8.5 `PATCH api/bookings.php`

- مسؤول فقط
- `{ id, status }` — يُتحقق أولاً من أن `status` ضمن enum الحالات الخمس، **ثم** من صحة الانتقال نفسه عبر `BookingStateMachine::assertTransition()` (`api/BookingStateMachine.php`) — مصدر الحقيقة الوحيد، يُستدعى أيضاً من `api/pos.php` و`api/customer-bookings.php`. انتقال غير منطقي (مثل `completed → new` أو تخطي حالة كـ `new → completed`) يُرفض بـ `409`. التفاصيل الكاملة (الحالات، الانتقالات المسموحة، الآثار الجانبية) في `BOOKING_WORKFLOW.md`.

---

## 9. التسعير

### 9.1 مصدر الحقيقة

**الملف:** `api/config.php` (يُعاد عبر `packages.php`)

### 9.2 جدول الباقات

| code | name | price (ج.م) |
|------|------|-------------|
| inside-out | غسيل داخلي وخارجي | 150 |
| outside | غسيل خارجي فقط | 100 |
| deep | غسيل متخصص (Deep Cleaning) | 250 |
| cover | غسيل غطاء السيارة | 50 |
| rims | غسيل وتنظيف جنوط السيارة | 100 |
| engine | غسيل موتور السيارة | 100 |
| chemical | الغسيل الكيماوي | 0 (تعاقد) |
| carpet | غسيل سجاد | 0 (تعاقد) |
| blanket | غسيل بطاطين | 80 |

### 9.3 إضافات نوع العربية

| code | extra |
|------|-------|
| sedan | 0 |
| suv | 60 |
| van | 90 |
| pickup | 120 |

### 9.4 `api/pricing.php` — ⚠️ غير مستخدَم من أي واجهة أمامية حالياً، وغير متزامن مع 9.2

```http
GET /api/pricing.php?package=outside&car_type=suv
```

1. يحاول Java: `java -cp tools/java/src com.drcare.PricingCalculator outside suv`
2. عند الفشل (قيمة غير رقمية) → حساب PHP من config
3. Response: `{ price, label, source: "java"|"php" }`

**تحذير:** أكواد الباقات في الـ Java (`quick/full/detail/fleet`) لا تطابق الجدول في §9.2 إطلاقاً، وتعيد قيمة افتراضية (280) بدل خطأ لأي كود حقيقي — فيبدو الـ `source: "java"` ناجحاً بينما السعر خاطئ. التفاصيل الكاملة في `PRICING_SYSTEM.md`. تدفق الحجز الفعلي (`bookings.php`/`pos.php`) لا يستخدم هذا الـ endpoint إطلاقاً ويقرأ الأسعار من §9.1 مباشرة، فهو غير متأثر بهذه المشكلة.

### 9.5 Java `PricingCalculator`

- أرقام قديمة مكررة في الكلاس **بأكواد باقات مختلفة تماماً** عن config.php الحالي (راجع التحذير أعلاه) — غير متزامنة فعلياً وليس فقط "يجب مزامنتها".
- CLI: `java com.drcare.PricingCalculator <package> <cartype>` → رقم فقط stdout

---

## 10. الكوبونات

### 10.1 جدول `coupons`

| عمود | الوصف |
|------|--------|
| code | فريد، 3–20 حرف A-Z0-9_- |
| discount_type | `percent` أو `fixed` |
| discount_value | نسبة 1–100 أو مبلغ |
| min_order | حد أدنى للطلب قبل الخصم |
| max_uses | null = غير محدود |
| used_count | يزيد عند حجز ناجح بالكود |
| expires_at | ISO أو null |
| is_active | 0/1 |

### 10.2 التحقق العام

```http
POST /api/coupons.php
{ "action": "validate", "code": "SUMMER", "subtotal": 340 }
```

**فحوصات:** نشط، لم ينتهِ، لم يستنفد max_uses، subtotal ≥ min_order

**حساب الخصم:**

- `percent` → `round(subtotal * value / 100, 2)`
- `fixed` → `min(value, subtotal)`

### 10.3 إدارة (مسؤول)

| Method | Action / Body |
|--------|----------------|
| GET | قائمة كل الكوبونات |
| POST | `action: create` |
| PATCH | `{ id, is_active }` |
| DELETE | `{ id }` |

---

## 11. التقييمات

### 11.1 عرض عام

```http
GET /api/reviews.php
```

- آخر **20** تقييم
- يعرض: `rating`, `comment`, `created_at`, `package_name`, `car_type_name`
- **لا** يعرض اسم العميل (خصوصية)

### 11.2 تقييم واحد

```http
GET /api/reviews.php?booking_id=42
```

### 11.3 إرسال تقييم

```http
POST /api/reviews.php
```

| الشرط | التفاصيل |
|-------|----------|
| جلسة عميل | مطلوب |
| CSRF | مطلوب |
| ملكية الحجز | `booking.customer_id` = جلسة العميل |
| الحالة | يجب `completed` |
| تكرار | `booking_id` UNIQUE — تقييم واحد للحجز |
| rating | 1–5 |
| comment | اختياري، ≤ **500** حرف |

---

## 12. PWA والعمل دون اتصال

### 12.1 `manifest.json`

| الحقل | القيمة |
|-------|--------|
| display | standalone |
| orientation | portrait-primary |
| theme_color | #ffd21f |
| background_color | #050505 |
| lang / dir | ar / rtl |
| start_url | /index.html |
| shortcuts | احجز الآن → `#booking`؛ الإدارة → admin.html |

### 12.2 `sw.js` — استراتيجيات Cache

| نوع الطلب | الاستراتيجية |
|-----------|--------------|
| `/api/*` | Network only؛ offline → JSON خطأ |
| Google Fonts | Cache first |
| أصول ثابتة | Stale-while-revalidate |
| CACHE_NAME | `drcare-v2` |

**أصول مُخزَّنة عند التثبيت:**

`/`, `index.html`, `admin.html`, `assets/css/styles.css`, `assets/js/script.js`, `assets/js/admin.js`, `manifest.json`, `assets/img/dr-care-hero.jpg`, خط Cairo

### 12.3 IndexedDB (`assets/js/idb.js`)

- DB: `drcare-sync` v1
- Store: `outbox` — `{ payload, created_at }`
- دوال: `saveOutbox`, `getAllOutbox`, `deleteOutbox`
- مُعرَّضة كـ `window.drcareIDB`

### 12.4 Background Sync

- Tag: `sync-bookings`
- يعيد POST لـ `/api/bookings.php` لكل عنصر outbox
- عند النجاح → حذف من outbox
- `postMessage` `{ type: 'SYNC_COMPLETE' }` للعملاء

### 12.5 Push في SW

- `push` → `showNotification` مع `dir: rtl`, `lang: ar`
- `notificationclick` → `openWindow(url)`

---

## 13. البريد الإلكتروني

### 13.1 متى يُرسَل؟

- حجز ويب ناجح
- حجز POS ناجح

### 13.2 المستلم والمحتوى

- إلى: `DRCARE_NOTIFICATION_EMAIL`
- الموضوع: `🚗 حجز جديد #{id} — DR.Care`
- النص: اسم، موبايل، بريد، لوحة، باقة، نوع، فرع، موعد، دفع، سعر، ملاحظات، وقت الإنشاء
- رابط إدارة في النص (localhost في القالب الافتراضي — عدّله للإنتاج)

### 13.3 آلية الإرسال (`bootstrap.php`)

1. إن `MAILER_SMTP_HOST` → SMTP يدوي (EHLO, STARTTLS, AUTH LOGIN, DATA)
2. وإلا `mail()` إن متاح
3. فشل → `error_log` بدون إيقاف الحجز

### 13.4 اختبار

```http
GET /api/test-email.php?to=you@example.com
```

- يتطلب جلسة **مسؤول**
- يرفض `example.com` الوهمي في SMTP host

---

## 14. Web Push

### 14.1 الاشتراك

```http
POST /api/push-subscribe.php
{
  "endpoint": "...",
  "keys": { "p256dh": "...", "auth": "..." }
}
```

- `customer_id` من الجلسة إن وُجد
- `ON CONFLICT(endpoint) DO UPDATE`

### 14.2 الإرسال

```http
POST /api/push-send.php  (مسؤول)
{
  "title": "...",
  "body": "...",
  "url": "/customer-bookings.html",
  "customer_id": null
}
```

| المتطلب | |
|---------|--|
| `data/vapid_private.pem` | مفتاح ES256 |
| `VAPID_PUBLIC_KEY` | في env (للتوقيع) |
| `VAPID_SUBJECT` | افتراضي `mailto:admin@drcare.local` |

- اشتراكات منتهية تُحذف تلقائياً عند فشل الإرسال
- Response: `{ ok, sent: N }`

### 14.3 تفعيل من العميل

- `customer-bookings.html` — `pushManager.subscribe` مع VAPID public key من الصفحة
- يخفي الزر بعد الاشتراك أو إن الإذن مرفوض

---

## 15. قاعدة البيانات

**المسار:** `data/drcare.db`  
**النوع:** SQLite 3  
**التهيئة:** أول طلب يمر على `bootstrap.php`

### 15.1 ترحيل تلقائي

دالة `addMissingColumn` تضيف لـ `bookings` إن غابت:

- `email`
- `customer_id`
- `source` (افتراضي `'web'`)

### 15.2 فهارس

- `idx_rl_key` على `rate_limits(rl_key)`
- `idx_reviews_booking` على `reviews(booking_id)`

### 15.3 ملفات حساسة (Git)

```
.env
data/*.db
data/vapid_private.pem
node_modules/
```

---

## 16. الأمان والحدود

### 16.1 الجلسات

```php
session_set_cookie_params([
  'secure'   => HTTPS,
  'httponly' => true,
  'samesite' => 'Lax',
]);
session.use_strict_mode = 1
```

### 16.2 Rate limiting

| المفتاح | الحد | النافذة |
|---------|------|---------|
| `customer_register` | 3 | 3600 ث |
| `customer_login` | 5 | 300 ث |
| `admin_login` | 5 | 600 ث |

- المفتاح: `hash(sha256, IP + action)`
- IP من `REMOTE_ADDR` أو أول `X-Forwarded-For` إن `DRCARE_TRUSTED_PROXY=1`
- Response 429 + `Retry-After`

### 16.3 CSRF

- Token 32 بايت hex في `$_SESSION['csrf_token']`
- التحقق: رأس `X-CSRF-Token` مع `hash_equals`
- يُستخدم في: حجز، تقييم، ملف شخصي (PATCH)

### 16.4 CORS

- `Access-Control-Allow-Origin` فقط إن:
  - `Origin === DRCARE_APP_ORIGIN`، أو
  - نفس `HTTP_HOST` (بدون port في المقارنة)

### 16.5 HTTPS

- خارج localhost → 301 إلى HTTPS إن `$_SERVER['HTTPS']` فارغ

### 16.6 كلمات المرور

- `PASSWORD_BCRYPT`, cost **10**
- رسائل خطأ عامة («بيانات غير صحيحة») دون تمييز email/كلمة

### 16.7 جدول مقارنة التحقق (Client vs Server)

| الحقل | Client (`script.js`) | Server (`bookings.php`) |
|-------|----------------------|-------------------------|
| notes | ≤ 280 | ≤ 300 |
| appointment min | +15 دقيقة | +15 دقيقة |
| email | مطلوب | مطلوب |
| name regex | طول 2+ | `[\p{L}\s]{2,80}` |

---

## 17. أدوات CLI

### 17.1 `tools/python/export_bookings.py`

```bash
python3 tools/python/export_bookings.py --out bookings.csv
```

**أعمدة CSV:** id, name, email, phone, package_name, car_type_name, branch, total_price, created_at, status, appointment, plate_number, notes

### 17.2 `tools/python/generate_invoice.py`

```bash
python3 tools/python/generate_invoice.py 42 --out invoice_42.txt
```

- فاتورة نصية عربية
- يعيد حساب السعر من `package_code` + `car_type_code` (قد يختلف عن `total_price` المحفوظ إن تغيّرت الأسعار لاحقاً)

### 17.3 `tools/scripts/build-java.sh`

- يجمّع إلى `tools/java/classes/`

### 17.4 `tools/python/gen_icons.py`

- توليد أيقونات PWA 192/512

### 17.5 npm

```bash
npm run lint    # ESLint على *.js
npm run format  # Prettier
```

---

## 18. ما لا يفعله النظام حالياً

| الميزة | الحالة |
|--------|--------|
| بوابة دفع إلكترونية (Paymob/Fawry) | غير مدمجة — الدفع اختيار نصي فقط |
| تطبيق App Store / Play Store | PWA فقط |
| استعادة كلمة المرور | غير موجودة |
| تأكيد البريد عند التسجيل | غير موجود |
| تعديل بريد العميل | غير مسموح |
| تسجيل مسؤولين جدد من الواجهة | غير موجود — `admin-init` فقط |
| خدمة غسيل منزلي / GPS | غير موجود |
| اشتراكات شهرية آلية | باقة fleet يدوية فقط |
| تعدد لغات | عربي فقط (بعض تسميات إنجليزية في UI) |
| 2FA / OAuth | غير موجود |
| API عام بدون جلسة للحجز | الحجز يتطلب عميلاً مسجلاً |
| فلترة Push بعميل محدد من الإدارة عند تغيير الحالة | الإرسال لجميع المشتركين في الاستدعاء الحالي |

---

## ملحق: خريطة الملفات ↔ الميزات

| الملف | الميزات المرتبطة |
|-------|------------------|
| `index.html` + `script.js` | حجز، PWA، reviews، coupons UI، config |
| `customer-*.html` | حساب، حجوزات، profile، push |
| `booking-tracker.html` | تتبع عام + polling |
| `admin.*` | إدارة، تقارير، coupons، poller |
| `CarWash-POS/*` | POS |
| `api/bootstrap.php` | DB، mail، sessions، rate limit |
| `api/bookings.php` | CRUD حجوزات |
| `api/coupons.php` | خصومات |
| `api/reviews.php` | تقييمات |
| `api/pos.php` | فرع |
| `sw.js` + `idb.js` | offline |
| `tools/python/export_bookings.py` | تقارير CSV |

---

**للتشغيل والنشر:** راجع [README.md](./README.md)  
**لتفاصيل API العملاء/الإدارة:** [CUSTOMER_SYSTEM.md](./CUSTOMER_SYSTEM.md) · [LOGIN_SYSTEM.md](./LOGIN_SYSTEM.md) · [PROFILE_SYSTEM.md](./PROFILE_SYSTEM.md)
