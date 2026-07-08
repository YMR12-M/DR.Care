## 🧪 الاختبارات والتكامل المستمر (CI) في DR.Care

## نظرة عامة

المشروع فيه 4 طبقات اختبار منفصلة، لكل لغة/جزء طبقتها الخاصة — **لا يوجد أي اختبار لـ `mobile-app/` (React)** رغم أنه الجزء الأحدث والأكثر عرضة للأخطاء حالياً (راجع `MOBILE_APP.md`).

| الطبقة | الأداة | المكان |
|--------|--------|--------|
| PHP Unit | PHPUnit | `tests/Unit/` |
| PHP Integration | PHPUnit + خادم PHP حقيقي | `tests/Integration/` |
| Java Pricing | shell script | `tests/test_pricing_java.sh` |
| Python CLI | `unittest` | `tests/test_export_bookings.py` |
| `mobile-app/` (React) | **لا يوجد** | — |

## تشغيل الاختبارات

```bash
composer test              # PHPUnit فقط (Unit + Integration)
bash scripts/run-tests.sh  # كل طبقات الاختبار (نفس ما يشغّله CI بالضبط)
```

`scripts/run-tests.sh` بالترتيب: PHP lint (`php -l` لكل ملف في `api/`) → `composer install` عند الحاجة → PHPUnit → اختبارات Java (تُتخطى محلياً لو Java غير مثبت) → اختبارات Python → `npm run lint` (ESLint على الموقع الرئيسي في الجذر — **ليس** `mobile-app/`، الذي له `oxlint` منفصل تماماً وغير مربوط بهذا السكريبت).

## PHP — `tests/Unit/` و`tests/Integration/`

- **`tests/Unit/BookingStateMachineTest.php`**: يختبر `api/BookingStateMachine.php` مباشرة بدون شبكة أو قاعدة بيانات — كل حواف الانتقال المسموحة/الممنوعة لكل نوع مستخدم. سريع جداً (~10ms).
- **`tests/Integration/*.php`**: تشغّل خادم PHP حقيقي (`php -S`) عبر `tests/Support/TestServer.php` (singleton واحد لكل تشغيلة PHPUnit كاملة، على منفذ مُشتق من `getmypid()`)، وتضرب الـ API فعلياً بـ `curl` عبر `tests/Support/HttpClient.php`. قاعدة بيانات SQLite مؤقتة منفصلة تُنشأ وتُحذف تلقائياً لكل تشغيلة (`sys_get_temp_dir()/drcare-test-<pid>.db`).
- **`tests/Support/ApiTestCase.php`**: القاعدة المشتركة لكل اختبارات Integration — توفر `registerCustomer()`, `loginAdmin()`, `createBooking()`, `csrfToken()` جاهزة.
- متغيرات بيئة الاختبار (مضبوطة تلقائياً في `TestServer::startProcess()`): `DRCARE_SKIP_ENV_FILE=1` (لا يُحمَّل `.env` الحقيقي، فـ WhatsApp/Push دائماً no-op بأمان)، `DRCARE_DISABLE_RATE_LIMIT=1`، `POS_TOKEN=test-pos-token-ci` ثابت.
- ملفات الاختبار الحالية: `AdminAndCouponsTest`, `BookingFlowTest`, `CustomerAuthTest`, `HealthAndConfigTest`, `PosApiTest`, `ReviewsTest` — تغطي كل تدفقات الـ backend الرئيسية بما فيها انتقالات `BookingStateMachine` (راجع `BOOKING_WORKFLOW.md`).

### ⚠️ فخ عملي: فتح اتصال PDO خام مباشر أثناء اختبار Integration قد يُعلّق العملية

خادم PHP المدمج (`php -S`) في وضع الاختبار **أحادي الخيط** (يخدم طلباً واحداً في كل مرة). لو اختبار فتح اتصال `PDO` منفصل مباشرة على نفس ملف SQLite أثناء إجراء عملية `UPDATE`/`INSERT` من خلال طلب HTTP قيد التنفيذ، قد يحدث قفل (lock) طويل بلا مهلة واضحة. **الحل الأسلم**: مرّر كل التعديلات عبر طلبات HTTP فعلية لنفس الخادم (زي ما تعمل `ApiTestCase` بالفعل) بدل فتح PDO مباشر من كود الاختبار نفسه، حتى لو بدا أبسط.

## Java — `tests/test_pricing_java.sh`

⚠️ **يختبر منطقاً منفصلاً تماماً عن التسعير الفعلي للموقع.** الاختبار يستخدم أكواد باقات قديمة (`quick`, `full`, `detail`, `fleet`) لا وجود لها في `api/config.php` الحالي (الأكواد الحقيقية: `inside-out`, `outside`, `deep`, ...). ينجح الاختبار دائماً بينما لا علاقة له بالأسعار المعروضة فعلياً للعملاء. التفاصيل الكاملة والقرار المطلوب (حذف أم توحيد) في `PRICING_SYSTEM.md`.

## Python — `tests/test_export_bookings.py`

يختبر `export_bookings.py` (تصدير CSV). يعمل عبر `python3 -m unittest discover -s tests -p 'test_*.py'`.

## CI — `.github/workflows/ci.yml`

يعمل على كل push/PR إلى `main`/`master`. يهيّئ PHP 8.1 + Java 17 + Python 3.11 + Node 18، ثم يشغّل `scripts/run-tests.sh` بالكامل (نفس الأمر المحلي بالضبط — لا تكرار منطق منفصل بين محلي وCI).

### ⚠️ فجوة حقيقية: `mobile-app/` غير مُشمَّل في CI إطلاقاً

لا خطوة في `ci.yml` ولا في `scripts/run-tests.sh` تعمل `cd mobile-app && npm install/build/lint`. هذا يعني:
- الأخطاء الموثّقة بالتفصيل في `MOBILE_APP.md` (الفرع المُثبَّت، الكوبون، تعطل شاشة المواعيد) **لم يكن ممكناً اكتشافها آلياً** — لا build يفشل، لا lint يُنبّه، لا اختبار يُشغَّل.
- حتى `npm run lint` (oxlint) الخاص بـ `mobile-app/` نفسه لا يُشغَّل في أي مكان آلياً حالياً.

هذه أعلى أولوية في `ROADMAP.md` من ناحية البنية التحتية للاختبار: بدون CI لـ `mobile-app/`، أي إصلاح مستقبلي لأخطاء `MOBILE_APP.md` قد ينكسر بصمت مرة أخرى دون تنبيه.

---

**آخر تحديث:** 2026
