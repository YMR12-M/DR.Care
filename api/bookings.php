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

  $slotId = null;
  if ($appointment !== null && $appointment !== '') {
    $apptDt = DateTime::createFromFormat('Y-m-d\TH:i', $appointment);
    if (!$apptDt) {
      jsonResponse(['ok' => false, 'message' => 'صيغة الموعد غير صحيحة'], 400);
    }
    $apptDate = $apptDt->format('Y-m-d');
    $apptTime = $apptDt->format('H:i');

    /* Check if slot-based booking is in use (any active slots defined) */
    $slotCount = (int)$pdo->query("SELECT COUNT(*) FROM appointment_slots WHERE is_active=1")->fetchColumn();
    if ($slotCount > 0) {
      $slotRow = $pdo->prepare("
        SELECT id, booked_count, max_bookings
        FROM appointment_slots
        WHERE slot_date=:d AND slot_time=:t AND is_active=1 LIMIT 1
      ");
      $slotRow->execute([':d' => $apptDate, ':t' => $apptTime]);
      $slot = $slotRow->fetch(PDO::FETCH_ASSOC);
      if (!$slot) {
        jsonResponse(['ok' => false, 'message' => 'الموعد المختار غير متاح'], 400);
      }
      if ((int)$slot['booked_count'] >= (int)$slot['max_bookings']) {
        jsonResponse(['ok' => false, 'message' => 'هذا الموعد اكتمل، اختار موعداً آخر'], 409);
      }
      $slotId = (int)$slot['id'];
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

  $pkgPrice  = (float)($pkg['price'] ?? 0);
  $carExtra  = (float)($car['extra'] ?? 0);
  $total     = $pkgPrice + $carExtra;
  $discount  = 0;
  $discountNote = null;

  /* ── Validate Instapay screenshot ── */
  $paymentScreenshot = null;
  if ($paymentMethod === 'Instapay') {
    $raw = trim($input['paymentScreenshot'] ?? '');
    if (!$raw) {
      jsonResponse(['ok' => false, 'message' => 'رجاء ارفع إيصال الدفع (Instapay)'], 400);
    }
    if (!preg_match('/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i', $raw) || strlen($raw) > 3 * 1024 * 1024) {
      jsonResponse(['ok' => false, 'message' => 'صورة الإيصال غير صالحة أو حجمها كبير'], 400);
    }
    $paymentScreenshot = $raw;
  }

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
      $discountNote = "كوبون: {$couponCode}";
      $appliedCoupon = $coupon;
    }
  }

  $totalLabel = ($total == 0) ? 'حسب الشغل' : number_format($total, 0, '.', ',') . ' جنيه';

  $pdo->beginTransaction();
  try {
    $stmt = $pdo->prepare('INSERT INTO bookings
      (name, email, phone, package_code, package_name, car_type_code, car_type_name,
       branch, appointment, notes, plate_number, payment_method, total_price,
       pkg_price, car_extra_price, discount_amount, discount_note, payment_screenshot,
       created_at, status, customer_id, source)
      VALUES
      (:name,:email,:phone,:pkgc,:pkgN,:carc,:carN,:branch,:ap,:notes,:plate,:pm,:total,
       :pkg_price,:car_extra,:discount,:disc_note,:screenshot,:created,:status,:customer_id,\'web\')');
    $stmt->execute([
      ':name'       => $name,
      ':email'      => $email,
      ':phone'      => $phone,
      ':pkgc'       => $pkg['code'],
      ':pkgN'       => $pkg['name'],
      ':carc'       => $car['code'],
      ':carN'       => $car['name'],
      ':branch'     => $branch,
      ':ap'         => $appointment,
      ':notes'      => $notes,
      ':plate'      => $plate,
      ':pm'         => $paymentMethod,
      ':total'      => $total,
      ':pkg_price'  => $pkgPrice,
      ':car_extra'  => $carExtra,
      ':discount'   => $discount,
      ':disc_note'  => $discountNote,
      ':screenshot' => $paymentScreenshot,
      ':created'    => date('c'),
      ':status'     => 'new',
      ':customer_id'=> $customerId
    ]);

    /* Atomic slot increment — prevents over-booking */
    if ($slotId) {
      $upd = $pdo->prepare(
        'UPDATE appointment_slots SET booked_count = booked_count + 1
         WHERE id = :id AND booked_count < max_bookings'
      );
      $upd->execute([':id' => $slotId]);
      if ($upd->rowCount() === 0) {
        $pdo->rollBack();
        jsonResponse(['ok' => false, 'message' => 'هذا الموعد اكتمل، اختار موعداً آخر'], 409);
      }
    }

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
    if (in_array($input['status'], ['completed', 'cancelled'], true)) {
      $sets[] = 'payment_screenshot = NULL';
    }
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

  /* ── WhatsApp notification to customer on status change ── */
  if (isset($input['status']) && $detail['status']['from'] !== $detail['status']['to']) {
    $bkWa = $pdo->prepare('SELECT name, phone, package_name, branch FROM bookings WHERE id = :id');
    $bkWa->execute([':id' => $id]);
    $bkData = $bkWa->fetch(PDO::FETCH_ASSOC);

    if ($bkData) {
      $n = $bkData['name'];
      $p = $bkData['package_name'];
      $b = $bkData['branch'];
      $waMessages = [
        'confirmed'  => "مرحباً {$n}،\n\nتم تأكيد حجزك في DR.Care ✅\nرقم الحجز: #{$id}\nالباقة: {$p}\nالفرع: {$b}\n\nفي انتظارك! 🚗",
        'in_service' => "مرحباً {$n}،\n\nعربيتك دلوقتي بتتغسل في DR.Care 🚿✨\nرقم الحجز: #{$id}\n\nهنعلّمك لما تخلص!",
        'completed'  => "مرحباً {$n}،\n\nتم تسليم عربيتك بنجاح! ✅🎉\nرقم الحجز: #{$id}\n\nشكراً لثقتك في DR.Care. نتمنى نشوفك تاني! 🚗",
        'cancelled'  => "مرحباً {$n}،\n\nللأسف تم إلغاء حجزك #{$id} في DR.Care.\n\nلو عندك أي استفسار تواصل معنا. نتمنى نخدمك تاني! 🚗",
      ];
      if (isset($waMessages[$input['status']])) {
        sendWhatsApp($bkData['phone'], $waMessages[$input['status']]);
      }
    }
  }

  jsonResponse(['ok' => true, 'message' => 'تم التحديث']);
}

jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
