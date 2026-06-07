<?php
require_once __DIR__ . '/bootstrap.php';
startSession();
requireAdmin();

$to      = trim($_GET['to'] ?? getEnvValue('DRCARE_NOTIFICATION_EMAIL', ''));
$subject = 'DR.Care — اختبار إرسال البريد';
$body    = "مرحباً،\r\n\r\nهذا بريد اختبار من نظام DR.Care.\r\nإذا وصلك هذا البريد فالإعداد صحيح ✓\r\n\r\nالتاريخ: " . date('Y-m-d H:i:s');

if (!$to || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
  jsonResponse(['ok' => false, 'message' => 'أضف ?to=your@email.com في الرابط'], 400);
}

$smtpHost = getEnvValue('MAILER_SMTP_HOST', '');
if (!$smtpHost || str_contains($smtpHost, 'example.com')) {
  jsonResponse([
    'ok' => false,
    'message' => 'SMTP غير مُهيَّأ. افتح ملف .env وأضف بيانات SMTP الحقيقية.',
    'hint' => [
      'MAILER_SMTP_HOST'     => 'smtp.gmail.com',
      'MAILER_SMTP_PORT'     => '587',
      'MAILER_SMTP_SECURITY' => 'starttls',
      'MAILER_SMTP_USERNAME' => 'your-gmail@gmail.com',
      'MAILER_SMTP_PASSWORD' => 'your-app-password (من Google Account → App Passwords)',
      'DRCARE_EMAIL_FROM'    => 'your-gmail@gmail.com',
      'DRCARE_NOTIFICATION_EMAIL' => 'your-gmail@gmail.com',
    ]
  ], 503);
}

$sent = sendEmail($to, $subject, $body);

jsonResponse([
  'ok'      => $sent,
  'message' => $sent ? "تم إرسال بريد اختبار إلى $to ✓" : 'فشل إرسال البريد — تحقق من بيانات SMTP في .env',
  'smtp'    => [
    'host' => $smtpHost,
    'port' => getEnvValue('MAILER_SMTP_PORT', '587'),
    'user' => getEnvValue('MAILER_SMTP_USERNAME', '—'),
  ]
]);
