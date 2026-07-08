<div align="center">

# DR.Care v2.0

**نظام حجز وإدارة مغسلة سيارات مصريّة**

واجهة ويب عربية (RTL) · Progressive Web App · لوحة إدارة · حسابات عملاء · نقطة بيع (POS) · إشعارات · كوبونات · تقييمات

[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
[![PHP](https://img.shields.io/badge/PHP-8.1+-777BB4?style=flat-square&logo=php&logoColor=white)](api/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite&logoColor=white)](data/)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?style=flat-square)](manifest.json)

</div>

---

## جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [الميزات](#الميزات)
3. [المتطلبات](#المتطلبات)
4. [التشغيل السريع](#التشغيل-السريع)
5. [هيكل المشروع](#هيكل-المشروع)
6. [الصفحات والواجهات](#الصفحات-والواجهات)
7. [واجهات API](#واجهات-api)
8. [قاعدة البيانات](#قاعدة-البيانات)
9. [التسعير والباقات](#التسعير-والباقات)
10. [حالات الحجز](#حالات-الحجز)
11. [متغيرات البيئة](#متغيرات-البيئة)
12. [PWA والعمل دون اتصال](#pwa-والعمل-دون-اتصال)
13. [نقطة البيع CarWash-POS](#نقطة-البيع-carwash-pos)
14. [البريد الإلكتروني](#البريد-الإلكتروني)
15. [إشعارات Web Push](#إشعارات-web-push)
16. [الأمان](#الأمان)
17. [أدوات مساعدة](#أدوات-مساعدة)
18. [CI/CD](#cicd)
19. [النشر للإنتاج](#النشر-للإنتاج)
20. [استكشاف الأخطاء](#استكشاف-الأخطاء)
21. [وثائق إضافية](#وثائق-إضافية)

---

## نظرة عامة

**DR.Care** منصة متكاملة لإدارة مغسلة سيارات موجهة للسوق المصري: حجز أونلاين من الموقع أو تطبيق PWA، متابعة حالة الطلب، لوحة تحكم للمسؤول، حسابات للعملاء، وتسجيل حجوزات من نقطة البيع في الفرع.

### ماذا يحل المشروع؟

| المشكلة | الحل في DR.Care |
|---------|-----------------|
| حجوزات عبر واتساب/مكالمات بدون سجل | حجز منظم في SQLite مع حالة وتاريخ |
| عدم وضوح السعر | حاسبة سعر حسب الباقة + نوع العربية + كوبون |
| صعوبة متابعة الطلبات | لوحة إدارة + تتبع عام برقم الحجز والموبايل |
| غياب ولاء العميل | حساب عميل، حجوزات سابقة، تقييمات، إشعارات |
| عمليات الفرع اليدوية | واجهة POS منفصلة مرتبطة بنفس قاعدة البيانات |

### المعمارية (مختصرة)

```
┌─────────────────────────────────────────────────────────────────┐
│                        المتصفح / PWA                            │
│  index.html · mobile.html · customer-* · admin · booking-tracker │
└────────────────────────────┬────────────────────────────────────┘
                             │ fetch (JSON)
┌────────────────────────────▼────────────────────────────────────┐
│                     api/*.php (PHP 8.1+)                          │
│  bootstrap · sessions · SQLite · SMTP · VAPID push · rate limit   │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   data/drcare.db      Java PricingCalc    Python exporters
   (SQLite)            (اختياري)           (CSV / فاتورة)
```

### التقنيات

| الطبقة | التقنية |
|--------|---------|
| الواجهة | HTML5، CSS3 (تصميم داكن + ذهبي)، JavaScript (Vanilla) |
| الخادم | PHP 8.1+ مع PDO |
| قاعدة البيانات | SQLite (`data/drcare.db`) |
| PWA | `manifest.json` + `sw.js` + IndexedDB (`idb.js`) |
| أدوات | Node (ESLint/Prettier)، Java 17 (تسعير)، Python 3 (تصدير/فواتير) |
| CI | GitHub Actions |

---

## الميزات

### واجهة العميل (الموقع الرئيسي)

- صفحة هبوط عربية RTL مع أقسام: الخدمات، الباقات، لماذا نحن، الحجز، التقييمات
- نموذج حجز متعدد الخطوات مع معاينة السعر الفورية
- تطبيق كوبونات خصم (`percent` أو `fixed`)
- اختيار الفرع، الموعد، طريقة الدفع، رقم اللوحة، ملاحظات
- **يتطلب تسجيل دخول العميل** قبل إرسال الحجز (مع CSRF)
- عرض آخر 20 تقييم على الصفحة الرئيسية
- بانر تثبيت PWA + اختصارات في `manifest.json`
- نسخة موبايل مخصصة: `mobile.html` + `mobile.css` + `mobile.js`

### نظام العملاء

- تسجيل حساب جديد / تسجيل دخول / خروج
- `customer-bookings.html` — عرض الحجوزات (نشطة / مكتملة)، إحصائيات، تقييم بعد الإنجاز
- `customer-profile.html` — تعديل الاسم والموبايل، تغيير كلمة المرور، نشاط الحساب
- اشتراك في **Web Push** من صفحة الحجوزات
- ربط الحجوزات بـ `customer_id` و/أو البريد

### تتبع الحجز (بدون حساب)

- `booking-tracker.html` — البحث برقم الحجز + رقم الموبايل (عام، بدون جلسة)

### لوحة الإدارة

- `login.html` → `admin.html` بعد المصادقة
- عرض كل الحجوزات مع فلاتر: الحالة، الفرع، طريقة الدفع، بحث نصي
- تحديث حالة الحجز + إجراءات سريعة
- إحصائيات: إجمالي، جديد اليوم، عملاء فريدون، إيرادات (اليوم/الشهر)
- تصدير JSON للحجوزات
- إشعار صوتي/متصفح عند حجز جديد (polling)
- إرسال **Web Push** للعميل عند تغيير الحالة
- إدارة الكوبونات: إنشاء، تفعيل/تعطيل، حذف

### نقطة البيع (POS)

- مجلد `CarWash-POS/` — واجهة موظف الفرع
- إنشاء حجز فوري (`source = pos`) بدون حساب عميل
- عرض حجوزات اليوم + إيراد اليوم
- بحث بالاسم / الموبايل / اللوحة
- تحديث حالة الحجز

### البنية التحتية

- تهيئة تلقائية لجداول SQLite عند أول طلب API
- ترحيل أعمدة تلقائي (`ALTER TABLE` عند الحاجة)
- SMTP مدمج (بدون مكتبات خارجية) أو `mail()`
- Rate limiting على تسجيل الدخول والتسجيل
- فرض HTTPS تلقائياً خارج البيئة المحلية
- GitHub Actions: lint PHP، health check، Java، Python export، ESLint

---

## المتطلبات

| الأداة | الإصدار | ضروري؟ |
|--------|---------|--------|
| PHP | 8.1+ مع `pdo_sqlite`, `openssl`, `json` | نعم |
| متصفح حديث | Chrome / Firefox / Safari / Edge | نعم |
| Node.js | 18+ | للتطوير (`npm run lint`) |
| Java JDK | 17+ | اختياري (تسعير عبر `api/pricing.php`) |
| Python | 3.11+ | اختياري (تصدير CSV / فواتير) |

> **مهم:** لا تفتح الملفات عبر `file://` — طلبات API لن تعمل. استخدم خادم PHP محلي أو استضافة.

---

## التشغيل السريع


### 1. استنساخ المشروع

```bash
git clone <repository-url>
cd DR.Care
```

### 2. إعداد البيئة

```bash
cp .env.example .env
# عدّل .env: كلمة مرور المسؤول، POS_TOKEN، SMTP (اختياري)
```

### 3. تشغيل الخادم

```bash
php -S 127.0.0.1:8000 -t .
```

### 4. تهيئة المسؤول (أول مرة)

**الطريقة أ — يدوياً (موصى بها):**

```bash
curl http://127.0.0.1:8000/api/admin-init.php
```

ينشئ حساباً من `DRCARE_DEFAULT_ADMIN_USER` / `DRCARE_DEFAULT_ADMIN_PASS` في `.env` إذا لم يوجد أي مسؤول.

**الطريقة ب — تلقائي عند الإقلاع:**

```env
DRCARE_DEFAULT_ADMIN_AUTO_CREATE=1
DRCARE_DEFAULT_ADMIN_PASS=كلمة-مرور-قوية-هنا
```

> عطّل `DRCARE_DEFAULT_ADMIN_AUTO_CREATE` بعد الإعداد الأول.

### 5. الروابط المحلية

| الصفحة | الرابط |
|--------|--------|
| الموقع الرئيسي | http://127.0.0.1:8000/index.html |
| نسخة الموبايل | http://127.0.0.1:8000/mobile.html |
| تتبع الحجز | http://127.0.0.1:8000/booking-tracker.html |
| دخول العميل | http://127.0.0.1:8000/customer-login.html |
| دخول الإدارة | http://127.0.0.1:8000/login.html |
| لوحة الإدارة | http://127.0.0.1:8000/admin.html |
| نقطة البيع | http://127.0.0.1:8000/CarWash-POS/index.html |
| فحص الصحة | http://127.0.0.1:8000/api/health.php |

### 6. أدوات التطوير (اختياري)

```bash
npm install
npm run lint
npm run format
```

---

## هيكل المشروع

```
DR.Care/
├── .env.example                 # قالب متغيرات البيئة
├── .eslintrc.json               # إعداد ESLint
├── .prettierrc                  # إعداد Prettier
├── .github/workflows/ci.yml     # خط أنابيب CI
│
├── index.html                   # الصفحة الرئيسية + الحجز
├── index-2.html                 # نسخة تجريبية/بديلة للواجهة
├── mobile.html                  # واجهة موبايل مخصصة
├── mobile.css / mobile.js
├── booking-tracker.html         # تتبع حجز بدون حساب
├── styles.css                   # أنماط عامة
├── script.js                    # منطق الموقع الرئيسي
├── idb.js                       # IndexedDB للطابور دون اتصال
├── manifest.json                # بيانات PWA
├── sw.js                        # Service Worker
│
├── login.html                   # دخول المسؤول
├── admin.html / admin.js        # لوحة الإدارة
│
├── customer-login.html          # تسجيل/دخول العميل
├── customer-bookings.html       # حجوزات العميل
├── customer-profile.html        # الملف الشخصي
│
├── CarWash-POS/                 # نقطة بيع الفرع
│   ├── index.html
│   ├── script.js
│   └── styles.css
│
├── api/                         # REST-like JSON API
│   ├── bootstrap.php            # DB، جلسات، بريد، أمان
│   ├── config.php               # باقات، فروع، دفع
│   ├── bookings.php
│   ├── packages.php
│   ├── pricing.php
│   ├── coupons.php
│   ├── reviews.php
│   ├── customer-login.php
│   ├── customer-bookings.php
│   ├── customer-profile.php
│   ├── admin-login.php
│   ├── admin-init.php
│   ├── pos.php
│   ├── csrf.php
│   ├── health.php
│   ├── push-subscribe.php
│   ├── push-send.php
│   └── test-email.php
│
├── data/
│   ├── drcare.db                # SQLite (يُنشأ تلقائياً — مُستثنى من Git)
│   └── vapid_private.pem        # مفتاح VAPID للـ Push
│
├── java/src/com/drcare/
│   └── PricingCalculator.java
├── python/
│   └── generate_invoice.py
├── export_bookings.py           # تصدير CSV
├── build-java.sh
├── gen_icons.py                 # توليد أيقونات PWA
│
├── assets/                      # صور ووسائط
├── icons/                       # أيقونات PWA (192/512)
│
├── docs/                        # كل ملفات التوثيق (Markdown)
│   ├── FEATURES.md              # دليل شامل لكل المميزات
│   ├── BOOKING_WORKFLOW.md      # نظام Workflow الحجز + مخططات mermaid
│   ├── ROADMAP.md               # خطة عمل الفجوات المكتشفة
│   ├── CUSTOMER_SYSTEM.md       # توثيق نظام العملاء
│   ├── LOGIN_SYSTEM.md          # توثيق دخول الإدارة
│   └── PROFILE_SYSTEM.md        # توثيق الملف الشخصي
└── README.md                    # هذا الملف
```

---

## الصفحات والواجهات

| الملف | الجمهور | الوظيفة |
|-------|---------|---------|
| `index.html` | زائر / عميل | تسويق، باقات، حجز، تقييمات، PWA |
| `mobile.html` | عميل (موبايل) | تجربة حجز مبسطة للشاشات الصغيرة |
| `customer-login.html` | عميل | تسجيل + دخول |
| `customer-bookings.html` | عميل مسجل | قائمة الحجوزات، push، تقييم |
| `customer-profile.html` | عميل مسجل | بيانات، كلمة مرور، نشاط |
| `booking-tracker.html` | أي شخص | تتبع برقم الحجز + الموبايل |
| `login.html` | مسؤول | مصادقة الإدارة |
| `admin.html` | مسؤول | إدارة الطلبات والكوبونات |
| `CarWash-POS/index.html` | موظف فرع | حجز وتشغيل يومي |
| `index-2.html` | تطوير | نسخة واجهة بديلة |

---

## واجهات API

جميع الاستجابات JSON بترميز UTF-8. الرأس: `Content-Type: application/json; charset=utf-8`.

### عام

| Endpoint | Method | الوصف | المصادقة |
|----------|--------|-------|----------|
| `/api/health.php` | GET | فحص صحة الخدمة | عام |
| `/api/packages.php` | GET | الباقات، أنواع العربيات، الفروع، الدفع | عام |
| `/api/pricing.php` | GET/POST | حساب السعر (`package`, `car_type`) | عام |
| `/api/csrf.php` | GET | إرجاع رمز CSRF للجلسة | جلسة |

**مثال — health:**

```json
{ "ok": true, "uptime": 1717523456.789 }
```

**مثال — packages:**

```json
{
  "ok": true,
  "packages": [{ "code": "quick", "name": "غسلة سريعة", "price": 150 }],
  "carTypes": [{ "code": "sedan", "name": "سيدان", "extra": 0 }],
  "branches": ["القاهرة الجديدة", "مدينة نصر", "الشيخ زايد"],
  "paymentMethods": ["كاش", "Instapay", "Vodafone Cash", "بطاقة بنكية"]
}
```

---

### الحجوزات — `/api/bookings.php`

| Method | الوصف | المصادقة |
|--------|-------|----------|
| GET | قائمة كل الحجوزات | مسؤول |
| POST | إنشاء حجز جديد | **عميل مسجل** + CSRF |
| PATCH | تحديث `status` | مسؤول |

**POST body (مثال):**

```json
{
  "name": "أحمد محمد",
  "email": "ahmed@example.com",
  "phone": "01012345678",
  "servicePackage": "full",
  "carType": "suv",
  "branch": "مدينة نصر",
  "appointment": "2026-06-10T14:30",
  "paymentMethod": "كاش",
  "plateNumber": "أ ب ج 1234",
  "notes": "تنظيف مقاعد خلفية",
  "couponCode": "SUMMER20"
}
```

**قواعد التحقق:**

- الاسم: 2–80 حرف (عربي/لاتيني)
- البريد: صيغة صالحة
- الموبايل: `01[0125]XXXXXXXX`
- الموعد: بعد 15 دقيقة من الآن (إن وُجد)
- الملاحظات: حتى 300 حرف
- اللوحة: حتى 20 حرفاً
- الفرع والدفع: من القائمة في `config.php`

**استجابة ناجحة (201):**

```json
{
  "ok": true,
  "booking": {
    "id": 42,
    "total": 340,
    "totalLabel": "340 جنيه"
  }
}
```

---

### حجوزات العميل — `/api/customer-bookings.php`

| Method | Query | الوصف |
|--------|-------|-------|
| GET | `track_id` + `track_phone` | تتبع عام (بدون جلسة) |
| GET | — | حجوزات العميل المسجل |

---

### العملاء — `/api/customer-login.php`

| Method | Body / Query | الوصف |
|--------|--------------|-------|
| POST | `action: register` | تسجيل (3 محاولات/ساعة) |
| POST | `action: login` | دخول (5 محاولات/5 دقائق) |
| GET | `?action=check` | فحص الجلسة |
| GET | `?action=logout` | خروج |

**تسجيل:**

```json
{
  "action": "register",
  "name": "أحمد محمد",
  "email": "ahmed@example.com",
  "phone": "01012345678",
  "password": "secret123"
}
```

---

### الملف الشخصي — `/api/customer-profile.php`

| Method | الوصف |
|--------|-------|
| GET | بيانات العميل + `booking_count` |
| PATCH | تحديث `name`/`phone` أو `current_password` + `new_password` |

---

### الإدارة — `/api/admin-login.php` · `/api/admin-init.php`

| Endpoint | Method | الوصف |
|----------|--------|-------|
| `admin-login.php` | POST | دخول (`username`, `password`) — 5 محاولات/10 دقائق |
| `admin-login.php` | GET `?action=check` | فحص جلسة المسؤول |
| `admin-login.php` | GET `?action=logout` | خروج |
| `admin-init.php` | GET | إنشاء مسؤول افتراضي إن لم يوجد + قائمة المسؤولين |

---

### الكوبونات — `/api/coupons.php`

| Method | Action | الوصف |
|--------|--------|-------|
| POST | `validate` | التحقق من كود (عام) — body: `code`, `subtotal` |
| GET | — | قائمة الكوبونات |
| POST | `create` | إنشاء كوبون |
| PATCH | — | تفعيل/تعطيل (`id`, `is_active`) |
| DELETE | — | حذف (`id` في body) |

**حقول الكوبون:** `code`, `discount_type` (`percent`|`fixed`), `discount_value`, `min_order`, `max_uses`, `expires_at`

---

### التقييمات — `/api/reviews.php`

| Method | الوصف |
|--------|-------|
| GET | كل التقييمات (آخر 20) أو `?booking_id=` |
| POST | إرسال تقييم (عميل + CSRF) — `booking_id`, `rating` 1–5, `comment` |

---

### نقطة البيع — `/api/pos.php`

يتطلب `POS_TOKEN` في `.env`.

| Method | Parameters | الوصف |
|--------|------------|-------|
| GET | — | health POS |
| GET | `action=today&token=` | حجوزات اليوم + إيراد |
| GET | `action=search&q=&token=` | بحث |
| POST | `token` في body | إنشاء حجز POS |
| PATCH | `token`, `id`, `status` | تحديث الحالة |

---

### Web Push

| Endpoint | Method | الوصف |
|----------|--------|-------|
| `push-subscribe.php` | POST | حفظ اشتراك المتصفح |
| `push-subscribe.php` | DELETE | إلغاء الاشتراك |
| `push-send.php` | POST | إرسال إشعار (من الإدارة) — `title`, `body`, `url`, `customer_id` |

يتطلب `data/vapid_private.pem` ومفتاح عام في الواجهة.

---

### أخرى

| Endpoint | الوصف |
|----------|-------|
| `test-email.php` | اختبار SMTP (مسؤول) — `?to=email@example.com` |

---

## قاعدة البيانات

المسار: `data/drcare.db` (يُنشأ تلقائياً، **غير مُتتبع في Git**).

### `bookings`

| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | INTEGER PK | |
| name, phone | TEXT | مطلوب |
| email | TEXT | |
| package_code, package_name | TEXT | |
| car_type_code, car_type_name | TEXT | |
| branch, appointment | TEXT | |
| notes, plate_number | TEXT | |
| payment_method | TEXT | |
| total_price | REAL | |
| created_at | TEXT | ISO 8601 |
| status | TEXT | افتراضي `new` |
| customer_id | INTEGER | اختياري |
| source | TEXT | `web` أو `pos` |

### `customer_users`

| العمود | النوع |
|--------|-------|
| id | INTEGER PK |
| email | TEXT UNIQUE |
| phone, name | TEXT |
| password_hash | TEXT (bcrypt) |
| created_at, last_login | TEXT |
| is_active | INTEGER |

### `admin_users`

| العمود | النوع |
|--------|-------|
| id | INTEGER PK |
| username, email | TEXT UNIQUE |
| password_hash | TEXT |
| created_at, last_login | TEXT |
| is_active | INTEGER |

### `coupons`

| العمود | النوع |
|--------|-------|
| code | TEXT UNIQUE |
| discount_type | `percent` / `fixed` |
| discount_value, min_order | REAL |
| max_uses, used_count | INTEGER |
| expires_at | TEXT |
| is_active | INTEGER |

### `reviews`

| العمود | النوع |
|--------|-------|
| booking_id | INTEGER UNIQUE |
| customer_id | INTEGER |
| rating | 1–5 |
| comment | TEXT |

### `push_subscriptions`

`customer_id`, `endpoint`, `p256dh`, `auth`, `created_at`

### `rate_limits`

`rl_key`, `hit_at` — لتحديد معدل الطلبات

---

## التسعير والباقات

يُعرّف في `api/config.php` (ومعادل في Java/Python).

### الباقات

| الكود | الاسم | السعر الأساسي (جنيه) |
|-------|-------|----------------------|
| `quick` | غسلة سريعة | 150 |
| `full` | Full Care | 280 |
| `detail` | دكتور العربية | 650 |
| `fleet` | باقات الشركات | حسب التعاقد (0) |

### إضافة نوع العربية

| الكود | النوع | إضافة (جنيه) |
|-------|-------|--------------|
| `sedan` | سيدان | 0 |
| `suv` | SUV | 60 |
| `van` | فان | 90 |
| `pickup` | نقل خفيف | 120 |

**المعادلة:** `الإجمالي = سعر الباقة + إضافة النوع − خصم الكوبون`

### حساب السعر عبر API

```bash
curl "http://127.0.0.1:8000/api/pricing.php?package=full&car_type=suv"
```

```json
{ "ok": true, "price": 340, "label": "340 جنيه", "source": "php" }
```

### Java (CLI)

```bash
./build-java.sh
java -cp java/classes com.drcare.PricingCalculator full suv
# Output: 340
```

---

## حالات الحجز

| القيمة | التسمية العربية |
|--------|-----------------|
| `new` | جديد |
| `confirmed` | مؤكد |
| `in_service` | قيد التنفيذ |
| `completed` | تم التسليم |
| `cancelled` | ملغي |

تُحدَّث من لوحة الإدارة أو POS. عند التحديث من الإدارة يُرسل إشعار Push للعميل (إن كان مشتركاً).

---

## متغيرات البيئة

انسخ `.env.example` إلى `.env`:

```env
# ── المسؤول ──
DRCARE_DEFAULT_ADMIN_AUTO_CREATE=0
DRCARE_DEFAULT_ADMIN_USER=admin
DRCARE_DEFAULT_ADMIN_PASS=replace-with-strong-password
DRCARE_NOTIFICATION_EMAIL=admin@example.com

# ── التطبيق ──
DRCARE_APP_ORIGIN=http://localhost
DRCARE_TRUSTED_PROXY=0

# ── البريد ──
DRCARE_EMAIL_FROM=notifications@example.com
DRCARE_EMAIL_NAME="DR.Care Notifications"
MAILER_SMTP_HOST=smtp.example.com
MAILER_SMTP_PORT=587
MAILER_SMTP_SECURITY=starttls
MAILER_SMTP_USERNAME=
MAILER_SMTP_PASSWORD=

# ── نقطة البيع ──
POS_TOKEN=replace-with-long-random-token
# توليد: openssl rand -hex 32

# ── Java (اختياري) ──
DRCARE_JAVA_CMD=java
DRCARE_JAVAC_CMD=javac
```

| المتغير | الوظيفة |
|---------|---------|
| `DRCARE_DEFAULT_ADMIN_AUTO_CREATE` | `1` لإنشاء مسؤول تلقائياً عند أول تشغيل |
| `DRCARE_APP_ORIGIN` | أصل مسموح لـ CORS |
| `DRCARE_TRUSTED_PROXY` | `1` لقراءة IP من `X-Forwarded-For` في rate limit |
| `POS_TOKEN` | **مطلوب** لتشغيل CarWash-POS |
| `MAILER_SMTP_*` | إرسال إشعارات الحجز بالبريد |

---

## PWA والعمل دون اتصال

### الملفات

- `manifest.json` — اسم التطبيق، ألوان، أيقونات، اختصارات «احجز الآن» و«لوحة الإدارة»
- `sw.js` — تخزين مؤقت للأصول الثابتة؛ API شبكة أولاً
- `idb.js` + outbox في SW — طابور طلبات عند انقطاع الشبكة (مزامنة لاحقة)

### التثبيت

1. افتح الموقع عبر HTTPS (أو localhost)
2. من Chrome: «تثبيت التطبيق» أو بانر التثبيت في الصفحة
3. الأيقونات: `icons/icon-192.png`, `icons/icon-512.png` (يمكن توليدها بـ `gen_icons.py`)

### Service Worker

- **تثبيت:** يخزن `index.html`, `styles.css`, `script.js`, `manifest.json`, وغيرها
- **API:** لا يُخزَّن — رسالة JSON عند عدم الاتصال
- **Push:** معالج `push` في `sw.js` لعرض الإشعارات

---

## نقطة البيع CarWash-POS

واجهة منفصلة للموظفين في الفرع.

### الإعداد

1. عيّن `POS_TOKEN` في `.env` (سلسلة عشوائية طويلة)
2. افتح `CarWash-POS/index.html`
3. أدخل الرمز عند الطلب (يُخزَّن محلياً في المتصفح)

### القدرات

- إنشاء فاتورة/حجز فوري مع إشعار بريد (إن كان SMTP مفعّلاً)
- عرض حجوزات اليوم (`source = pos`) + إجمالي الإيراد
- بحث سريع
- تغيير حالة الطلب

---

## البريد الإلكتروني

عند نجاح حجز جديد (ويب أو POS) يُرسل بريد إلى `DRCARE_NOTIFICATION_EMAIL` إذا وُجد SMTP أو `mail()`.

**اختبار الإعداد (بعد دخول الإدارة):**

```text
GET /api/test-email.php?to=your@email.com
```

**Gmail (مثال):**

```env
MAILER_SMTP_HOST=smtp.gmail.com
MAILER_SMTP_PORT=587
MAILER_SMTP_SECURITY=starttls
MAILER_SMTP_USERNAME=your@gmail.com
MAILER_SMTP_PASSWORD=app-password-from-google
```

---

## إشعارات Web Push

1. العميل يفعّل الإشعارات من `customer-bookings.html`
2. الاشتراك يُحفظ في `push_subscriptions`
3. عند تغيير الحالة من `admin.js` يُستدعى `api/push-send.php`

**متطلبات الإنتاج:** HTTPS، ملف `data/vapid_private.pem`، ومفتاح VAPID العام في الواجهة.

---

## الأمان

| الآلية | التفاصيل |
|--------|----------|
| كلمات المرور | `password_hash` / `password_verify` (BCRYPT, cost 10) |
| SQL | PDO + prepared statements |
| الجلسات | `httponly`, `samesite=Lax`, `secure` على HTTPS |
| CSRF | رمز في الجلسة + رأس `X-CSRF-Token` للحجز والتقييم |
| Rate limit | تسجيل عميل، دخول عميل/مسؤول |
| HTTPS | إعادة توجيه 301 خارج localhost |
| POS | `hash_equals` للرمز |
| CORS | نفس المضيف أو `DRCARE_APP_ORIGIN` |

### بروتوكول الإضافات البرمجية
عند إضافة واجهات API جديدة، يجب الالتزام بالآتي:
1. استدعاء `require_once 'bootstrap.php'` في بداية الملف.
2. التحقق من `CSRF_TOKEN` للعمليات التي تعدل البيانات (POST/PATCH/DELETE).
3. استخدام `PDO Prepared Statements` حصرياً لمنع SQL Injection.
4. التحقق من رتبة المستخدم (Admin vs Customer) عبر الجلسة.

**توصيات الإنتاج:**

- غيّر كلمة مرور المسؤول فوراً
- عطّل `DRCARE_DEFAULT_ADMIN_AUTO_CREATE`
- احمِ `api/admin-init.php` (مثلاً IP أو حذف بعد الإعداد)
- لا ترفع `.env` أو `data/*.db` إلى Git
- استخدم HTTPS ونسخ احتياطي لـ `drcare.db`

---

## أدوات مساعدة

### تصدير الحجوزات (CSV)

```bash
python3 export_bookings.py
python3 export_bookings.py --out /path/to/bookings.csv
```

### فاتورة نصية (Python)

```bash
python3 python/generate_invoice.py --id 42
```

### تجميع Java

```bash
./build-java.sh
```

### أيقونات PWA

```bash
python3 gen_icons.py
```

---

## CI/CD

ملف: `.github/workflows/ci.yml` — يشغّل **`scripts/run-tests.sh`** بالكامل.

| الخطوة | الوصف |
|--------|-------|
| PHP lint | فحص syntax لكل `api/*.php` |
| PHPUnit | **25** اختبار تكامل (API، auth، حجز، كوبونات، POS، تقييمات) |
| Java | حاسبة الأسعار |
| Python | `tests/test_export_bookings.py` |
| ESLint | `script.js`, `admin.js`, `mobile.js`, … |

### تشغيل الاختبارات محلياً

```bash
bash scripts/run-tests.sh
# أو
npm test
```

**PHPUnit فقط:**

```bash
composer install
composer test:php
```

قاعدة بيانات الاختبار معزولة في `/tmp` — لا تمس `data/drcare.db`.

---

## النشر للإنتاج

### Apache / Nginx

- وجّه الجذر (`DocumentRoot`) إلى مجلد المشروع
- فعّل `mod_rewrite` إن لزم
- PHP-FPM 8.1+
- صلاحيات كتابة على `data/` (قاعدة البيانات + VAPID)

### checklist

- [ ] `.env` مُعدّ للإنتاج
- [ ] HTTPS + شهادة صالحة (للـ PWA والجلسات)
- [ ] `DRCARE_APP_ORIGIN` = عنوان الموقع الفعلي
- [ ] `POS_TOKEN` قوي ومختلف عن التطوير
- [ ] SMTP يعمل (`test-email.php`)
- [ ] نسخ احتياطي دوري لـ `data/drcare.db`
- [ ] تقييد الوصول لـ `admin-init.php` بعد الإعداد

### استضافة مشتركة

يعمل المشروع على استضافة تدعم PHP + SQLite. تجنّب فتح الملفات مباشرة بدون خادم.

---

## استكشاف الأخطاء

| المشكلة | الحل المحتمل |
|---------|--------------|
| `Load failed` / فشل API | لا تستخدم `file://` — شغّل `php -S` |
| الحجز يطلب تسجيل دخول | سجّل من `customer-login.html` ثم أعد المحاولة |
| POS لا يعمل | تأكد من `POS_TOKEN` في `.env` |
| لا يصل بريد | راجع SMTP عبر `test-email.php` وسجلات PHP |
| Push لا يعمل | HTTPS + VAPID + إذن الإشعارات في المتصفح |
| قاعدة البيانات فارغة | أول طلب API ينشئ الجداول — تحقق من صلاحيات `data/` |
| 429 Too Many Requests | انتظر نافذة rate limit أو راجع IP/بروكسي |
| CORS | طابق `DRCARE_APP_ORIGIN` مع عنوان الموقع |

**سجلات:** `error_log` في PHP — رسائل مثل `DR.Care mail failed: booking #N`

---

## وثائق إضافية

| الملف | المحتوى |
|-------|---------|
| **[FEATURES.md](./docs/FEATURES.md)** | **دليل شامل لكل المميزات والتفاصيل الدقيقة** |
| [BOOKING_WORKFLOW.md](./docs/BOOKING_WORKFLOW.md) | نظام Workflow الحجز (State Machine) + مخططات mermaid |
| [ROADMAP.md](./docs/ROADMAP.md) | خطة عمل الفجوات المكتشفة مرتبة بالأولوية |
| [CUSTOMER_SYSTEM.md](./docs/CUSTOMER_SYSTEM.md) | تفاصيل API العملاء والتحقق |
| [LOGIN_SYSTEM.md](./docs/LOGIN_SYSTEM.md) | نظام دخول الإدارة |
| [PROFILE_SYSTEM.md](./docs/PROFILE_SYSTEM.md) | الملف الشخصي وتدفقات UX |

---

## تدفقات الاستخدام (مختصرة)

### عميل — حجز جديد

```
index.html → تسجيل دخول → ملء النموذج → كوبون (اختياري)
→ POST /api/bookings.php → إيميل للإدارة → عرض في customer-bookings.html
```

### مسؤول — معالجة طلب

```
login.html → admin.html → تحديث الحالة → Push للعميل (إن وُجد)
```

### زائر — تتبع بدون حساب

```
booking-tracker.html → رقم الحجز + الموبايل → GET customer-bookings.php?track_*
```

---

<div align="center">

**DR.Care** — مغسلة عربيات مصرية · القاهرة الجديدة · مدينة نصر · الشيخ زايد

الإصدار **2.0** · آخر تحديث للتوثيق: 2026

</div>
