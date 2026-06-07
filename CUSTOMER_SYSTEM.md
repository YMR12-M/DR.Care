## 👥 نظام العملاء في DR.Care

## نظرة عامة

يتضمن النظام الحالي للعملاء ما يلي:

- تسجيل حساب جديد بالاسم، البريد، الهاتف، وكلمة المرور
- تسجيل دخول آمن باستخدام البريد وكلمة المرور
- إدارة جلسات PHP لكل عميل
- صفحة عرض الحجوزات الخاصة بالعميل
- صفحة إدارة الملف الشخصي وتغيير كلمة المرور
- ربط الحجوزات بالبريد الإلكتروني مع دعم `customer_id` اختياري

## الملفات الأساسية

- `customer-login.html` — واجهة تسجيل الدخول وإنشاء حساب العميل
- `customer-bookings.html` — عرض الحجوزات الشخصية للعميل
- `customer-profile.html` — شاشة الملف الشخصي وإدارة الحساب
- `api/customer-login.php` — تسجيل/دخول العميل، فحص الجلسة، خروج
- `api/customer-bookings.php` — جلب الحجوزات الخاصة بالعميل
- `api/customer-profile.php` — عرض وتحديث بيانات العميل
- `api/bootstrap.php` — تهيئة جداول `customer_users` و `bookings` وبدء الجلسات

## واجهات API

### POST /api/customer-login.php

#### تسجيل حساب جديد

Request body:

```json
{
  "action": "register",
  "name": "أحمد محمد",
  "email": "ahmed@email.com",
  "phone": "01012345678",
  "password": "password123"
}
```

#### تسجيل دخول

Request body:

```json
{
  "action": "login",
  "email": "ahmed@email.com",
  "password": "password123"
}
```

### GET /api/customer-login.php?action=check

- يعيد حالة الجلسة الحالية
- يستخدم من واجهة العميل للتحقق من تسجيل الدخول

### GET /api/customer-login.php?action=logout

- تخرج العميل وتحذف بيانات الجلسة
- تعيد التوجيه إلى `customer-login.html`

### GET /api/customer-bookings.php

- يتطلب جلسة عميل صالحة
- يعيد الحجوزات المرتبطة ببريد العميل

### GET /api/customer-profile.php

- يعيد معلومات العميل الشخصية مع عدد الحجوزات
- يستخدم `customer_id` من الجلسة

### PATCH /api/customer-profile.php

يدعم نوعين من التحديثات:

1. تحديث الاسم والموبايل
2. تغيير كلمة المرور بالمقارنة مع كلمة المرور الحالية

## قاعدة البيانات

### جدول `customer_users`

```sql
CREATE TABLE customer_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT,
  last_login TEXT,
  is_active INTEGER DEFAULT 1
);
```

### جدول `bookings`

- يحتوي على عمود `email` لربط الحجوزات بالعميل
- يضيف `customer_id` تلقائياً إذا كان مفقوداً

```sql
ALTER TABLE bookings ADD COLUMN customer_id INTEGER;
```

## المتغيرات والتعديلات

### التعديلات على المشروع

- `index.html` يمكن أن يوجه المستخدم إلى `customer-login.html`
- `customer-bookings.html` يعرض حالة الحجوزات ويحتاج جلسة صالحة
- `customer-profile.html` يعرض بيانات العميل ويحسن تجربة الحساب
- `api/bootstrap.php` يقوم بإنشاء جداول `customer_users` و `admin_users` ويدعم `customer_id`

## تدفق العميل

1. يزور العميل `customer-login.html`
2. ينشئ حساباً جديداً أو يسجل دخولاً
3. يتم حفظ الجلسة في `$_SESSION`
4. يعاد توجيه العميل إلى `customer-bookings.html`
5. ويمكنه فتح `customer-profile.html` لتحديث بياناته

## قواعد التحقق

- الاسم: 2-80 حرف عربي أو إنجليزي
- البريد: يجب أن يكون عنواناً صالحاً
- الهاتف: يجب أن يتطابق مع الصيغة المصرية `01[0125]XXXXXXXX`
- كلمة المرور: 6 أحرف على الأقل

## الأمان

- كلمات المرور مخزنة باستخدام `password_hash(..., PASSWORD_BCRYPT)`
- جميع استعلامات DB تستخدم `PDO` و `prepared statements`
- جلسات PHP تحمي بيانات العميل بين الطلبات
- فشل التحقق يُظهر رسائل عامة بدون تسريب معلومات حساسة

## ملاحظات

- ربط الحجوزات يعتمد على البريد الإلكتروني للعميل.
- الجدول `bookings` يدعم `customer_id` كتحسين لاحق.
- يمكن إضافة تأكيد البريد أو استعادة كلمة المرور لاحقاً.
- تحقق من سجلات الأخطاء: `error_log`
- تحقق من قاعدة البيانات: `/data/drcare.db`
- اختبر الاتصال: استخدم Postman لاختبار API

---

**آخر تحديث:** 2026 | **الإصدار:** v2.2
