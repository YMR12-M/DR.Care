<?php
require_once __DIR__ . '/bootstrap.php';
$config = require __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
startSession();

if ($method === 'GET') {
  // Admin fetch
  requireAdmin();
  $stmt = $pdo->query('SELECT * FROM bookings ORDER BY id DESC');
  $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
  jsonResponse(['ok' => true, 'bookings' => $bookings]);
}

if ($method === 'POST') {
  requireCustomerSession();
  validateCsrfToken();

  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  $name = trim($input['name'] ?? '');
  $email = trim($input['email'] ?? '');
  $phone = trim($input['phone'] ?? '');
  $packageCode = $input['servicePackage'] ?? $input['packageCode'] ?? '';
  $carTypeCode = $input['carType'] ?? '';
  $branch = $input['branch'] ?? '';
  $appointment = $input['appointment'] ?? null;
  $notes = $input['notes'] ?? null;
  $plate = $input['plateNumber'] ?? null;
  $paymentMethod = $input['paymentMethod'] ?? null;
  $couponCode = strtoupper(trim($input['couponCode'] ?? ''));
  $customerId = $_SESSION['customer_id'] ?? null;

  if (!$name || !preg_match('/^[\p{L}\s]{2,80}$/u', $name)) {
    jsonResponse(['ok' => false, 'message' => 'الاسم غير صالح'], 400);
  }

  if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['ok' => false, 'message' => 'البريد الإلكتروني غير صالح'], 400);
  }

  if (!preg_match('/^01[0125][0-9]{8}$/', $phone)) {
    jsonResponse(['ok' => false, 'message' => 'رقم الموبايل غير صحيح'], 400);
  }

  $allowedBranches = $config['branches'];
  $allowedPayments = $config['paymentMethods'];

  if (!in_array($branch, $allowedBranches, true)) {
    jsonResponse(['ok' => false, 'message' => 'الفرع غير صالح'], 400);
  }

  if (!in_array($paymentMethod, $allowedPayments, true)) {
    jsonResponse(['ok' => false, 'message' => 'طريقة الدفع غير صالحة'], 400);
  }

  if ($appointment !== null && $appointment !== '') {
    $date = DateTime::createFromFormat('Y-m-d\TH:i', $appointment);
    $now = new DateTime('now');
    if (!$date || $date < $now->modify('+15 minutes')) {
      jsonResponse(['ok' => false, 'message' => 'الموعد يجب أن يكون بعد 15 دقيقة من الآن'], 400);
    }
  }

  if ($notes && mb_strlen($notes) > 300) {
    jsonResponse(['ok' => false, 'message' => 'الملاحظات طويلة جداً'], 400);
  }

  if ($plate && !preg_match('/^[\p{L}\p{N}\s\-]{1,20}$/u', $plate)) {
    jsonResponse(['ok' => false, 'message' => 'رقم اللوحة غير صالح'], 400);
  }

  // find package and car type
  $pkg = array_values(array_filter($config['packages'], fn($p) => $p['code'] === $packageCode))[0] ?? null;
  $car = array_values(array_filter($config['carTypes'], fn($c) => $c['code'] === $carTypeCode))[0] ?? null;

  if (!$pkg || !$car) {
    jsonResponse(['ok' => false, 'message' => 'بيانات الباقة أو نوع العربية غير صحيحة'], 400);
  }

  $total = ($pkg['price'] ?? 0) + ($car['extra'] ?? 0);
  $discount = 0;

  /* ── Coupon validation & application ── */
  $appliedCoupon = null;
  if ($couponCode) {
    $cs = $pdo->prepare('SELECT * FROM coupons WHERE code = :code AND is_active = 1 LIMIT 1');
    $cs->execute([':code' => $couponCode]);
    $coupon = $cs->fetch(PDO::FETCH_ASSOC);

    if ($coupon
      && (!$coupon['expires_at'] || $coupon['expires_at'] >= date('c'))
      && ($coupon['max_uses'] === null || $coupon['used_count'] < $coupon['max_uses'])
      && $total >= $coupon['min_order']
    ) {
      $discount = $coupon['discount_type'] === 'percent'
        ? round($total * $coupon['discount_value'] / 100, 2)
        : min($coupon['discount_value'], $total);
      $total = max(0, $total - $discount);
      $appliedCoupon = $coupon;
    }
  }

  $totalLabel = $pkg['code'] === 'fleet' ? 'حسب التعاقد' : number_format($total, 0, '.', ',') . ' جنيه';

  $pdo->beginTransaction();
  try {
    $stmt = $pdo->prepare('INSERT INTO bookings (name, email, phone, package_code, package_name, car_type_code, car_type_name, branch, appointment, notes, plate_number, payment_method, total_price, created_at, status, customer_id, source) VALUES (:name,:email,:phone,:pkgc,:pkgN,:carc,:carN,:branch,:ap,:notes,:plate,:pm,:total,:created,:status,:customer_id,\'web\')');
    $stmt->execute([
      ':name' => $name,
      ':email' => $email,
      ':phone' => $phone,
      ':pkgc' => $pkg['code'],
      ':pkgN' => $pkg['name'],
      ':carc' => $car['code'],
      ':carN' => $car['name'],
      ':branch' => $branch,
      ':ap' => $appointment,
      ':notes' => $notes,
      ':plate' => $plate,
      ':pm' => $paymentMethod,
      ':total' => $total,
      ':created' => date('c'),
      ':status' => 'new',
      ':customer_id' => $customerId
    ]);

    /* Atomic coupon increment — WHERE clause prevents race condition */
    if ($appliedCoupon) {
      $upd = $pdo->prepare(
        'UPDATE coupons SET used_count = used_count + 1 WHERE id = :id AND (max_uses IS NULL OR used_count < max_uses)'
      );
      $upd->execute([':id' => $appliedCoupon['id']]);
      if ($upd->rowCount() === 0) {
        $pdo->rollBack();
        jsonResponse(['ok' => false, 'message' => 'كود الخصم لم يعد متاحاً'], 409);
      return;
      }
    }

    $pdo->commit();
  } catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    jsonResponse(['ok' => false, 'message' => 'خطأ في الخادم'], 500);
  }

  $id = (int)$pdo->lastInsertId();
  $booking = [
    'id' => $id,
    'name' => $name,
    'email' => $email,
    'phone' => $phone,
    'package_name' => $pkg['name'],
    'car_type_name' => $car['name'],
    'branch' => $branch,
    'appointment' => $appointment,
    'plate_number' => $plate,
    'payment_method' => $paymentMethod,
    'total_price' => $total,
    'notes' => $notes,
    'created_at' => date('c')
  ];

  sendBookingNotification($booking);

  // WhatsApp confirmation to customer
  $waMsg = "مرحباً {$name}،\n\nتم استلام حجزك في DR.Care ✅\nرقم الحجز: #{$id}\nالباقة: {$pkg['name']}\nالفرع: {$branch}\nطريقة الدفع: {$paymentMethod}\n\nسنتواصل معك قريباً. شكراً لثقتك بنا! 🚗";
  sendWhatsApp($phone, $waMsg);

  jsonResponse(['ok' => true, 'booking' => ['id' => $id, 'total' => $total, 'totalLabel' => $totalLabel]] , 201);
}

if ($method === 'PATCH') {
  requireAdmin();
  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  validateCsrfToken();

  $id = (int)($input['id'] ?? 0);
  if (!$id) jsonResponse(['ok' => false, 'message' => 'ID مطلوب'], 400);

  $cur = $pdo->prepare('SELECT status, payment_status FROM bookings WHERE id = :id');
  $cur->execute([':id' => $id]);
  $existing = $cur->fetch(PDO::FETCH_ASSOC);
  if (!$existing) jsonResponse(['ok' => false, 'message' => 'الحجز غير موجود'], 404);

  $sets   = [];
  $params = [':id' => $id];
  $detail = [];

  if (array_key_exists('status', $input)) {
    $allowed = ['new', 'confirmed', 'in_service', 'completed', 'cancelled'];
    if (!in_array($input['status'], $allowed, true))
      jsonResponse(['ok' => false, 'message' => 'حالة غير صالحة'], 400);
    $sets[] = 'status = :status';
    $params[':status'] = $input['status'];
    $detail['status'] = ['from' => $existing['status'], 'to' => $input['status']];
  }

  if (array_key_exists('payment_status', $input)) {
    $allowed = ['pending', 'paid', 'waived'];
    if (!in_array($input['payment_status'], $allowed, true))
      jsonResponse(['ok' => false, 'message' => 'حالة دفع غير صالحة'], 400);
    $sets[] = 'payment_status = :payment_status';
    $params[':payment_status'] = $input['payment_status'];
    $detail['payment_status'] = ['from' => $existing['payment_status'] ?? 'pending', 'to' => $input['payment_status']];
  }

  if (array_key_exists('appointment', $input)) {
    $appt = $input['appointment'];
    if ($appt !== null && $appt !== '') {
      $date = DateTime::createFromFormat('Y-m-d\TH:i', $appt);
      if (!$date) jsonResponse(['ok' => false, 'message' => 'صيغة الموعد غير صالحة'], 400);
    }
    $sets[] = 'appointment = :appointment';
    $params[':appointment'] = ($appt === '' ? null : $appt);
    $detail['appointment'] = $appt;
  }

  if (empty($sets)) jsonResponse(['ok' => false, 'message' => 'لا يوجد تعديل محدد'], 400);

  $pdo->prepare('UPDATE bookings SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($params);
  logAudit($pdo, 'admin', $_SESSION['admin_id'] ?? null, 'booking.updated', 'booking', $id, $detail);

  /* ── Award loyalty points on completion ── */
  if (
    isset($input['status']) &&
    $input['status'] === 'completed' &&
    $existing['status'] !== 'completed'
  ) {
    $bk = $pdo->prepare('SELECT customer_id, total_price, package_name FROM bookings WHERE id = :id');
    $bk->execute([':id' => $id]);
    $bkRow = $bk->fetch(PDO::FETCH_ASSOC);

    if ($bkRow && $bkRow['customer_id']) {
      /* 1 point per 10 ج, minimum 5 points */
      $earned = max(5, (int)floor((float)$bkRow['total_price'] / 10));

      /* Check not already awarded for this booking */
      $already = $pdo->prepare('SELECT id FROM loyalty_points WHERE booking_id = :bid AND source = :src');
      $already->execute([':bid' => $id, ':src' => 'booking']);
      if (!$already->fetch()) {
        $pdo->prepare("
          INSERT INTO loyalty_points (customer_id, points, source, booking_id, note)
          VALUES (:cid, :pts, 'booking', :bid, :note)
        ")->execute([
          ':cid'  => (int)$bkRow['customer_id'],
          ':pts'  => $earned,
          ':bid'  => $id,
          ':note' => "حجز مكتمل: {$bkRow['package_name']}",
        ]);
      }

      maybeRewardReferral($pdo, (int)$bkRow['customer_id']);
    }
  }

  jsonResponse(['ok' => true, 'message' => 'تم التحديث']);
}

jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
