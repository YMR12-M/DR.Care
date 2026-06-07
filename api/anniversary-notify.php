<?php
/**
 * DR.Care — Anniversary Notifications (admin-triggered)
 * POST {} → sends push to customers whose registration anniversary is today
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/push-send.php';

startSession();
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
}

// Find customers whose anniversary is today (any year)
$today = date('m-d'); // e.g. "06-07"
$stmt  = $pdo->query("
  SELECT id, name, created_at
  FROM customer_users
  WHERE is_active = 1
    AND strftime('%m-%d', created_at) = '{$today}'
    AND created_at < date('now', '-11 months')
");
$customers = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!$customers) {
  jsonResponse(['ok' => true, 'sent' => 0, 'message' => 'لا توجد ذكريات اليوم.']);
}

$sent = 0;
foreach ($customers as $c) {
  $years = (int)date('Y') - (int)substr($c['created_at'], 0, 4);
  $label = $years === 1 ? 'سنة كاملة' : "{$years} سنوات";
  $title = "ذكرى انضمامك إلى DR.Care 🎉";
  $body  = "مرحباً {$c['name']}! مرّ {$label} منذ أول حجز معنا. شكراً لثقتك!";

  $sent += sendPushNotification($pdo, $title, $body, '/customer-bookings.html', (int)$c['id']);
}

jsonResponse(['ok' => true, 'sent' => $sent, 'checked' => count($customers)]);
