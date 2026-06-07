<?php
require_once __DIR__ . '/bootstrap.php';

startSession();
requireCustomerSession();

$method = $_SERVER['REQUEST_METHOD'];
$customerId = (int)$_SESSION['customer_id'];

if ($method === 'GET') {
  // Ensure customer has a referral code
  $stmt = $pdo->prepare('SELECT referral_code FROM customer_users WHERE id = :id LIMIT 1');
  $stmt->execute([':id' => $customerId]);
  $row  = $stmt->fetch(PDO::FETCH_ASSOC);
  $code = $row['referral_code'] ?? null;

  if (!$code) {
    $code = generateUniqueReferralCode($pdo);
    $pdo->prepare('UPDATE customer_users SET referral_code = :c WHERE id = :id')
        ->execute([':c' => $code, ':id' => $customerId]);
  }

  // How many did I refer + points earned from referrals
  $countStmt = $pdo->prepare('SELECT COUNT(*) FROM referrals WHERE referrer_id = :rid');
  $countStmt->execute([':rid' => $customerId]);
  $referredCount = (int)$countStmt->fetchColumn();

  $ptsStmt = $pdo->prepare("SELECT COALESCE(SUM(points),0) FROM loyalty_points WHERE customer_id = :cid AND source = 'referral'");
  $ptsStmt->execute([':cid' => $customerId]);
  $pointsEarned = (int)$ptsStmt->fetchColumn();

  jsonResponse([
    'ok'            => true,
    'referral_code' => $code,
    'referred_count'=> $referredCount,
    'points_earned' => $pointsEarned,
  ]);
}

jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
