<?php
require_once __DIR__ . '/bootstrap.php';
startSession();

$method = $_SERVER['REQUEST_METHOD'];
$input  = json_decode(file_get_contents('php://input'), true) ?? [];
$config = require __DIR__ . '/config.php';
$validCategories = array_column($config['expenseCategories'], 'code');

function validateExpenseInput(array $input, array $validCategories): array {
  $category = trim($input['category'] ?? '');
  $amount   = (float)($input['amount'] ?? 0);
  $date     = trim($input['expense_date'] ?? '');
  $note     = trim($input['note'] ?? '');

  if (!in_array($category, $validCategories, true)) {
    jsonResponse(['ok' => false, 'message' => 'فئة المصروف غير صالحة'], 400);
  }
  if ($amount <= 0) {
    jsonResponse(['ok' => false, 'message' => 'المبلغ غير صالح'], 400);
  }
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    jsonResponse(['ok' => false, 'message' => 'صيغة التاريخ غير صحيحة'], 400);
  }
  if ($note && mb_strlen($note) > 300) {
    jsonResponse(['ok' => false, 'message' => 'الملاحظة طويلة جداً'], 400);
  }

  return [$category, $amount, $date, $note ?: null];
}

/* ══════════════════════════════════════
   ADMIN: list expenses (bounded by month)
═══════════════════════════════════════ */
if ($method === 'GET') {
  requireAdmin();

  $month = trim($_GET['month'] ?? '');
  if ($month === 'all') {
    $stmt = $pdo->query('SELECT * FROM expenses ORDER BY expense_date DESC, id DESC');
  } else {
    if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
      $month = date('Y-m');
    }
    $stmt = $pdo->prepare("SELECT * FROM expenses WHERE expense_date LIKE :prefix ORDER BY expense_date DESC, id DESC");
    $stmt->execute([':prefix' => $month . '%']);
  }

  jsonResponse(['ok' => true, 'expenses' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'month' => $month]);
}

/* ══════════════════════════════════════
   ADMIN: create expense
═══════════════════════════════════════ */
if ($method === 'POST') {
  requireAdmin();
  validateCsrfToken();

  [$category, $amount, $date, $note] = validateExpenseInput($input, $validCategories);
  $adminId = $_SESSION['admin_id'] ?? null;
  $now     = date('c');

  $stmt = $pdo->prepare('
    INSERT INTO expenses (category, amount, expense_date, note, created_by, created_at)
    VALUES (:category, :amount, :date, :note, :by, :now)
  ');
  $stmt->execute([
    ':category' => $category, ':amount' => $amount, ':date' => $date,
    ':note' => $note, ':by' => $adminId, ':now' => $now,
  ]);
  $id = (int)$pdo->lastInsertId();

  logAudit($pdo, 'admin', $adminId, 'expense.created', 'expense', $id, [
    'category' => $category, 'amount' => $amount, 'date' => $date,
  ]);

  jsonResponse(['ok' => true, 'id' => $id], 201);
}

/* ══════════════════════════════════════
   ADMIN: edit expense
═══════════════════════════════════════ */
if ($method === 'PATCH') {
  requireAdmin();
  validateCsrfToken();

  $id = (int)($input['id'] ?? 0);
  if (!$id) jsonResponse(['ok' => false, 'message' => 'ID مطلوب'], 400);

  [$category, $amount, $date, $note] = validateExpenseInput($input, $validCategories);
  $adminId = $_SESSION['admin_id'] ?? null;

  $pdo->prepare('
    UPDATE expenses SET category = :category, amount = :amount, expense_date = :date, note = :note
    WHERE id = :id
  ')->execute([
    ':category' => $category, ':amount' => $amount, ':date' => $date,
    ':note' => $note, ':id' => $id,
  ]);

  logAudit($pdo, 'admin', $adminId, 'expense.updated', 'expense', $id, [
    'category' => $category, 'amount' => $amount, 'date' => $date,
  ]);

  jsonResponse(['ok' => true]);
}

/* ══════════════════════════════════════
   ADMIN: delete expense
═══════════════════════════════════════ */
if ($method === 'DELETE') {
  requireAdmin();
  validateCsrfToken();

  $id = (int)($input['id'] ?? 0);
  if (!$id) jsonResponse(['ok' => false, 'message' => 'ID مطلوب'], 400);

  $pdo->prepare('DELETE FROM expenses WHERE id = :id')->execute([':id' => $id]);

  logAudit($pdo, 'admin', $_SESSION['admin_id'] ?? null, 'expense.deleted', 'expense', $id, []);

  jsonResponse(['ok' => true]);
}

jsonResponse(['ok' => false, 'message' => 'Method not allowed'], 405);
