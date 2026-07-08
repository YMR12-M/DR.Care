<?php
require_once __DIR__ . '/bootstrap.php';

startSession();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  /* ── Public tracking: booking_id + phone ── */
  $trackId    = $_GET['track_id']    ?? null;
  $trackPhone = $_GET['track_phone'] ?? null;

  if ($trackId && $trackPhone) {
    checkRateLimit($pdo, 'booking_track', 10, 300); // 10 محاولات / 5 دقائق

    $stmt = $pdo->prepare('
      SELECT id, status, payment_status, package_name, car_type_name,
             branch, appointment, created_at, total_price, source
      FROM bookings WHERE id = :id AND phone = :phone LIMIT 1
    ');
    $stmt->execute([':id' => (int)$trackId, ':phone' => trim($trackPhone)]);
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$booking) jsonResponse(['ok' => false, 'message' => 'الحجز غير موجود أو رقم الموبايل غير مطابق'], 404);
    jsonResponse(['ok' => true, 'bookings' => [$booking]]);
  }

  /* ── Authenticated customer fetch ── */
  requireCustomerSession();

  $customerId    = $_SESSION['customer_id'];
  $customerEmail = $_SESSION['customer_email'];

  if ($customerId) {
    $stmt = $pdo->prepare('SELECT * FROM bookings WHERE customer_id = :customer_id ORDER BY id DESC');
    $stmt->execute([':customer_id' => $customerId]);
  } else {
    $stmt = $pdo->prepare('SELECT * FROM bookings WHERE email = :email ORDER BY id DESC');
    $stmt->execute([':email' => $customerEmail]);
  }
  $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

  jsonResponse(['ok' => true, 'bookings' => $bookings]);
}

if ($method === 'PATCH') {
  requireCustomerSession();
  validateCsrfToken();

  $input      = json_decode(file_get_contents('php://input'), true) ?? [];
  $id         = (int)($input['id'] ?? 0);
  $action     = $input['action'] ?? '';  // 'cancel' | 'reschedule'
  $customerId = $_SESSION['customer_id'] ?? null;
  $email      = $_SESSION['customer_email'] ?? null;

  if (!$id) jsonResponse(['ok' => false, 'message' => 'رقم الحجز مطلوب'], 400);

  /* Fetch booking and verify ownership */
  $stmt = $pdo->prepare('SELECT id, status, customer_id, email, appointment FROM bookings WHERE id = :id LIMIT 1');
  $stmt->execute([':id' => $id]);
  $booking = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$booking) jsonResponse(['ok' => false, 'message' => 'الحجز غير موجود'], 404);

  $owned = ($customerId && $booking['customer_id'] == $customerId)
        || ($email && $booking['email'] === $email);
  if (!$owned) jsonResponse(['ok' => false, 'message' => 'غير مصرح'], 403);

  $cancellable = BookingStateMachine::canTransition($booking['status'], 'cancelled', 'customer');

  /* ── Cancel ── */
  if ($action === 'cancel') {
    if (!$cancellable)
      jsonResponse(['ok' => false, 'message' => 'لا يمكن إلغاء هذا الحجز في حالته الحالية'], 422);

    $sets = ['status = :s'];
    $params = [':s' => 'cancelled', ':id' => $id];
    if (BookingStateMachine::clearsPaymentScreenshot('cancelled')) {
      $sets[] = 'payment_screenshot = NULL';
    }
    $pdo->prepare('UPDATE bookings SET ' . implode(', ', $sets) . ' WHERE id = :id')
        ->execute($params);
    logAudit($pdo, 'customer', $customerId, 'booking.cancelled', 'booking', $id, ['status' => ['from' => $booking['status'], 'to' => 'cancelled']]);
    jsonResponse(['ok' => true, 'message' => 'تم إلغاء الحجز بنجاح']);
  }

  /* ── Reschedule ── */
  if ($action === 'reschedule') {
    if (!$cancellable)
      jsonResponse(['ok' => false, 'message' => 'لا يمكن تعديل هذا الحجز في حالته الحالية'], 422);

    $newAppt = $input['appointment'] ?? '';
    $date    = $newAppt ? DateTime::createFromFormat('Y-m-d\TH:i', $newAppt) : null;
    $now     = new DateTime('now');

    if (!$date || $date < $now->modify('+15 minutes'))
      jsonResponse(['ok' => false, 'message' => 'الميعاد الجديد يجب أن يكون بعد 15 دقيقة من الآن'], 400);

    $pdo->prepare('UPDATE bookings SET appointment = :a WHERE id = :id')
        ->execute([':a' => $date->format('Y-m-d H:i:s'), ':id' => $id]);
    logAudit($pdo, 'customer', $customerId, 'booking.rescheduled', 'booking', $id, ['appointment' => ['from' => $booking['appointment'], 'to' => $date->format('Y-m-d H:i:s')]]);
    jsonResponse(['ok' => true, 'message' => 'تم تعديل الموعد بنجاح']);
  }

  jsonResponse(['ok' => false, 'message' => 'action غير صالح'], 400);
}

jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
