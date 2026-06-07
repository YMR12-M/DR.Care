# 🔐 نظام إدارة الدخول في DR.Care

## نظرة عامة

نظام الإدارة الحالي يوفر:

- تسجيل دخول آمن للمسؤولين
- إدارة جلسات PHP بالفحص قبل الوصول إلى API الإدارة
- إنشاء حساب مسؤول افتراضي عند التشغيل الأول
- لوحة إدارة الطلبات عبر `admin.html`

## الملفات الأساسية

- `login.html` — صفحة تسجيل الدخول للمسؤول
- `admin.html` — لوحة إدارة الطلبات والإحصائيات
- `api/admin-login.php` — تسجيل الدخول، فحص الجلسة، تسجيل الخروج
- `api/admin-init.php` — تهيئة الحساب الإداري الافتراضي وإرجاع قائمة المسؤولين
- `api/bootstrap.php` — بدء الجلسة وتهيئة جدول `admin_users`

## الحساب الإداري الافتراضي

يمكن إنشاء الحساب الإداري الافتراضي تلقائياً عبر طلب `api/admin-init.php` عندما لا يوجد أي مسؤول في قاعدة البيانات.

- اسم المستخدم: `admin`
- كلمة المرور: `admin@2026`
- البريد الإلكتروني الافتراضي من `DRCARE_NOTIFICATION_EMAIL`

> يجب تغيير كلمة المرور بعد التشغيل الأول لتحسين الأمان.

## واجهات API

### POST /api/admin-login.php

Request body:

```json
{
  "username": "admin",
  "password": "admin@2026"
}
```

### GET /api/admin-login.php?action=check

- يعيد حالة الجلسة الحالية
- يستخدم من `admin.html` للتأكد أن المسؤول مسجل دخول

### GET /api/admin-login.php?action=logout

- ينهي الجلسة ويعيد التوجيه إلى `login.html`

### GET /api/admin-init.php

- ينشئ الحساب الإداري الافتراضي إذا لم يكن موجوداً
- يعيد قائمة المسؤولين الحالية

## قاعدة البيانات

### جدول `admin_users`

```sql
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT,
  last_login TEXT,
  is_active INTEGER DEFAULT 1
);
```

## التعديلات الرئيسية

- `admin.html` يعتمد جلسة المسؤول لعرض الطلبات والإحصائيات
- `admin.js` يتحقق من الجلسة عند التحميل ويعرض اسم المسؤول
- `api/bootstrap.php` ينشئ جدول `admin_users` ويدعم بدء جلسة المسؤول
- `.env.example` يحدد بيانات الحساب الافتراضي ومتغيرات البريد

## تدفق تسجيل الدخول

1. يزور المسؤول `login.html`
2. يرسل اسم المستخدم وكلمة المرور إلى `api/admin-login.php`
3. تتحقق الـ API من بيانات الاعتماد وتخزن `admin_id` في الجلسة
4. يعاد توجيه المستخدم إلى `admin.html`
5. كل طلب إدارة يتحقق من وجود الجلسة

## الأمان

- كلمات المرور مخزنة باستخدام `password_hash(..., PASSWORD_BCRYPT)`
- `PDO` و `prepared statements` يمنعان حقن SQL
- تستخدم الجلسات لتأمين الوصول إلى واجهات الإدارة
- يوصى بتشغيل HTTPS في الإنتاج

## ملاحظات

- لا توجد حالياً واجهة تسجيل مسؤول جديد من الواجهة الأمامية
- `api/admin-init.php` مناسب للتهيئة الأولية للحساب الإداري
- يمكن إضافة `admin_id` لربط كل حجز بمسؤول لاحقاً

