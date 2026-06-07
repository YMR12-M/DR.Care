<?php
require_once __DIR__ . '/bootstrap.php';
startSession();

$method = $_SERVER['REQUEST_METHOD'];
$input  = json_decode(file_get_contents('php://input'), true) ?? [];

/* ── POST: save subscription ── */
if ($method === 'POST') {
  requireCustomerSession();

  $endpoint = trim($input['endpoint'] ?? '');
  $p256dh   = trim($input['keys']['p256dh'] ?? '');
  $auth     = trim($input['keys']['auth']   ?? '');

  if (!$endpoint || !$p256dh || !$auth) {
    jsonResponse(['ok' => false, 'message' => 'بيانات الاشتراك غير مكتملة'], 400);
  }

  $customerId = $_SESSION['customer_id'] ?? null;

  $stmt = $pdo->prepare('
    INSERT INTO push_subscriptions (customer_id, endpoint, p256dh, auth, created_at)
    VALUES (:cid, :ep, :p256, :auth, :now)
    ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth, customer_id=excluded.customer_id
  ');
  $stmt->execute([
    ':cid'  => $customerId,
    ':ep'   => $endpoint,
    ':p256' => $p256dh,
    ':auth' => $auth,
    ':now'  => date('c'),
  ]);

  jsonResponse(['ok' => true, 'message' => 'تم تفعيل الإشعارات']);
}

/* ── DELETE: remove subscription ── */
if ($method === 'DELETE') {
  $endpoint = trim($input['endpoint'] ?? '');
  if ($endpoint) {
    $pdo->prepare('DELETE FROM push_subscriptions WHERE endpoint = :ep')
        ->execute([':ep' => $endpoint]);
  }
  jsonResponse(['ok' => true]);
}

jsonResponse(['ok' => false, 'message' => 'Method not allowed'], 405);
