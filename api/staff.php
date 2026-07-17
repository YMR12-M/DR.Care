<?php
require_once __DIR__ . '/bootstrap.php';
startSession();
requireAdmin();

$method = $_SERVER['REQUEST_METHOD'];
$input  = json_decode(file_get_contents('php://input'), true) ?? [];

/* ══════════════════════════════════════
   ADMIN: list staff + total salaries tagged to each
═══════════════════════════════════════ */
if ($method === 'GET') {
  $stmt = $pdo->query('
    SELECT
      s.id, s.name, s.phone, s.role, s.is_active, s.created_at,
      COALESCE(SUM(e.amount), 0) AS total_expenses,
      COUNT(e.id) AS expense_count
    FROM staff s
    LEFT JOIN expenses e ON e.staff_id = s.id
    GROUP BY s.id
    ORDER BY s.is_active DESC, s.created_at DESC
  ');
  jsonResponse(['ok' => true, 'staff' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

/* ══════════════════════════════════════
   ADMIN: create staff member
═══════════════════════════════════════ */
if ($method === 'POST') {
  validateCsrfToken();

  $name  = trim($input['name']  ?? '');
  $phone = trim($input['phone'] ?? '');
  $role  = trim($input['role']  ?? '');

  if (!$name || !preg_match('/^[\p{L}\s]{2,80}$/u', $name)) {
    jsonResponse(['ok' => false, 'message' => 'اسم غير صالح'], 400);
  }
  if ($phone && !preg_match('/^01[0125][0-9]{8}$/', $phone)) {
    jsonResponse(['ok' => false, 'message' => 'رقم موبايل غير صالح'], 400);
  }
  if (mb_strlen($role) > 60) {
    jsonResponse(['ok' => false, 'message' => 'اسم الوظيفة طويل جداً'], 400);
  }

  $adminId = $_SESSION['admin_id'] ?? null;
  $now     = date('c');

  $stmt = $pdo->prepare('INSERT INTO staff (name, phone, role, is_active, created_at) VALUES (:name, :phone, :role, 1, :now)');
  $stmt->execute([
    ':name' => $name, ':phone' => $phone ?: null, ':role' => $role ?: null, ':now' => $now,
  ]);
  $id = (int)$pdo->lastInsertId();

  logAudit($pdo, 'admin', $adminId, 'staff.created', 'staff', $id, ['name' => $name]);

  jsonResponse(['ok' => true, 'id' => $id], 201);
}

/* ══════════════════════════════════════
   ADMIN: edit staff member
═══════════════════════════════════════ */
if ($method === 'PATCH') {
  validateCsrfToken();

  $id = (int)($input['id'] ?? 0);
  if (!$id) jsonResponse(['ok' => false, 'message' => 'ID مطلوب'], 400);

  $fields = [];
  $params = [':id' => $id];

  if (array_key_exists('name', $input)) {
    $name = trim($input['name'] ?? '');
    if (!$name || !preg_match('/^[\p{L}\s]{2,80}$/u', $name)) {
      jsonResponse(['ok' => false, 'message' => 'اسم غير صالح'], 400);
    }
    $fields[] = 'name = :name'; $params[':name'] = $name;
  }
  if (array_key_exists('phone', $input)) {
    $phone = trim($input['phone'] ?? '');
    if ($phone && !preg_match('/^01[0125][0-9]{8}$/', $phone)) {
      jsonResponse(['ok' => false, 'message' => 'رقم موبايل غير صالح'], 400);
    }
    $fields[] = 'phone = :phone'; $params[':phone'] = $phone ?: null;
  }
  if (array_key_exists('role', $input)) {
    $role = trim($input['role'] ?? '');
    if (mb_strlen($role) > 60) {
      jsonResponse(['ok' => false, 'message' => 'اسم الوظيفة طويل جداً'], 400);
    }
    $fields[] = 'role = :role'; $params[':role'] = $role ?: null;
  }
  if (array_key_exists('is_active', $input)) {
    $fields[] = 'is_active = :active'; $params[':active'] = (int)(bool)$input['is_active'];
  }

  if (!$fields) jsonResponse(['ok' => false, 'message' => 'لا يوجد تعديل محدد'], 400);

  $pdo->prepare('UPDATE staff SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);

  logAudit($pdo, 'admin', $_SESSION['admin_id'] ?? null, 'staff.updated', 'staff', $id, $input);

  jsonResponse(['ok' => true]);
}

/* ══════════════════════════════════════
   ADMIN: deactivate staff member (soft-delete)
═══════════════════════════════════════ */
if ($method === 'DELETE') {
  validateCsrfToken();

  $id = (int)($input['id'] ?? 0);
  if (!$id) jsonResponse(['ok' => false, 'message' => 'ID مطلوب'], 400);

  $pdo->prepare('UPDATE staff SET is_active = 0 WHERE id = :id')->execute([':id' => $id]);

  logAudit($pdo, 'admin', $_SESSION['admin_id'] ?? null, 'staff.deactivated', 'staff', $id, []);

  jsonResponse(['ok' => true]);
}

jsonResponse(['ok' => false, 'message' => 'Method not allowed'], 405);
