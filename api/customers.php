<?php
require_once __DIR__ . '/bootstrap.php';

startSession();
requireAdmin();

$method = $_SERVER['REQUEST_METHOD'];

/* ══════════════════════════════════════
   ADMIN: list customers
═══════════════════════════════════════ */
if ($method === 'GET') {
  $stmt = $pdo->query("
    SELECT
      cu.id,
      cu.name,
      cu.email,
      cu.phone,
      cu.notes,
      cu.car_type,
      cu.car_color,
      cu.car_plate,
      cu.source,
      cu.created_at,
      COUNT(b.id)                                          AS booking_count,
      COALESCE(SUM(CASE WHEN b.status != 'cancelled' THEN b.total_price ELSE 0 END), 0) AS total_spent,
      MAX(b.created_at)                                    AS last_booking_at
    FROM customer_users cu
    LEFT JOIN bookings b ON (b.customer_id = cu.id OR b.email = cu.email)
    GROUP BY cu.id
    ORDER BY booking_count DESC, cu.created_at DESC
  ");

  jsonResponse(['ok' => true, 'customers' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

/* ══════════════════════════════════════
   ADMIN: manually register a customer (walk-in)
═══════════════════════════════════════ */
if ($method === 'POST') {
  validateCsrfToken();

  $input = json_decode(file_get_contents('php://input'), true) ?? [];

  $name     = trim($input['name']  ?? '');
  $phone    = trim($input['phone'] ?? '');
  $email    = trim($input['email'] ?? '');
  $notes    = trim($input['notes']     ?? '');
  $carType  = trim($input['car_type']  ?? '');
  $carColor = trim($input['car_color'] ?? '');
  $carPlate = trim($input['car_plate'] ?? '');

  if (!$name || !preg_match('/^[\p{L}\s]{2,80}$/u', $name)) {
    jsonResponse(['ok' => false, 'message' => 'اسم غير صالح'], 400);
  }
  if (!$phone || !preg_match('/^01[0125][0-9]{8}$/', $phone)) {
    jsonResponse(['ok' => false, 'message' => 'رقم موبايل غير صالح'], 400);
  }
  if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['ok' => false, 'message' => 'بريد إلكتروني غير صالح'], 400);
  }
  if ($notes && mb_strlen($notes) > 300) {
    jsonResponse(['ok' => false, 'message' => 'الملاحظات طويلة جداً'], 400);
  }
  if (mb_strlen($carType) > 60 || mb_strlen($carColor) > 30 || mb_strlen($carPlate) > 20) {
    jsonResponse(['ok' => false, 'message' => 'بيانات السيارة طويلة جداً'], 400);
  }

  /* Prevent an accidental duplicate customer split across two rows */
  $dupe = $pdo->prepare('SELECT id, name FROM customer_users WHERE phone = :phone LIMIT 1');
  $dupe->execute([':phone' => $phone]);
  $existing = $dupe->fetch(PDO::FETCH_ASSOC);
  if ($existing) {
    jsonResponse(['ok' => false, 'message' => 'يوجد عميل بنفس رقم الموبايل: ' . $existing['name']], 409);
  }

  if (!$email) {
    $email = 'walkin_' . time() . '_' . bin2hex(random_bytes(8)) . '@drcare.local';
  }
  $passwordHash = password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT);
  $now = date('c');

  try {
    $stmt = $pdo->prepare('
      INSERT INTO customer_users (email, phone, name, password_hash, notes, car_type, car_color, car_plate, source, created_at, is_active)
      VALUES (:email, :phone, :name, :hash, :notes, :car_type, :car_color, :car_plate, :source, :now, 1)
    ');
    $stmt->execute([
      ':email' => $email, ':phone' => $phone, ':name' => $name, ':hash' => $passwordHash,
      ':notes' => $notes ?: null, ':car_type' => $carType ?: null, ':car_color' => $carColor ?: null,
      ':car_plate' => $carPlate ?: null, ':source' => 'admin', ':now' => $now,
    ]);
  } catch (Exception $e) {
    jsonResponse(['ok' => false, 'message' => 'البريد الإلكتروني مستخدم مسبقاً'], 409);
  }

  $id = (int)$pdo->lastInsertId();
  $adminId = $_SESSION['admin_id'] ?? null;
  logAudit($pdo, 'admin', $adminId, 'customer.created', 'customer', $id, ['name' => $name, 'phone' => $phone]);

  jsonResponse(['ok' => true, 'id' => $id], 201);
}

jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
