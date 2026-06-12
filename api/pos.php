<?php
error_reporting(0);
require_once __DIR__ . '/bootstrap.php';
$config = require __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

$POS_TOKEN = getEnvValue('POS_TOKEN', null);
if (!$POS_TOKEN) {
  jsonResponse(['ok' => false, 'message' => 'POS_TOKEN غير مضبوط في ملف .env — راجع المسؤول.'], 503);
}

/* ── Token helpers ── */
function getPosToken(): string {
  // Header takes priority — not logged by web server
  $header = trim($_SERVER['HTTP_X_POS_TOKEN'] ?? '');
  if ($header !== '') return $header;
  // Body fallback for POST/PATCH (token already in body)
  return '';
}

function validatePosToken(string $token, string $expected): void {
  if (!$token || !hash_equals($expected, $token)) {
    jsonResponse(['ok' => false, 'message' => 'رمز الموظف غير صحيح'], 401);
  }
}

/* ════════════════════════════════
   GET: health / today / search
════════════════════════════════ */
if ($method === 'GET') {
  $token  = getPosToken();
  $action = trim($_GET['action'] ?? '');
  $q      = trim($_GET['q']      ?? '');

  /* Health check (no token needed) */
  if (!$action) {
    jsonResponse(['ok' => true, 'message' => 'DR.Care POS متصل ✓', 'time' => date('H:i')]);
  }

  validatePosToken($token, $POS_TOKEN);

  /* Today's POS bookings */
  if ($action === 'today') {
    $stmt = $pdo->prepare("
      SELECT id, name, phone, plate_number, package_name, car_type_name,
             branch, payment_method, total_price, discount_amount, discount_note, status, created_at
      FROM bookings
      WHERE source = 'pos'
        AND date(created_at, 'localtime') = date('now', 'localtime')
      ORDER BY id DESC
    ");
    $stmt->execute();
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $revenue  = array_sum(array_column(
      array_filter($bookings, fn($b) => $b['status'] !== 'cancelled'),
      'total_price'
    ));
    jsonResponse(['ok' => true, 'bookings' => $bookings, 'revenue' => $revenue]);
  }

  /* All POS bookings (history) */
  if ($action === 'history') {
    $limit  = max(1, min(200, (int)($_GET['limit'] ?? 50)));
    $offset = max(0, (int)($_GET['offset'] ?? 0));
    $stmt = $pdo->prepare("
      SELECT id, name, phone, plate_number, package_name, car_type_name,
             branch, payment_method, payment_status, total_price, discount_amount, discount_note, status, created_at
      FROM bookings
      WHERE source = 'pos'
      ORDER BY id DESC
      LIMIT :lim OFFSET :off
    ");
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $total = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE source='pos'")->fetchColumn();
    jsonResponse(['ok' => true, 'bookings' => $bookings, 'total' => $total]);
  }

  /* Search bookings */
  if ($action === 'search') {
    if (!$q) jsonResponse(['ok' => false, 'message' => 'أدخل كلمة البحث'], 400);
    $like = '%' . $q . '%';
    $stmt = $pdo->prepare("
      SELECT id, name, phone, plate_number, package_name, car_type_name,
             branch, payment_method, total_price, discount_amount, discount_note, status, created_at
      FROM bookings
      WHERE name LIKE :q OR phone LIKE :q OR plate_number LIKE :q
      ORDER BY id DESC
      LIMIT 20
    ");
    $stmt->execute([':q' => $like]);
    jsonResponse(['ok' => true, 'bookings' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
  }

  /* Single booking detail (for reprint) */
  if ($action === 'detail') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(['ok' => false, 'message' => 'ID مطلوب'], 400);
    $stmt = $pdo->prepare("
      SELECT id, name, phone, email, plate_number, package_name, car_type_name,
             branch, payment_method, total_price, pkg_price, car_extra_price,
             discount_amount, discount_note, notes, status, created_at
      FROM bookings WHERE id = :id LIMIT 1
    ");
    $stmt->execute([':id' => $id]);
    $b = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$b) jsonResponse(['ok' => false, 'message' => 'الحجز غير موجود'], 404);
    jsonResponse(['ok' => true, 'booking' => $b]);
  }

  /* Validate coupon */
  if ($action === 'coupon') {
    $code  = strtoupper(trim($_GET['code'] ?? ''));
    $total = (float)($_GET['total'] ?? 0);
    if (!$code) jsonResponse(['ok' => false, 'message' => 'أدخل الكود'], 400);
    $stmt = $pdo->prepare("
      SELECT * FROM coupons
      WHERE code = ? AND is_active = 1
        AND (expires_at IS NULL OR expires_at > datetime('now'))
        AND (max_uses IS NULL OR used_count < max_uses)
      LIMIT 1
    ");
    $stmt->execute([$code]);
    $coupon = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$coupon) jsonResponse(['ok' => false, 'message' => 'الكود غير صالح أو منتهي الصلاحية'], 404);
    if ($total > 0 && (float)$coupon['min_order'] > $total) {
      jsonResponse(['ok' => false, 'message' => "الحد الأدنى للطلب {$coupon['min_order']} جنيه"], 400);
    }
    $discount = $coupon['discount_type'] === 'percent'
      ? round($total * $coupon['discount_value'] / 100, 2)
      : min((float)$coupon['discount_value'], $total);
    jsonResponse(['ok' => true, 'coupon' => $coupon, 'discount' => $discount]);
  }

  /* Today's stats breakdown */
  if ($action === 'stats') {
    $date = $_GET['date'] ?? date('Y-m-d');
    $where = "source = 'pos' AND date(created_at,'localtime') = ? AND status != 'cancelled'";
    $byPkg = $pdo->prepare("SELECT package_name AS label, COUNT(*) AS cnt, SUM(total_price) AS rev FROM bookings WHERE $where GROUP BY package_name ORDER BY rev DESC");
    $byPkg->execute([$date]);
    $byCar = $pdo->prepare("SELECT car_type_name AS label, COUNT(*) AS cnt, SUM(total_price) AS rev FROM bookings WHERE $where GROUP BY car_type_name ORDER BY rev DESC");
    $byCar->execute([$date]);
    $byPay = $pdo->prepare("SELECT payment_method AS label, COUNT(*) AS cnt, SUM(total_price) AS rev FROM bookings WHERE $where GROUP BY payment_method ORDER BY rev DESC");
    $byPay->execute([$date]);
    jsonResponse([
      'ok'         => true,
      'by_package' => $byPkg->fetchAll(PDO::FETCH_ASSOC),
      'by_car'     => $byCar->fetchAll(PDO::FETCH_ASSOC),
      'by_payment' => $byPay->fetchAll(PDO::FETCH_ASSOC),
    ]);
  }

  jsonResponse(['ok' => false, 'message' => 'action غير معروف'], 400);
}

/* ════════════════════════════════
   PATCH: update booking status
════════════════════════════════ */
if ($method === 'PATCH') {
  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  validatePosToken(trim($input['token'] ?? getPosToken()), $POS_TOKEN);

  $id = (int)($input['id'] ?? 0);
  if (!$id) jsonResponse(['ok' => false, 'message' => 'رقم الحجز مطلوب'], 400);

  $cur = $pdo->prepare('SELECT status, payment_status FROM bookings WHERE id = ?');
  $cur->execute([$id]);
  $existing = $cur->fetch(PDO::FETCH_ASSOC);
  if (!$existing) jsonResponse(['ok' => false, 'message' => 'الحجز غير موجود'], 404);

  $sets   = [];
  $params = [];
  $detail = [];

  if (array_key_exists('status', $input)) {
    $allowed = ['new', 'confirmed', 'in_service', 'completed', 'cancelled'];
    $status  = trim($input['status']);
    if (!in_array($status, $allowed, true)) jsonResponse(['ok' => false, 'message' => 'حالة غير صالحة'], 400);
    $sets[]  = 'status = ?';
    $params[] = $status;
    $detail['status'] = ['from' => $existing['status'], 'to' => $status];
  }

  if (array_key_exists('payment_status', $input)) {
    $allowedPay = ['pending', 'paid', 'waived'];
    $ps         = trim($input['payment_status']);
    if (!in_array($ps, $allowedPay, true)) jsonResponse(['ok' => false, 'message' => 'حالة دفع غير صالحة'], 400);
    $sets[]  = 'payment_status = ?';
    $params[] = $ps;
    $detail['payment_status'] = ['from' => $existing['payment_status'] ?? 'pending', 'to' => $ps];
  }

  if (empty($sets)) jsonResponse(['ok' => false, 'message' => 'لا يوجد تعديل'], 400);

  $params[] = $id;
  $pdo->prepare('UPDATE bookings SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
  logAudit($pdo, 'pos', null, 'booking.updated', 'booking', $id, $detail);

  jsonResponse(['ok' => true, 'message' => 'تم التحديث']);
}

/* ════════════════════════════════
   POST: create invoice booking
════════════════════════════════ */
if ($method === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  validatePosToken(trim($input['token'] ?? ''), $POS_TOKEN);

  $name           = trim($input['name']           ?? '');
  $phone          = trim($input['phone']          ?? '');
  $email          = trim($input['email']          ?? '') ?: null;
  $packageCode    = trim($input['packageCode']    ?? '');
  $carTypeCode    = trim($input['carType']        ?? '');
  $branch         = trim($input['branch']         ?? '');
  $paymentMethod  = trim($input['paymentMethod']  ?? '');
  $plate          = trim($input['plateNumber']    ?? '') ?: null;
  $notes          = trim($input['notes']          ?? '') ?: null;
  $couponCode     = strtoupper(trim($input['coupon_code']        ?? ''));
  $manualDisc     = max(0, (float)($input['manual_discount']     ?? 0));
  $manualDiscType = trim($input['manual_discount_type'] ?? 'fixed');

  if (!$name || !preg_match('/^[\p{L}\s]{2,80}$/u', $name))
    jsonResponse(['ok' => false, 'message' => 'اسم العميل غير صالح'], 400);
  if (!preg_match('/^01[0125][0-9]{8}$/', $phone))
    jsonResponse(['ok' => false, 'message' => 'رقم الهاتف غير صحيح'], 400);
  if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL))
    jsonResponse(['ok' => false, 'message' => 'البريد الإلكتروني غير صالح'], 400);

  $pkg = array_values(array_filter($config['packages'], fn($p) => $p['code'] === $packageCode))[0] ?? null;
  $car = array_values(array_filter($config['carTypes'], fn($c) => $c['code'] === $carTypeCode))[0] ?? null;

  if (!$pkg) jsonResponse(['ok' => false, 'message' => 'اختار الباقة'], 400);
  if (!$car) jsonResponse(['ok' => false, 'message' => 'اختار نوع السيارة'], 400);
  if (!in_array($branch, $config['branches'], true))
    jsonResponse(['ok' => false, 'message' => 'الفرع غير صالح'], 400);

  $pkgPrice  = (float)($pkg['price'] ?? 0);
  $carExtra  = (float)($car['extra'] ?? 0);
  $baseTotal = $pkgPrice + $carExtra;

  /* ── Apply coupon ── */
  $discountAmount = 0.0;
  $discountNote   = null;
  $appliedCoupon  = null;

  if ($couponCode) {
    $cs = $pdo->prepare("SELECT * FROM coupons WHERE code=? AND is_active=1 AND (expires_at IS NULL OR expires_at>datetime('now')) AND (max_uses IS NULL OR used_count<max_uses) LIMIT 1");
    $cs->execute([$couponCode]);
    $appliedCoupon = $cs->fetch(PDO::FETCH_ASSOC);
    if ($appliedCoupon) {
      $d = $appliedCoupon['discount_type'] === 'percent'
        ? round($baseTotal * $appliedCoupon['discount_value'] / 100, 2)
        : min((float)$appliedCoupon['discount_value'], $baseTotal);
      $discountAmount += $d;
      $discountNote    = "كوبون: {$couponCode}";
    }
  }

  /* ── Apply manual discount ── */
  if ($manualDisc > 0) {
    $md = $manualDiscType === 'percent'
      ? round($baseTotal * min($manualDisc, 100) / 100, 2)
      : min($manualDisc, $baseTotal);
    $discountAmount += $md;
    $discountNote    = ($discountNote ? $discountNote . '، ' : '') .
      ($manualDiscType === 'percent' ? "خصم يدوي {$manualDisc}%" : "خصم يدوي {$manualDisc} جنيه");
  }

  $discountAmount = min($discountAmount, $baseTotal);
  $total      = $baseTotal - $discountAmount;
  $now        = date('c');
  $claimToken = bin2hex(random_bytes(16)); // 32-char unique token

  $pdo->prepare('INSERT INTO bookings
    (name, email, phone, package_code, package_name, car_type_code, car_type_name,
     branch, payment_method, plate_number, notes, total_price, pkg_price, car_extra_price,
     discount_amount, discount_note, claim_token, created_at, status, source)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,\'new\',\'pos\')')
  ->execute([
    $name, $email, $phone,
    $pkg['code'], $pkg['name'],
    $car['code'], $car['name'],
    $branch, $paymentMethod, $plate, $notes,
    $total, $pkgPrice, $carExtra,
    $discountAmount, $discountNote, $claimToken, $now,
  ]);

  /* Increment coupon usage */
  if ($appliedCoupon) {
    $pdo->prepare('UPDATE coupons SET used_count=used_count+1 WHERE id=? AND (max_uses IS NULL OR used_count<max_uses)')
        ->execute([$appliedCoupon['id']]);
  }

  $id      = (int)$pdo->lastInsertId();
  $booking = [
    'id'             => $id,
    'name'           => $name,
    'phone'          => $phone,
    'email'          => $email,
    'package_name'   => $pkg['name'],
    'car_type_name'  => $car['name'],
    'branch'         => $branch,
    'payment_method' => $paymentMethod,
    'plate_number'   => $plate,
    'notes'          => $notes,
    'total_price'    => $total,
    'pkg_price'      => $pkgPrice,
    'car_extra'      => $carExtra,
    'discount_amount'=> $discountAmount,
    'discount_note'  => $discountNote,
    'claim_token'    => $claimToken,
    'created_at'     => $now,
    'status'         => 'new',
  ];

  sendBookingNotification($booking);

  $waMsg = "مرحباً {$name}،\n\nتم استلام حجزك في DR.Care ✅\nرقم الحجز: #{$id}\nالباقة: {$pkg['name']}\nالفرع: {$branch}\nطريقة الدفع: {$paymentMethod}\n\nسنتواصل معك قريباً. شكراً لثقتك بنا! 🚗";
  sendWhatsApp($phone, $waMsg);

  jsonResponse(['ok' => true, 'booking' => $booking]);
}

jsonResponse(['ok' => false, 'message' => 'Method not allowed'], 405);
