<?php
require_once __DIR__ . '/bootstrap.php';
startSession();

$method = $_SERVER['REQUEST_METHOD'];
$input  = json_decode(file_get_contents('php://input'), true) ?? [];
$action = trim($input['action'] ?? $_GET['action'] ?? '');

/* ══════════════════════════════════════
   PUBLIC: validate a coupon code
═══════════════════════════════════════ */
if ($method === 'POST' && $action === 'validate') {
  $code     = strtoupper(trim($input['code']  ?? ''));
  $subtotal = (float)($input['subtotal'] ?? 0);

  if (!$code) jsonResponse(['ok' => false, 'message' => 'أدخل كود الخصم'], 400);

  $stmt = $pdo->prepare('SELECT * FROM coupons WHERE code = :code LIMIT 1');
  $stmt->execute([':code' => $code]);
  $coupon = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$coupon || !$coupon['is_active']) {
    jsonResponse(['ok' => false, 'message' => 'كود الخصم غير صالح أو منتهي'], 404);
  }
  if ($coupon['expires_at'] && $coupon['expires_at'] < date('c')) {
    jsonResponse(['ok' => false, 'message' => 'انتهت صلاحية هذا الكود'], 400);
  }
  if ($coupon['max_uses'] !== null && $coupon['used_count'] >= $coupon['max_uses']) {
    jsonResponse(['ok' => false, 'message' => 'تم استنفاد الحد الأقصى لاستخدام هذا الكود'], 400);
  }
  if ($subtotal < $coupon['min_order']) {
    jsonResponse(['ok' => false, 'message' => 'الحد الأدنى للطلب هو ' . $coupon['min_order'] . ' جنيه'], 400);
  }

  $discount = $coupon['discount_type'] === 'percent'
    ? round($subtotal * $coupon['discount_value'] / 100, 2)
    : min($coupon['discount_value'], $subtotal);

  jsonResponse([
    'ok'            => true,
    'code'          => $coupon['code'],
    'discount_type' => $coupon['discount_type'],
    'discount_value'=> $coupon['discount_value'],
    'discount'      => $discount,
    'new_total'     => max(0, $subtotal - $discount),
  ]);
}

/* ══════════════════════════════════════
   ADMIN: list coupons
═══════════════════════════════════════ */
if ($method === 'GET') {
  requireAdmin();
  $stmt = $pdo->query('SELECT * FROM coupons ORDER BY created_at DESC');
  jsonResponse(['ok' => true, 'coupons' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

/* ══════════════════════════════════════
   ADMIN: create coupon
═══════════════════════════════════════ */
if ($method === 'POST' && $action === 'create') {
  requireAdmin();

  $code      = strtoupper(trim($input['code'] ?? ''));
  $type      = $input['discount_type']  ?? 'percent';
  $value     = (float)($input['discount_value'] ?? 0);
  $minOrder  = (float)($input['min_order']       ?? 0);
  $maxUses   = isset($input['max_uses']) && $input['max_uses'] !== '' ? (int)$input['max_uses'] : null;
  $expiresAt = trim($input['expires_at'] ?? '') ?: null;

  if (!$code || !preg_match('/^[A-Z0-9_\-]{3,20}$/', $code)) {
    jsonResponse(['ok' => false, 'message' => 'الكود يجب أن يكون حروف إنجليزية وأرقام (3-20 حرف)'], 400);
  }
  if (!in_array($type, ['percent', 'fixed'], true)) {
    jsonResponse(['ok' => false, 'message' => 'نوع الخصم غير صالح'], 400);
  }
  if ($value <= 0 || ($type === 'percent' && $value > 100)) {
    jsonResponse(['ok' => false, 'message' => 'قيمة الخصم غير صالحة'], 400);
  }

  try {
    $stmt = $pdo->prepare('
      INSERT INTO coupons (code, discount_type, discount_value, min_order, max_uses, expires_at, is_active, created_at)
      VALUES (:code, :type, :val, :min, :max, :exp, 1, :now)
    ');
    $stmt->execute([
      ':code' => $code, ':type' => $type, ':val' => $value,
      ':min' => $minOrder, ':max' => $maxUses, ':exp' => $expiresAt,
      ':now' => date('c'),
    ]);
    jsonResponse(['ok' => true, 'message' => 'تم إنشاء الكوبون بنجاح', 'id' => $pdo->lastInsertId()]);
  } catch (Exception $e) {
    jsonResponse(['ok' => false, 'message' => 'الكود موجود مسبقاً'], 409);
  }
}

/* ══════════════════════════════════════
   ADMIN: toggle active / delete
═══════════════════════════════════════ */
if ($method === 'PATCH') {
  requireAdmin();
  validateCsrfToken();
  $id     = (int)($input['id']        ?? 0);
  $active = isset($input['is_active']) ? (int)(bool)$input['is_active'] : null;

  if (!$id) jsonResponse(['ok' => false, 'message' => 'ID مطلوب'], 400);

  if ($active !== null) {
    $pdo->prepare('UPDATE coupons SET is_active = :a WHERE id = :id')
        ->execute([':a' => $active, ':id' => $id]);
    jsonResponse(['ok' => true]);
  }

  jsonResponse(['ok' => false, 'message' => 'لا يوجد تعديل محدد'], 400);
}

if ($method === 'DELETE') {
  requireAdmin();
  validateCsrfToken();
  $id = (int)($input['id'] ?? 0);
  if (!$id) jsonResponse(['ok' => false, 'message' => 'ID مطلوب'], 400);
  $pdo->prepare('DELETE FROM coupons WHERE id = :id')->execute([':id' => $id]);
  jsonResponse(['ok' => true]);
}

jsonResponse(['ok' => false, 'message' => 'Method not allowed'], 405);
