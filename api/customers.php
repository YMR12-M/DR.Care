<?php
require_once __DIR__ . '/bootstrap.php';

startSession();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
}

requireAdmin();

$stmt = $pdo->query("
  SELECT
    cu.id,
    cu.name,
    cu.email,
    cu.phone,
    cu.created_at,
    COUNT(b.id)                                          AS booking_count,
    COALESCE(SUM(CASE WHEN b.status != 'cancelled' THEN b.total_price ELSE 0 END), 0) AS total_spent,
    MAX(b.created_at)                                    AS last_booking_at
  FROM customer_users cu
  LEFT JOIN bookings b ON (b.customer_id = cu.id OR b.email = cu.email)
  GROUP BY cu.id
  ORDER BY booking_count DESC, cu.created_at DESC
");

$customers = $stmt->fetchAll(PDO::FETCH_ASSOC);

jsonResponse(['ok' => true, 'customers' => $customers]);
