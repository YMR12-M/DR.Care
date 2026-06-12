<?php
require_once __DIR__ . '/bootstrap.php';
startSession();
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
}

$input   = json_decode(file_get_contents('php://input'), true) ?? [];
$phones  = $input['phones']  ?? [];
$message = trim($input['message'] ?? '');

if (!$message) {
  jsonResponse(['ok' => false, 'message' => 'الرسالة مطلوبة'], 400);
}

if (!is_array($phones) || empty($phones)) {
  jsonResponse(['ok' => false, 'message' => 'لا توجد أرقام'], 400);
}

$phones = array_values(array_unique(
  array_filter(array_map('trim', $phones), fn($p) => preg_match('/^01[0125][0-9]{8}$/', $p))
));

if (empty($phones)) {
  jsonResponse(['ok' => false, 'message' => 'لا توجد أرقام مصرية صالحة'], 400);
}

if (!getEnvValue('WHATSAPP_API_TOKEN')) {
  jsonResponse(['ok' => false, 'message' => 'WHATSAPP_API_TOKEN غير مُفعّل في .env', 'no_token' => true], 200);
}

$sent = $failed = 0;
foreach ($phones as $phone) {
  sendWhatsApp($phone, $message) ? $sent++ : $failed++;
}

logAudit($pdo, 'admin', $_SESSION['admin_id'] ?? null, 'whatsapp.broadcast', 'broadcast', null, [
  'sent' => $sent, 'failed' => $failed, 'total' => count($phones),
]);

jsonResponse(['ok' => true, 'sent' => $sent, 'failed' => $failed]);
