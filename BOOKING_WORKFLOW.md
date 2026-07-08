# نظام Workflow الحجز — DR.Care

هذا المستند هو مصدر التوثيق الرسمي لسير عمل الحجز (Booking Workflow) بالكامل: من واجهات المستخدم المختلفة، عبر الـ API، وصولاً لقاعدة البيانات. للتفاصيل الشاملة لكل ميزة في المشروع راجع `FEATURES.md`.

## 1) نظرة معمارية عامة

كل الواجهات (ديسكتوب، أدمن، نقطة البيع، الموبايل القديم، تطبيق الموبايل الجديد) تتصل بنفس طبقة الـ API (`api/*.php`)، والتي تمر جميعها عبر `api/bootstrap.php` (اتصال قاعدة البيانات، الجلسات، CSRF، Rate limiting) وتستخدم `api/BookingStateMachine.php` كمصدر الحقيقة الوحيد لحالة الحجز.

```mermaid
graph TD
  subgraph Frontends[الواجهات]
    Desktop["الموقع الرئيسي<br/>index.html + script.js"]
    Admin["لوحة الأدمن<br/>admin.html + admin.js"]
    POS["نقطة البيع (فرع)<br/>CarWash-POS/"]
    MobileLegacy["الموبايل القديم<br/>mobile.html + mobile.js"]
    MobileApp["تطبيق الموبايل الجديد<br/>mobile-app/ (React + Vite)"]
  end

  subgraph API[api/*.php]
    Bootstrap["bootstrap.php<br/>(DB, Session, CSRF, Rate-limit)"]
    SM["BookingStateMachine.php<br/>(حالات + انتقالات + آثار جانبية)"]
    Bookings["bookings.php<br/>(أدمن + إنشاء ويب)"]
    CustBookings["customer-bookings.php<br/>(عرض/إلغاء/إعادة جدولة العميل)"]
    Pos["pos.php<br/>(إنشاء/تحديث من الفرع)"]
    Reviews["reviews.php"]
    Loyalty["loyalty.php / referral.php"]
  end

  subgraph Data[التخزين والخدمات الخارجية]
    DB[("SQLite<br/>data/drcare.db")]
    WA["WhatsApp Cloud API"]
    SMTP["بريد إلكتروني (SMTP)"]
    Push["Web Push (VAPID)"]
  end

  Desktop --> Bookings
  Desktop --> CustBookings
  Admin --> Bookings
  POS --> Pos
  MobileLegacy --> Bookings
  MobileLegacy --> CustBookings
  MobileApp --> Bookings
  MobileApp --> CustBookings

  Bookings --> Bootstrap
  CustBookings --> Bootstrap
  Pos --> Bootstrap
  Reviews --> Bootstrap
  Loyalty --> Bootstrap
  Bootstrap --> SM
  SM --> DB
  Bootstrap --> DB
  SM --> WA
  Bootstrap --> SMTP
  Bootstrap --> Push
```

## 2) دورة حياة الحجز (State Machine)

مصدر الحقيقة الوحيد: **`api/BookingStateMachine.php`**. يُستدعى من الأماكن الثلاثة التي تغيّر حالة الحجز (`api/bookings.php` PATCH، `api/pos.php` PATCH، `api/customer-bookings.php` PATCH) بدل تكرار فحص enum في كل ملف.

```mermaid
stateDiagram-v2
  [*] --> new : إنشاء حجز (ويب/POS)
  new --> confirmed : admin, pos
  new --> cancelled : admin, pos, customer
  confirmed --> in_service : admin, pos
  confirmed --> cancelled : admin, pos, customer
  in_service --> completed : admin, pos
  in_service --> cancelled : admin, pos
  completed --> [*]
  cancelled --> [*]
```

- **لا يمكن تخطي حالات** (مثلاً `new → completed` مباشرة مرفوض، `409`).
- **لا يمكن الرجوع لحالة سابقة** (`completed → new` مرفوض).
- العميل نفسه يقدر يلغي حجزه فقط من `new`/`confirmed` (نفس القاعدة القديمة، الآن معمَّمة عبر `BookingStateMachine::canTransition()`).
- عند الوصول لـ `completed` أو `cancelled`: يُمسح `payment_screenshot` تلقائياً.
- عند الوصول لـ `completed` لأول مرة: تُمنح نقاط ولاء + مكافأة إحالة (إن وُجدت).
- عند أي انتقال فعلي (`confirmed`/`in_service`/`completed`/`cancelled`): تُرسل رسالة واتساب مناسبة للعميل — **الآن من `bookings.php` (أدمن) و`pos.php` (الفرع) معاً**، بعد ما كانت مقتصرة على الأدمن فقط.

## 3) تسلسلات (Sequence Diagrams)

### إنشاء حجز من الموقع/الموبايل (عميل مسجّل)

```mermaid
sequenceDiagram
  participant C as العميل (ويب/موبايل)
  participant API as bookings.php (POST)
  participant DB as SQLite
  participant WA as WhatsApp

  C->>API: POST /api/bookings.php (بيانات الحجز + CSRF)
  API->>DB: تحقق من الموعد/الكوبون (atomic)
  API->>DB: INSERT INTO bookings (status='new')
  API->>WA: رسالة تأكيد استلام الحجز
  API-->>C: { ok:true, booking:{ id, total, totalLabel } }
```

### إنشاء حجز من نقطة البيع (POS)

```mermaid
sequenceDiagram
  participant Emp as موظف الفرع
  participant API as pos.php (POST)
  participant DB as SQLite
  participant WA as WhatsApp

  Emp->>API: POST /api/pos.php (POS_TOKEN + بيانات الحجز)
  API->>DB: INSERT INTO bookings (status='new', source='pos')
  API->>WA: رسالة تأكيد استلام الحجز
  API-->>Emp: { ok:true, booking:{ id, claim_token, ... } }
```

### تحديث حالة الحجز (أدمن أو POS)

```mermaid
sequenceDiagram
  participant Actor as الأدمن / موظف الفرع
  participant API as bookings.php أو pos.php (PATCH)
  participant SM as BookingStateMachine
  participant DB as SQLite
  participant WA as WhatsApp

  Actor->>API: PATCH { id, status: newStatus }
  API->>SM: assertTransition(from, to, actorType)
  alt انتقال غير صالح
    SM-->>API: BookingTransitionException
    API-->>Actor: 409 "لا يمكن تغيير حالة الحجز..."
  else انتقال صالح
    API->>DB: UPDATE bookings SET status=...
    API->>DB: INSERT INTO audit_log (logAudit)
    API->>SM: applyStatusSideEffects(from, to)
    SM->>DB: منح نقاط ولاء (لو completed لأول مرة)
    SM->>WA: إرسال رسالة الحالة الجديدة
    API-->>Actor: 200 { ok:true }
  end
```

### إلغاء/إعادة جدولة من العميل

```mermaid
sequenceDiagram
  participant C as العميل
  participant API as customer-bookings.php (PATCH)
  participant SM as BookingStateMachine
  participant DB as SQLite

  C->>API: PATCH { id, action: 'cancel' | 'reschedule' }
  API->>SM: canTransition(status, 'cancelled', 'customer')
  alt مسموح (status new أو confirmed)
    API->>DB: تحديث status/appointment + logAudit
    API-->>C: 200 { ok:true }
  else غير مسموح
    API-->>C: 422 "لا يمكن إلغاء/تعديل هذا الحجز في حالته الحالية"
  end
```

### التقييم (Review)

```mermaid
sequenceDiagram
  participant C as العميل
  participant API as reviews.php (POST)
  participant DB as SQLite

  C->>API: POST { booking_id, rating, comment }
  API->>DB: SELECT status FROM bookings WHERE id=...
  alt status != 'completed'
    API-->>C: 400 "لا يمكن التقييم قبل اكتمال الحجز"
  else يوجد تقييم سابق لنفس الحجز
    API-->>C: 409 "تم التقييم بالفعل"
  else
    API->>DB: INSERT INTO reviews
    API-->>C: 200 { ok:true }
  end
```

## 4) ملاحظة توافق مع `mobile-app/` (React)

تطبيق الموبايل الجديد (`mobile-app/`) كان يفترض شكل رد مختلف عن الـ API الفعلي (`d.logged_in` بدل `d.authenticated`، `d.success` بدل `d.ok`، `bookings.php?action=list` بدل `customer-bookings.php`، ومفاتيح حالة `pending/in_progress` بدل `new/in_service`). تم إصلاح هذه الفروقات في الشاشات: `useAuth.jsx`, `LoginScreen.jsx`, `BookingScreen.jsx`, `BookingSuccessScreen.jsx`, `BookingsScreen.jsx` — بدون تغيير أي عقد في الـ backend نفسه.

## 5) الاختبارات

- `tests/Unit/BookingStateMachineTest.php` — يغطي كل حواف الانتقال المسموحة/الممنوعة لكل نوع مستخدم (admin/pos/customer) بمعزل عن الشبكة/القاعدة.
- `tests/Integration/BookingFlowTest.php`, `PosApiTest.php`, `ReviewsTest.php` — يغطون منع تخطي/عكس الحالات عبر HTTP فعلي، ومنح نقاط الولاء عند اكتمال حجز POS مرتبط بعميل.
