<?php
/**
 * DR.Care — Claim Booking
 * Allows a customer to link a POS walk-in booking to their account.
 *
 * GET  ?token=xxx  → return booking summary (no sensitive info)
 * POST { token }   → link booking to logged-in customer (phone must match)
 */
require_once __DIR__ . '/bootstrap.php';
startSession();

$method = $_SERVER['REQUEST_METHOD'];

/* ─────────────────────────────────
   GET: fetch booking preview
───────────────────────────────── */
if ($method === 'GET') {
  $token = trim($_GET['token'] ?? '');
  if (strlen($token) !== 32) {
    jsonResponse(['ok' => false, 'message' => 'رمز غير صالح'], 400);
  }

  $stmt = $pdo->prepare("
    SELECT id, package_name, car_type_name, branch, status, created_at, phone, customer_id
    FROM bookings WHERE claim_token = ? LIMIT 1
  ");
  $stmt->execute([$token]);
  $b = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$b) {
    jsonResponse(['ok' => false, 'message' => 'الرمز غير صالح أو منتهي الصلاحية'], 404);
  }

  // Mask phone: 0100*****34
  $phone  = $b['phone'] ?? '';
  $masked = strlen($phone) > 5
    ? substr($phone, 0, 3) . str_repeat('*', strlen($phone) - 5) . substr($phone, -2)
    : '***';

  $alreadyClaimed = !empty($b['customer_id']);
  $claimedByMe    = false;

  if ($alreadyClaimed && isset($_SESSION['customer_id'])) {
    $claimedByMe = (int)$b['customer_id'] === (int)$_SESSION['customer_id'];
  }

  // Is viewer logged in?
  $loggedIn = isset($_SESSION['customer_id']);

  jsonResponse([
    'ok'      => true,
    'booking' => [
      'id'           => $b['id'],
      'package_name' => $b['package_name'],
      'car_type_name'=> $b['car_type_name'],
      'branch'       => $b['branch'],
      'status'       => $b['status'],
      'created_at'   => $b['created_at'],
      'masked_phone' => $masked,
    ],
    'already_claimed' => $alreadyClaimed,
    'claimed_by_me'   => $claimedByMe,
    'logged_in'       => $loggedIn,
  ]);
}

/* ─────────────────────────────────
   POST: claim the booking
───────────────────────────────── */
if ($method === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  $token = trim($input['token'] ?? '');

  if (strlen($token) !== 32) {
    jsonResponse(['ok' => false, 'message' => 'رمز غير صالح'], 400);
  }

  requireCustomerSession();
  $customerId = (int)$_SESSION['customer_id'];

  $stmt = $pdo->prepare("SELECT id, phone, customer_id FROM bookings WHERE claim_token = ? LIMIT 1");
  $stmt->execute([$token]);
  $b = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$b) {
    jsonResponse(['ok' => false, 'message' => 'الرمز غير صالح'], 404);
  }

  // Already claimed by this customer
  if ((int)$b['customer_id'] === $customerId) {
    jsonResponse(['ok' => true, 'message' => 'الحجز مربوط بحسابك بالفعل']);
  }

  // Claimed by someone else
  if (!empty($b['customer_id'])) {
    jsonResponse(['ok' => false, 'message' => 'هذا الحجز مربوط بحساب آخر'], 403);
  }

  // Verify phone matches
  $custStmt = $pdo->prepare('SELECT phone FROM customer_users WHERE id = ? LIMIT 1');
  $custStmt->execute([$customerId]);
  $cust = $custStmt->fetch(PDO::FETCH_ASSOC);

  if (!$cust || $cust['phone'] !== ($b['phone'] ?? '')) {
    jsonResponse([
      'ok'      => false,
      'message' => 'رقم موبايل حسابك لا يتطابق مع رقم هذا الحجز. تأكد أنك مسجّل بنفس الرقم المستخدم عند الحجز.',
    ], 403);
  }

  // Link booking to customer
  $pdo->prepare('UPDATE bookings SET customer_id = ? WHERE id = ?')
      ->execute([$customerId, (int)$b['id']]);

  jsonResponse(['ok' => true, 'message' => 'تم ربط الحجز بحسابك بنجاح! ✓']);
}

jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
