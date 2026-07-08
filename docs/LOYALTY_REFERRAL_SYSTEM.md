## ⭐ نظام نقاط الولاء والإحالة في DR.Care

## نظرة عامة

نظامان مترابطان يعتمدان على نفس الجدول (`loyalty_points`):

- **نقاط الولاء:** تُمنح تلقائياً عند اكتمال حجز، وتُستبدَل بكوبونات خصم.
- **الإحالة (Referral):** كل عميل له كود إحالة فريد؛ عند تسجيل عميل جديد بكود إحالة صحيح، يُكافأ الطرفان بنقاط عند اكتمال أول حجز للعميل الجديد.

## الملفات الأساسية

- `api/loyalty.php` — رصيد النقاط، السجل، مكافآت الاستبدال (`GET`/`POST`)
- `api/referral.php` — كود الإحالة الخاص بالعميل + إحصائياته (`GET`)
- `api/BookingStateMachine.php` — دالة `awardCompletionLoyalty()` تمنح النقاط عند اكتمال أول حجز (راجع `BOOKING_WORKFLOW.md`)
- `api/bootstrap.php` — دالة `maybeRewardReferral()` تُكافئ الإحالة، ودالة `generateUniqueReferralCode()`
- `api/customer-login.php` — يقبل `referral_code` عند التسجيل ويحفظ `referred_by_id`

## كيف تُمنح نقاط الولاء

عند وصول حجز لحالة `completed` **لأول مرة فقط** (مُتحقَّق منه بعدم وجود صف سابق بنفس `booking_id` في `loyalty_points`)، ولو كان الحجز مرتبطاً بـ `customer_id`:

- **نقطة واحدة لكل 10 جنيه** من `total_price`، بحد أدنى **5 نقاط**.
- تُطبَّق من `api/bookings.php` (أدمن) و`api/pos.php` بالتساوي الآن (موحّدة عبر `BookingStateMachine`).
- حجوزات الضيوف (بدون `customer_id`) لا تمنح نقاطاً — حتى لو رُبطت لاحقاً بحساب عبر `api/claim-booking.php`، **لن تُمنح نقاط بأثر رجعي** لأن شرط "أول اكتمال" يكون قد مضى بالفعل قبل الربط.

## كيف تعمل الإحالة

1. عند التسجيل (`api/customer-login.php` → `action=register`)، إن أُرسل `referral_code` صالح لعميل نشط، يُحفَظ `referred_by_id` + يُنشأ صف في جدول `referrals` (`referrer_id`, `referred_id`, `rewarded=0`).
2. عند اكتمال **أول** حجز للعميل الجديد المُحال (نفس لحظة منح نقاط الولاء أعلاه)، تُستدعى `maybeRewardReferral()`:
   - **50 نقطة** للعميل الذي أحال (`referrer_id`).
   - **25 نقطة** للعميل الجديد نفسه (`referred_id`) كمكافأة انضمام.
   - يُعلَّم الصف في `referrals` بـ `rewarded=1` (مرة واحدة فقط لكل إحالة).
3. كود الإحالة الخاص بكل عميل يُولَّد كسول (lazy) عند أول زيارة لـ `GET api/referral.php` إن لم يكن موجوداً بالفعل، عبر `generateUniqueReferralCode()`.

## استبدال النقاط بكوبونات (`api/loyalty.php`)

مستويات المكافآت ثابتة في الكود (`REWARDS` constant):

| النقاط المطلوبة | المكافأة |
|-----------------|----------|
| 25 | خصم 5% |
| 50 | خصم 10% |
| 100 | خصم 20% |
| 200 | خصم 100 جنيه ثابت |

- عند الاستبدال: يُنشأ كوبون جديد فريد الكود (`REWARD-XXXXXXXX`) صالح لاستخدام واحد فقط، صلاحيته 30 يوماً، ويُخصَم عدد النقاط من الرصيد (صف بقيمة سالبة في `loyalty_points`, `source='redemption'`).
- العملية داخل transaction واحدة (إنشاء الكوبون + خصم النقاط معاً أو الفشل معاً).

## قاعدة البيانات

```sql
CREATE TABLE loyalty_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  points INTEGER NOT NULL,       -- موجب = مكتسب، سالب = مستبدَل
  source TEXT NOT NULL,          -- 'booking' | 'referral' | 'redemption'
  booking_id INTEGER,            -- NULL لنقاط الإحالة/الاستبدال
  note TEXT,
  created_at TEXT
);

CREATE TABLE referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id INTEGER NOT NULL,
  referred_id INTEGER NOT NULL,
  rewarded INTEGER DEFAULT 0,
  created_at TEXT
);
```

الرصيد الحالي لأي عميل = `SUM(points) WHERE customer_id = ?` (لا عمود رصيد منفصل — يُحسَب دائماً من السجل الكامل).

## ملاحظات

- لا يوجد حد أقصى لعدد مرات الاستبدال أو انتهاء صلاحية للنقاط المكتسبة نفسها (فقط الكوبون الناتج له صلاحية 30 يوماً).
- مكافأة الإحالة تُمنح مرة واحدة فقط لكل زوج (محيل/مُحال)، مربوطة باكتمال أول حجز للمُحال تحديداً — إن أُلغي ذلك الحجز قبل اكتماله فلن تُمنح المكافأة أبداً لهذا الزوج (لا آلية لإعادة المحاولة على حجز لاحق).

---

**آخر تحديث:** 2026
