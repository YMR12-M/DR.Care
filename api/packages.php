<?php
// Public: packages (from DB, admin-editable) + car types/branches/payment methods (static config)
require_once __DIR__ . '/bootstrap.php';
startSession();

$config = require __DIR__ . '/config.php';
$method = $_SERVER['REQUEST_METHOD'];
$input  = json_decode(file_get_contents('php://input'), true) ?? [];

function validatePackageInput(array $input, bool $requireCode): array {
  $name  = trim($input['name']  ?? '');
  $price = (float)($input['price'] ?? 0);

  if (!$name || mb_strlen($name) > 100) {
    jsonResponse(['ok' => false, 'message' => 'اسم الباقة غير صالح'], 400);
  }
  if ($price < 0) {
    jsonResponse(['ok' => false, 'message' => 'السعر غير صالح'], 400);
  }

  $code = null;
  if ($requireCode) {
    $code = strtolower(trim($input['code'] ?? ''));
    if (!preg_match('/^[a-z0-9_-]{2,30}$/', $code)) {
      jsonResponse(['ok' => false, 'message' => 'كود الباقة يجب أن يكون حروف إنجليزية صغيرة/أرقام (2-30 حرف)'], 400);
    }
  }

  return [$code, $name, $price];
}

/* ══════════════════════════════════════
   ADMIN: list all packages (incl. inactive) with ids — GET ?admin=1
   (same convention as api/slots.php)
═══════════════════════════════════════ */
if (($method === 'GET' || $method === 'HEAD') && ($_GET['admin'] ?? '') === '1') {
  requireAdmin();
  $stmt = $pdo->query('SELECT * FROM packages ORDER BY sort_order, id');
  jsonResponse(['ok' => true, 'packages' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

/* ══════════════════════════════════════
   PUBLIC: packages + car types + branches + payment methods
═══════════════════════════════════════ */
if ($method === 'GET' || $method === 'HEAD') {
  $stmt = $pdo->query('SELECT code, name, price FROM packages WHERE is_active = 1 ORDER BY sort_order, id');
  $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);

  jsonResponse([
    'ok' => true,
    'packages' => $packages,
    'carTypes' => $config['carTypes'],
    'branches' => $config['branches'],
    'paymentMethods' => $config['paymentMethods'],
    'instapayNumber' => $config['instapayNumber'],
  ]);
}

/* ══════════════════════════════════════
   ADMIN: create package
═══════════════════════════════════════ */
if ($method === 'POST') {
  requireAdmin();
  validateCsrfToken();

  [$code, $name, $price] = validatePackageInput($input, true);
  $adminId = $_SESSION['admin_id'] ?? null;
  $now     = date('c');

  $maxSort = (int)($pdo->query('SELECT COALESCE(MAX(sort_order), -1) FROM packages')->fetchColumn());

  try {
    $stmt = $pdo->prepare('
      INSERT INTO packages (code, name, price, is_active, sort_order, created_at)
      VALUES (:code, :name, :price, 1, :sort, :now)
    ');
    $stmt->execute([
      ':code' => $code, ':name' => $name, ':price' => $price,
      ':sort' => $maxSort + 1, ':now' => $now,
    ]);
  } catch (Exception $e) {
    jsonResponse(['ok' => false, 'message' => 'كود الباقة موجود مسبقاً'], 409);
  }

  $id = (int)$pdo->lastInsertId();
  logAudit($pdo, 'admin', $adminId, 'package.created', 'package', $id, ['code' => $code, 'price' => $price]);

  jsonResponse(['ok' => true, 'id' => $id], 201);
}

/* ══════════════════════════════════════
   ADMIN: edit package (name/price/sort_order/is_active only — code is immutable)
═══════════════════════════════════════ */
if ($method === 'PATCH') {
  requireAdmin();
  validateCsrfToken();

  $id = (int)($input['id'] ?? 0);
  if (!$id) jsonResponse(['ok' => false, 'message' => 'ID مطلوب'], 400);

  $fields = [];
  $params = [':id' => $id];

  if (array_key_exists('name', $input) || array_key_exists('price', $input)) {
    [, $name, $price] = validatePackageInput($input, false);
    $fields[] = 'name = :name'; $params[':name'] = $name;
    $fields[] = 'price = :price'; $params[':price'] = $price;
  }
  if (array_key_exists('is_active', $input)) {
    $fields[] = 'is_active = :active'; $params[':active'] = (int)(bool)$input['is_active'];
  }
  if (array_key_exists('sort_order', $input)) {
    $fields[] = 'sort_order = :sort'; $params[':sort'] = (int)$input['sort_order'];
  }

  if (!$fields) jsonResponse(['ok' => false, 'message' => 'لا يوجد تعديل محدد'], 400);

  $pdo->prepare('UPDATE packages SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);

  logAudit($pdo, 'admin', $_SESSION['admin_id'] ?? null, 'package.updated', 'package', $id, $input);

  jsonResponse(['ok' => true]);
}

/* ══════════════════════════════════════
   ADMIN: deactivate package (soft-delete — historical bookings keep their own snapshot)
═══════════════════════════════════════ */
if ($method === 'DELETE') {
  requireAdmin();
  validateCsrfToken();

  $id = (int)($input['id'] ?? 0);
  if (!$id) jsonResponse(['ok' => false, 'message' => 'ID مطلوب'], 400);

  $pdo->prepare('UPDATE packages SET is_active = 0 WHERE id = :id')->execute([':id' => $id]);

  logAudit($pdo, 'admin', $_SESSION['admin_id'] ?? null, 'package.deactivated', 'package', $id, []);

  jsonResponse(['ok' => true]);
}

jsonResponse(['ok' => false, 'message' => 'Method not allowed'], 405);
