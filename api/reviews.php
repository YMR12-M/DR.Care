<?php
require_once __DIR__ . '/bootstrap.php';
startSession();

$method = $_SERVER['REQUEST_METHOD'];

/* ── GET: fetch reviews ── */
if ($method === 'GET') {
  $bookingId = $_GET['booking_id'] ?? null;

  if ($bookingId) {
    $stmt = $pdo->prepare('SELECT * FROM reviews WHERE booking_id = :id LIMIT 1');
    $stmt->execute([':id' => (int)$bookingId]);
    $review = $stmt->fetch(PDO::FETCH_ASSOC);
    jsonResponse(['ok' => true, 'review' => $review ?: null]);
  }

  /* Admin view — all reviews with full details */
  if (isset($_GET['admin'])) {
    requireAdmin();
    $stmt = $pdo->query('
      SELECT r.id, r.booking_id, r.rating, r.comment, r.created_at,
             r.admin_reply, r.admin_replied_at,
             b.name AS customer_name, b.package_name, b.car_type_name, b.branch
      FROM reviews r
      JOIN bookings b ON b.id = r.booking_id
      ORDER BY r.created_at DESC
    ');
    jsonResponse(['ok' => true, 'reviews' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
  }

  /* Public display — rating + comment only, no customer name */
  $stmt = $pdo->query('
    SELECT r.rating, r.comment, r.admin_reply, r.created_at,
           b.package_name, b.car_type_name
    FROM reviews r
    JOIN bookings b ON b.id = r.booking_id
    ORDER BY r.created_at DESC
    LIMIT 20
  ');
  jsonResponse(['ok' => true, 'reviews' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

/* ── PATCH: admin reply ── */
if ($method === 'PATCH') {
  requireAdmin();
  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  $id    = (int)($input['id']    ?? 0);
  $reply = trim($input['reply']  ?? '');

  if (!$id) jsonResponse(['ok' => false, 'message' => 'معرّف التقييم مطلوب'], 400);
  if (mb_strlen($reply) > 500) jsonResponse(['ok' => false, 'message' => 'الرد طويل جداً (500 حرف كحد أقصى)'], 400);

  $pdo->prepare('UPDATE reviews SET admin_reply = :reply, admin_replied_at = :now WHERE id = :id')
      ->execute([':reply' => $reply ?: null, ':now' => $reply ? date('c') : null, ':id' => $id]);

  jsonResponse(['ok' => true, 'message' => $reply ? 'تم حفظ الرد' : 'تم حذف الرد']);
}

/* ── POST: submit review ── */
if ($method === 'POST') {
  requireCustomerSession();
  validateCsrfToken();

  $input     = json_decode(file_get_contents('php://input'), true) ?? [];
  $bookingId = (int)($input['booking_id'] ?? 0);
  $rating    = (int)($input['rating']     ?? 0);
  $comment   = trim($input['comment']     ?? '');

  if (!$bookingId) jsonResponse(['ok' => false, 'message' => 'رقم الحجز مطلوب'], 400);
  if ($rating < 1 || $rating > 5) jsonResponse(['ok' => false, 'message' => 'التقييم يجب أن يكون بين 1 و 5'], 400);
  if ($comment && mb_strlen($comment) > 500) jsonResponse(['ok' => false, 'message' => 'التعليق طويل جداً (500 حرف كحد أقصى)'], 400);

  $customerId = $_SESSION['customer_id'];

  /* Verify booking belongs to customer and is completed */
  $stmt = $pdo->prepare('SELECT id, status FROM bookings WHERE id = :id AND customer_id = :cid LIMIT 1');
  $stmt->execute([':id' => $bookingId, ':cid' => $customerId]);
  $booking = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$booking) jsonResponse(['ok' => false, 'message' => 'الحجز غير موجود أو لا ينتمي لحسابك'], 404);
  if ($booking['status'] !== 'completed') jsonResponse(['ok' => false, 'message' => 'يمكن التقييم فقط بعد اكتمال الخدمة'], 400);

  /* Check not already reviewed */
  $exists = $pdo->prepare('SELECT id FROM reviews WHERE booking_id = :id LIMIT 1');
  $exists->execute([':id' => $bookingId]);
  if ($exists->fetch()) jsonResponse(['ok' => false, 'message' => 'تم تقييم هذا الحجز مسبقاً'], 409);

  $stmt = $pdo->prepare('
    INSERT INTO reviews (booking_id, customer_id, rating, comment, created_at)
    VALUES (:bid, :cid, :rating, :comment, :now)
  ');
  $stmt->execute([
    ':bid'     => $bookingId,
    ':cid'     => $customerId,
    ':rating'  => $rating,
    ':comment' => $comment ?: null,
    ':now'     => date('c'),
  ]);

  jsonResponse(['ok' => true, 'message' => 'شكراً على تقييمك! ⭐']);
}

jsonResponse(['ok' => false, 'message' => 'Method not allowed'], 405);
