# Roadmap — DR.Care

خطة عمل مرتبة بالأولوية، مبنية على فجوات فعلية اكتُشفت أثناء بناء نظام Workflow الحجز (`BOOKING_WORKFLOW.md`). كل بند مرتبط بملفات محددة في الكود الحالي وليس اقتراحاً عاماً.

## 1. شاشات ناقصة كاملة في `mobile-app/` (React)

روابط موجودة فعلياً في الكود تشير لمسارات غير معرَّفة في `mobile-app/src/App.jsx`:
- `/register` — يُشار إليه من `LoginScreen.jsx`
- `/forgot-password` — يُشار إليه من `LoginScreen.jsx`
- `/edit-profile`, `/coupons` — يُشار إليهما من `ProfileScreen.jsx`

هذه شاشات كاملة (فورم + استدعاء API) وليست إصلاح عقد بسيط، لذا تُركت خارج نطاق إصلاح الـ workflow الحالي. النسخة القديمة (`register.html`/`forgot-password.html` المكافئة على الديسكتوب) موجودة بالفعل وتستخدم نفس الـ API — يمكن الاستعانة بمنطقها عند البناء.

## 2. نفس علة "عرض كل الحالات دايماً" في واجهة POS

`admin.js` تم إصلاحه ليعرض فقط الانتقالات الصالحة (`STATUS_TRANSITIONS`). نفس النمط (`<select>` يعرض كل الحالات دايماً) موجود في `CarWash-POS/script.js` ولم يُعالَج بعد — نفس الجذر، واجهة منفصلة.

## 3. بوابة دفع إلكتروني حقيقية

حالياً الدفع بـ Instapay يعتمد على رفع صورة إيصال (base64) يراجعها الأدمن يدوياً (`payment_screenshot` في `api/bookings.php`). لا يوجد تكامل مع أي بوابة دفع فعلية (Paymob، Fawry، إلخ).

## 4. `api/pricing.php` و`java/PricingCalculator.java` غير متزامنين إطلاقاً (وربما غير مستخدَمين)

تفاصيل كاملة في `PRICING_SYSTEM.md`. باختصار: أكواد الباقات في الـ Java (`quick/full/detail/fleet`) لا تطابق أكواد `config.php` الفعلية (`inside-out/outside/deep/...`) إطلاقاً، و`getOrDefault` في الـ Java يُرجع دائماً `280` كقيمة افتراضية بدل رمي خطأ — فيبدو أن السعر "نجح" بينما هو خاطئ، ويمنع الـ PHP fallback الصحيح من العمل. لحسن الحظ `pricing.php` غير مستدعى من أي واجهة أمامية حالياً (تدفق الحجز الفعلي يقرأ من `config.php` مباشرة)، لكنه فخ لأي استخدام مستقبلي. **القرار المطلوب:** إما حذف الـ endpoint والـ Java calculator طالما غير مستخدَمين، أو توحيد مصدر الأسعار بينهما.

## 5. `api/push-send.php` يرسل للجميع بدل التجاهل عند غياب `customer_id`

تفاصيل كاملة في `NOTIFICATIONS_SYSTEM.md`. باختصار: `admin.js` يرسل `customer_id: null` (JSON) لحجوزات الضيوف عند تحديث الحالة، و`isset()` في PHP تُرجع `false` على قيمة `null`، فيتحول ذلك تلقائياً لـ "أرسل لكل المشتركين" بدل تجاهل الإرسال. **هذا يحدث فعلياً في كل مرة يُحدَّث فيها حجز ضيف من لوحة الأدمن، وليس فقط نظرياً.**

## 6. ~~تحديث `FEATURES.md` §9.2~~ ✅ تم

كان الجدول يذكر أكواد باقات قديمة (`quick`, `full`, `detail`, `fleet`) غير موجودة في `api/config.php` الفعلي. اتحدّث ليطابق الأكواد الحقيقية (`inside-out`, `outside`, `deep`, `cover`, `rims`, `engine`, `chemical`, `carpet`, `blanket`).

## 7. توحيد `BookingStateMachine` من واجهة POS نفسها

`api/BookingStateMachine.php` أصبح الآن مصدر الحقيقة الوحيد لحالات الحجز، مستخدَم من `bookings.php`, `pos.php`, `customer-bookings.php`. لاتساق كامل عبر كل الواجهات مستقبلاً، يمكن لاحقاً جعل واجهة `CarWash-POS/script.js` نفسها تستعلم عن الانتقالات المسموحة من الـ API (بدل تكرار القائمة في JS) قبل إظهار الأزرار.
