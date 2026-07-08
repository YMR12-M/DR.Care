## 📱 تطبيق الموبايل الجديد (`mobile-app/`)

## نظرة عامة

تطبيق **React 19 + Vite + Tailwind v4** مستقل تماماً عن الموقع الرئيسي وعن نسخة الموبايل القديمة (`mobile.html`/`mobile.js` في جذر المشروع). يعيد بناء نفس تجربة الحجز بواجهة SPA حديثة، ويكلّم نفس الـ PHP backend (`api/*.php`) عبر بروكسي Vite في التطوير.

🎯 **الهدف الاستراتيجي (كما أكّده صاحب المشروع):** هذا التطبيق مقصود بيه **استبدال الموقع بالكامل** — مش مجرد شاشة موبايل ثانوية بجانب نسخة الديسكتوب. الفكرة إنه "نسخة ويب على شكل آب" تُنصَّب كـ PWA حقيقية (installable). يعني كل الفجوات الموثّقة تحت مش "تحسينات على شاشة فرعية" — هي عوائق مباشرة أمام الهدف النهائي للمشروع.

⚠️ **حالة الجاهزية الفعلية: بعيدة جداً عن هذا الهدف.** بعد إصلاح عقد الـ API الأساسي (auth/login/بنية رد الحجز، راجع `BOOKING_WORKFLOW.md`)، تبيّن عند الفحص أن:
- **تدفق الحجز نفسه ما زال مكسوراً بالكامل** بسبب قيم ثابتة غير متطابقة مع الـ backend (تفصيل كامل أدناه).
- **لا يوجد أي تنصيب PWA فعلي** — لا `manifest.json`، لا Service Worker، رغم شارة "PWA Ready" المعروضة في الصفحة الرئيسية (زائفة حالياً — راجع الملاحظات أدناه). الموقع القديم في الجذر عنده فعلاً `manifest.json`/`sw.js` يمكن الاستئناس بهما.
- **4 شاشات أساسية غير موجودة إطلاقاً** (تسجيل حساب، نسيت كلمة المرور، تعديل الملف الشخصي، كوبوناتي) — لا يمكن اعتبار التطبيق بديلاً كاملاً للموقع بدونها.

هذا الملف يوثّق الوضع كما هو فعلياً، وليس كما يُفترض أن يكون.

## البنية

```
mobile-app/
├── index.html          theme-color أزرق (#2563eb) — لا يطابق هوية العلامة الأصفر/الأسود
├── package.json         react19, react-router-dom v7, vite v8
├── vite.config.js       بروكسي /api → http://localhost:8000
├── .oxlintrc.json       Oxlint (ليس ESLint) — قاعدتان فقط مفعّلتان صراحة
├── README.md            نص Vite الافتراضي، غير مخصَّص للمشروع
└── src/
    ├── main.jsx
    ├── App.jsx          BrowserRouter + كل الـ Routes
    ├── index.css        كل الـ design tokens (CSS variables) + كلاسات مساعدة
    ├── hooks/
    │   ├── useAuth.jsx   Context لحالة تسجيل الدخول
    │   └── useToast.jsx  Context لنظام Toast — ⚠️ غير مُستخدَم من أي شاشة فعلياً
    ├── lib/api.js        fetchCsrf / secureFetch / api.get / api.post
    ├── components/
    │   ├── BottomNav.jsx, Toast.jsx, OfflineToast.jsx, PromoBanner.jsx, WhatsAppBtn.jsx
    └── screens/
        ├── HomeScreen.jsx           الصفحة الرئيسية الكاملة (969 سطر)
        ├── LoginScreen.jsx          تسجيل الدخول
        ├── BookingScreen.jsx        معالج حجز 3 خطوات
        ├── BookingSuccessScreen.jsx تأكيد الحجز (لا يعتمد على API، آمن)
        ├── BookingsScreen.jsx       قائمة حجوزات العميل
        └── ProfileScreen.jsx        الملف الشخصي
```

## التوجيه (Routing)

**Routes معرّفة فعلياً** (`App.jsx:31-36`): `/`, `/book`, `/bookings`, `/profile`, `/login`, `/booking-success`. لا يوجد route احتياطي (404).

**مسارات مُشار إليها في الكود لكن غير معرّفة إطلاقاً** (شاشات ناقصة، وليست موجودة كملفات حتى):
- `/register` (من `LoginScreen.jsx` و`ProfileScreen.jsx`)
- `/forgot-password` (من `LoginScreen.jsx`)
- `/edit-profile`, `/coupons` (من `ProfileScreen.jsx`)

`App.jsx:15-16` يضع `/register` و`/forgot-password` ضمن قوائم `HIDE_NAV`/`HIDE_WAAPP` رغم عدم وجود `<Route>` فعلي لهما — تصميم استباقي غير مكتمل.

## ⚠️ أخطاء حقيقية تمنع نجاح أي حجز فعلياً — مُتحقَّق منها في الكود مباشرة

هذه ليست فرضيات؛ كل نقطة تحتها إشارة للسطر المحدد في `mobile-app/` والسطر المقابل في `api/*.php`.

### 1) الفرع مُثبَّت على قيمة غير موجودة — كل حجز يُرفض بـ 400

`BookingScreen.jsx:839` يرسل دائماً:
```js
branch: 'main',
```
بينما `api/config.php:21` يحدد الفروع الصالحة الوحيدة كنص عربي:
```php
'branches' => ['قليوب — شارع العروبة'],
```
و`api/bookings.php:49-51` يتحقق: `if (!in_array($branch, $allowedBranches, true)) jsonResponse([...'الفرع غير صالح'], 400);`. بما أن `'main'` لا يطابق أبداً، **كل محاولة حجز عبر هذا التطبيق تُرفض حالياً بـ 400 بغض النظر عن أي بيانات أخرى** — هذا هو أكثر خطأ حرج في التطبيق كله.

### 2) أكواد طرق الدفع إنجليزية لا تطابق الـ backend

`BookingScreen.jsx:38-42`:
```js
const PAYMENT_METHODS = [
  { code: 'Cash',          name: 'كاش' },
  { code: 'Instapay',      name: 'Instapay' },
  { code: 'Vodafone Cash', name: 'فودافون كاش' },
];
```
بينما `api/config.php:22`: `'paymentMethods' => ['كاش', 'Instapay']`. فقط `'Instapay'` قد يطابق بالصدفة؛ `'Cash'` و`'Vodafone Cash'` لن يطابقا `'كاش'` أبداً. (لن يظهر هذا الخطأ عملياً لأن فحص الفرع أعلاه يفشل أولاً ويوقف الطلب قبل الوصول لهذا التحقق.)

### 3) كود الخصم لا يعمل أبداً — حقل الرد غير موجود

`BookingScreen.jsx:470`:
```js
if (d.valid) { setApplied(d); ... }   // d.valid غير موجود إطلاقاً في أي رد من الـ backend
```
`api/coupons.php` (`action=validate`, أسطر 12-44) يُرجع عند النجاح `{ ok:true, code, discount_type, discount_value, discount, new_total }` — **لا يوجد حقل `valid` في أي مسار من الكود**، لا عند النجاح ولا الفشل. النتيجة: `d.valid` دائماً `undefined`، فتظهر رسالة "كود غير صالح" حتى مع كوبون صحيح 100% تم التحقق منه بنجاح فعلياً في الخادم.

### 4) شاشة اختيار الميعاد تتعطل بمجرد وجود مواعيد فعلية

`BookingScreen.jsx:290-292`:
```js
fetch(`../api/slots.php?date=${form.apptDate}`)
  .then(r => r.json())
  .then(d => setSlots(d.slots || []))
```
ثم السطر 304: `const availSlots = slots.filter(s => s.available !== false);`

لكن `api/slots.php` (مسار GET العام، أسطر 30-51) **يتجاهل تماماً** أي `$_GET['date']` (لا يُقرأ إطلاقاً في هذا الفرع)، ويُرجع **كائناً** مُجمَّعاً حسب التاريخ:
```php
$grouped[$r['slot_date']][] = [...];
jsonResponse(['slots' => $grouped]);   // كائن {"2026-07-09": [...]}, وليس مصفوفة
```
بمجرد وجود أي موعد نشط واحد في قاعدة البيانات (عبر لوحة الأدمن)، يصبح `d.slots` **كائناً** لا مصفوفة، فيرمي `slots.filter(...)` خطأ وقت التشغيل (`TypeError: slots.filter is not a function`) يُعطِّل شاشة اختيار الميعاد بالكامل. لا يظهر الخطأ فقط إذا كان جدول `appointment_slots` فارغاً تماماً (عندها `$grouped = []` تُرمَّز كمصفوفة فارغة JSON) — ما قد يُخفي المشكلة أثناء اختبار يدوي سريع بدون بيانات مواعيد حقيقية.

### 5) نوع العربية لا يظهر أبداً في قائمة الحجوزات

`BookingsScreen.jsx:28`: `{booking.car_type || booking.carType}` — لكن اسم العمود الفعلي في قاعدة البيانات (وفي رد `api/customer-bookings.php` الذي يعمل `SELECT *`) هو **`car_type_name`**. النتيجة: هذا السطر فارغ دائماً في كل بطاقة حجز، بينما `package_name` بجواره صحيح لأنه يطابق اسم العمود الفعلي بالصدفة.

### 6) قسم نقاط الولاء في البروفايل ميت دائماً

`ProfileScreen.jsx:86-95` يعرض قسم نقاط الولاء إذا `user.loyalty_points > 0` — لكن لا `customer-login.php?action=check` ولا `action=login` يُرجعان حقل `loyalty_points` إطلاقاً (فقط `ok, authenticated, name, email, phone, email_verified`، راجع `CUSTOMER_SYSTEM.md`). لا يوجد أي endpoint حالياً يُرجع رصيد النقاط لواجهة الموبايل الجديدة (الرصيد موجود ويُحسَب فعلياً في `api/loyalty.php` لكن هذا التطبيق لا يستدعيه). القسم كود ميت — لن يظهر أبداً بغض النظر عن رصيد العميل الحقيقي.

## ملاحظات إضافية (أقل حدة، لكن حقيقية)

- **مسارات API نسبية هشة**: كل نداءات `fetch` تستخدم `../api/xxx.php` (نسبي) بدل `/api/xxx.php` (مطلق). يعمل حالياً بالصدفة لأن كل الـ routes الحالية بعمق مستوى واحد. أي route متداخل مستقبلاً (مثل `/book/step2`) سيكسر كل نداءات API في تلك الشاشة.
- **`useToast`/`Toast.jsx` غير مُستخدَمين فعلياً** — بنية Toast كاملة جاهزة ومربوطة في `App.jsx`، لكن كل شاشة تستخدم `useState` محلي للأخطاء بدلاً منها.
- **تكرار بيانات ثابتة**: `FALLBACK_PACKAGES`/`CAR_TYPES` معرّفتان بنفس القيم حرفياً في كل من `HomeScreen.jsx` و`BookingScreen.jsx` بدون مصدر مشترك.
- **رقم تواصل غير متسق**: `ProfileScreen.jsx` يستخدم `tel:+201000000000` (رقم placeholder وهمي) لزر "تواصل معنا"، بينما باقي الشاشات (`HomeScreen.jsx`, `WhatsAppBtn.jsx`) تستخدم الرقم الحقيقي `01037957593`.
- **شارة "PWA Ready" زائفة**: `HomeScreen.jsx` يعرض شارة PWA في الفوتر، لكن لا يوجد `manifest.json` ولا Service Worker مُسجَّل في `mobile-app/` إطلاقاً (بخلاف الموقع القديم في الجذر الذي لديه فعلاً `manifest.json`/`sw.js`).
- **لا اختبارات إطلاقاً**: لا `*.test.jsx`، لا Vitest/Jest، ولا خطوة في CI تبني أو تختبر `mobile-app/` (راجع `TESTING.md`) — أي تغيير هنا غير محمي بأي شبكة أمان آلية.
- أصول غير مستخدمة من قالب Vite الافتراضي: `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png` — لا يشير إليها أي كود.

## نظام التصميم

- كل الـ design tokens في `src/index.css:3-27` كـ CSS custom properties (`--black`, `--yellow*`, `--white*`, `--muted*`, `--success`, `--error`, `--line*`) — **لا يوجد `tailwind.config.js`**؛ Tailwind v4 يُستورد فقط عبر `@import "tailwindcss";` والتخصيص كله عبر `style={{...}}` inline بالمتغيرات، وليس كلاسات ألوان Tailwind.
- خط Cairo (عربي) + `dir="rtl"` على مستوى الصفحة.

## ماذا تفعل بهذا الملف

قبل أي إصلاح لهذه المشاكل، راجع `ROADMAP.md` — أخطاء §1-4 أعلاه (الفرع، الكوبون، المواعيد) لها أولوية قصوى لأنها تمنع الحجز بالكامل، وليست تحسينات تجميلية.

**الترتيب المنطقي نحو الهدف الاستراتيجي (استبدال الموقع بـ PWA حقيقية):**
1. إصلاح كسر الحجز (§1-4 أعلاه) — بدون حجز شغال، لا معنى لأي تحسين آخر.
2. الشاشات الأربع الناقصة (تسجيل/نسيت كلمة المرور/تعديل ملف/كوبونات) — بدونها التطبيق مش بديل كامل للموقع.
3. تنصيب PWA حقيقي (`manifest.json` + Service Worker + عمل دون اتصال) — هذا ما يحوّله فعلياً من "موقع بيبان زي آب" لـ "آب قابل للتنصيب".
4. عندها فقط يصير قرار استبدال الموقع الرئيسي/نسخة الموبايل القديمة به منطقياً.

---

**آخر تحديث:** 2026
