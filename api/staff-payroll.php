<?php
// DR.Care — Staff payroll: base salary + bonuses / deductions
require_once __DIR__ . '/bootstrap.php';
startSession();
requireAdmin();

$method = $_SERVER['REQUEST_METHOD'];
$input  = json_decode(file_get_contents('php://input'), true) ?? [];

/* ══════════════════════════════════════
   GET ?staff_id=X — profile: salary + entries + totals
═══════════════════════════════════════ */
if ($method === 'GET') {
  $staffId = (int)($_GET['staff_id'] ?? 0);
  if (!$staffId) jsonResponse(['ok' => false, 'message' => 'staff_id مطلوب'], 400);

  $stmt = $pdo->prepare('SELECT id, name, phone, role, salary, is_active, created_at FROM staff WHERE id = :id LIMIT 1');
  $stmt->execute([':id' => $staffId]);
  $staff = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$staff) jsonResponse(['ok' => false, 'message' => 'الموظف غير موجود'], 404);

  $stmt = $pdo->prepare('SELECT id, type, amount, note, created_at FROM staff_payroll WHERE staff_id = :id ORDER BY id DESC');
  $stmt->execute([':id' => $staffId]);
  $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $bonus = 0.0; $deduction = 0.0;
  foreach ($entries as $e) {
    if ($e['type'] === 'bonus') $bonus += (float)$e['amount'];
    else $deduction += (float)$e['amount'];
  }

  jsonResponse([
    'ok'      => true,
    'staff'   => $staff,
    'entries' => $entries,
    'totals'  => [
      'salary'    => (float)$staff['salary'],
      'bonus'     => $bonus,
      'deduction' => $deduction,
      'net'       => (float)$staff['salary'] + $bonus - $deduction,
    ],
  ]);
}

/* ══════════════════════════════════════
   POST — add bonus / deduction entry
═══════════════════════════════════════ */
if ($method === 'POST') {
  validateCsrfToken();

  $staffId = (int)($input['staff_id'] ?? 0);
  $type    = trim($input['type'] ?? '');
  $amount  = (float)($input['amount'] ?? 0);
  $note    = trim($input['note'] ?? '');

  if (!$staffId) jsonResponse(['ok' => false, 'message' => 'staff_id مطلوب'], 400);
  if (!in_array($type, ['bonus', 'deduction'], true)) {
    jsonResponse(['ok' => false, 'message' => 'النوع يجب أن يكون بونص أو خصم'], 400);
  }
  if ($amount <= 0 || $amount > 1000000) {
    jsonResponse(['ok' => false, 'message' => 'المبلغ غير صالح'], 400);
  }
  if (mb_strlen($note) > 200) {
    jsonResponse(['ok' => false, 'message' => 'الملاحظة طويلة جداً (200 حرف كحد أقصى)'], 400);
  }

  $stmt = $pdo->prepare('SELECT id FROM staff WHERE id = :id LIMIT 1');
  $stmt->execute([':id' => $staffId]);
  if (!$stmt->fetch()) jsonResponse(['ok' => false, 'message' => 'الموظف غير موجود'], 404);

  $pdo->prepare('INSERT INTO staff_payroll (staff_id, type, amount, note, created_at) VALUES (:sid, :type, :amount, :note, :now)')
      ->execute([':sid' => $staffId, ':type' => $type, ':amount' => $amount, ':note' => $note ?: null, ':now' => date('c')]);

  logAudit($pdo, 'admin', $_SESSION['admin_id'] ?? null, "payroll.{$type}_added", 'staff', $staffId, ['amount' => $amount, 'note' => $note]);

  jsonResponse(['ok' => true, 'message' => $type === 'bonus' ? 'تم إضافة البونص' : 'تم تسجيل الخصم'], 201);
}

/* ══════════════════════════════════════
   PATCH — update base salary
═══════════════════════════════════════ */
if ($method === 'PATCH') {
  validateCsrfToken();

  $staffId = (int)($input['staff_id'] ?? 0);
  if (!$staffId) jsonResponse(['ok' => false, 'message' => 'staff_id مطلوب'], 400);
  if (!array_key_exists('salary', $input)) jsonResponse(['ok' => false, 'message' => 'المرتب مطلوب'], 400);

  $salary = (float)$input['salary'];
  if ($salary < 0 || $salary > 1000000) jsonResponse(['ok' => false, 'message' => 'قيمة المرتب غير صالحة'], 400);

  $stmt = $pdo->prepare('UPDATE staff SET salary = :salary WHERE id = :id');
  $stmt->execute([':salary' => $salary, ':id' => $staffId]);
  if (!$stmt->rowCount()) jsonResponse(['ok' => false, 'message' => 'الموظف غير موجود'], 404);

  logAudit($pdo, 'admin', $_SESSION['admin_id'] ?? null, 'payroll.salary_updated', 'staff', $staffId, ['salary' => $salary]);

  jsonResponse(['ok' => true, 'message' => 'تم حفظ المرتب']);
}

/* ══════════════════════════════════════
   DELETE — remove a payroll entry
═══════════════════════════════════════ */
if ($method === 'DELETE') {
  validateCsrfToken();

  $id = (int)($input['id'] ?? 0);
  if (!$id) jsonResponse(['ok' => false, 'message' => 'ID مطلوب'], 400);

  $stmt = $pdo->prepare('SELECT staff_id, type, amount FROM staff_payroll WHERE id = :id LIMIT 1');
  $stmt->execute([':id' => $id]);
  $entry = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$entry) jsonResponse(['ok' => false, 'message' => 'السجل غير موجود'], 404);

  $pdo->prepare('DELETE FROM staff_payroll WHERE id = :id')->execute([':id' => $id]);

  logAudit($pdo, 'admin', $_SESSION['admin_id'] ?? null, 'payroll.entry_deleted', 'staff', (int)$entry['staff_id'], $entry);

  jsonResponse(['ok' => true, 'message' => 'تم حذف السجل']);
}

jsonResponse(['ok' => false, 'message' => 'Method not allowed'], 405);
