<?php
/**
 * DR.Care — Loyalty & Rewards API
 *
 * GET  loyalty.php          → balance, history, available rewards
 * POST loyalty.php          → redeem points for coupon
 */
require_once __DIR__ . '/bootstrap.php';

startSession();
requireCustomerSession();

$method     = $_SERVER['REQUEST_METHOD'];
$customerId = (int)$_SESSION['customer_id'];

/* ── Reward tiers ── */
const REWARDS = [
  ['id' => 'r25',  'points' => 25,  'type' => 'percent', 'value' => 5,  'label' => 'خصم 5%',  'desc' => 'صالح على أي باقة'],
  ['id' => 'r50',  'points' => 50,  'type' => 'percent', 'value' => 10, 'label' => 'خصم 10%', 'desc' => 'صالح على أي باقة'],
  ['id' => 'r100', 'points' => 100, 'type' => 'percent', 'value' => 20, 'label' => 'خصم 20%', 'desc' => 'صالح على أي باقة'],
  ['id' => 'r200', 'points' => 200, 'type' => 'fixed',   'value' => 100,'label' => 'خصم 100 جنيه', 'desc' => 'خصم مبلغ ثابت على الحجز'],
];

/* ── Points balance ── */
function getBalance(PDO $pdo, int $customerId): int {
  $stmt = $pdo->prepare('SELECT COALESCE(SUM(points),0) FROM loyalty_points WHERE customer_id = :id');
  $stmt->execute([':id' => $customerId]);
  return (int)$stmt->fetchColumn();
}

/* ── GET: balance + history + rewards ── */
if ($method === 'GET') {
  $balance = getBalance($pdo, $customerId);

  /* History — last 20 entries */
  $stmt = $pdo->prepare("
    SELECT lp.points, lp.source, lp.note, lp.created_at,
           b.package_name
    FROM loyalty_points lp
    LEFT JOIN bookings b ON b.id = lp.booking_id
    WHERE lp.customer_id = :id
    ORDER BY lp.id DESC LIMIT 20
  ");
  $stmt->execute([':id' => $customerId]);
  $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

  /* Mark available rewards */
  $rewards = array_map(function($r) use ($balance) {
    return array_merge($r, ['available' => $balance >= $r['points']]);
  }, REWARDS);

  /* Next tier */
  $next = null;
  foreach (REWARDS as $r) {
    if ($balance < $r['points']) { $next = $r; break; }
  }

  jsonResponse([
    'ok'      => true,
    'balance' => $balance,
    'next'    => $next,
    'rewards' => $rewards,
    'history' => $history,
  ]);
}

/* ── POST: redeem ── */
if ($method === 'POST') {
  validateCsrfToken();
  checkRateLimit($pdo, 'loyalty_redeem', 5, 600);

  $input    = json_decode(file_get_contents('php://input'), true) ?? [];
  $rewardId = $input['reward_id'] ?? '';

  /* Find reward */
  $reward = null;
  foreach (REWARDS as $r) {
    if ($r['id'] === $rewardId) { $reward = $r; break; }
  }
  if (!$reward) jsonResponse(['ok' => false, 'message' => 'مكافأة غير موجودة'], 400);

  $balance = getBalance($pdo, $customerId);
  if ($balance < $reward['points']) {
    jsonResponse(['ok' => false, 'message' => "نقاطك غير كافية. رصيدك {$balance} نقطة، والمطلوب {$reward['points']}."], 422);
  }

  /* Generate unique coupon code */
  $code = 'REWARD-' . strtoupper(substr(md5($customerId . $rewardId . time()), 0, 8));

  /* Check code doesn't exist */
  $exists = $pdo->prepare('SELECT id FROM coupons WHERE code = :code');
  $exists->execute([':code' => $code]);
  if ($exists->fetch()) {
    $code .= rand(10, 99);
  }

  /* Expires in 30 days */
  $expires = date('Y-m-d H:i:s', strtotime('+30 days'));

  $pdo->beginTransaction();
  try {
    /* Insert coupon */
    $pdo->prepare("
      INSERT INTO coupons (code, discount_type, discount_value, min_order, max_uses, used_count, expires_at, is_active)
      VALUES (:code, :type, :value, 0, 1, 0, :expires, 1)
    ")->execute([
      ':code'    => $code,
      ':type'    => $reward['type'],
      ':value'   => $reward['value'],
      ':expires' => $expires,
    ]);

    /* Deduct points */
    $pdo->prepare("
      INSERT INTO loyalty_points (customer_id, points, source, note)
      VALUES (:id, :pts, 'redemption', :note)
    ")->execute([
      ':id'   => $customerId,
      ':pts'  => -$reward['points'],
      ':note' => "استرداد: {$reward['label']}",
    ]);

    $pdo->commit();
  } catch (Exception $e) {
    $pdo->rollBack();
    jsonResponse(['ok' => false, 'message' => 'حدث خطأ، حاول مرة أخرى'], 500);
  }

  $newBalance = getBalance($pdo, $customerId);

  jsonResponse([
    'ok'          => true,
    'message'     => "تم إنشاء كوبون الخصم بنجاح!",
    'coupon_code' => $code,
    'reward'      => $reward,
    'new_balance' => $newBalance,
    'expires_at'  => $expires,
  ]);
}

jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
