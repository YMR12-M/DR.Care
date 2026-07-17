<?php
require_once __DIR__ . '/bootstrap.php';
startSession();

$method = $_SERVER['REQUEST_METHOD'];
$input  = json_decode(file_get_contents('php://input'), true) ?? [];

function validateRevenueInput(array $input): array {
  $date           = trim($input['log_date'] ?? '');
  $carsCount      = (int)($input['cars_count']      ?? 0);
  $carsAmount     = (float)($input['cars_amount']    ?? 0);
  $carpetsCount   = (int)($input['carpets_count']    ?? 0);
  $carpetsAmount  = (float)($input['carpets_amount'] ?? 0);
  $blanketsCount  = (int)($input['blankets_count']   ?? 0);
  $blanketsAmount = (float)($input['blankets_amount']?? 0);
  $note           = trim($input['note'] ?? '');

  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    jsonResponse(['ok' => false, 'message' => 'صيغة التاريخ غير صحيحة'], 400);
  }
  foreach ([$carsCount, $carpetsCount, $blanketsCount] as $c) {
    if ($c < 0) jsonResponse(['ok' => false, 'message' => 'العدد غير صالح'], 400);
  }
  foreach ([$carsAmount, $carpetsAmount, $blanketsAmount] as $a) {
    if ($a < 0) jsonResponse(['ok' => false, 'message' => 'المبلغ غير صالح'], 400);
  }
  if (!$carsCount && !$carpetsCount && !$blanketsCount && !$carsAmount && !$carpetsAmount && !$blanketsAmount) {
    jsonResponse(['ok' => false, 'message' => 'أدخل بيانات سجل واحدة على الأقل'], 400);
  }
  if ($note && mb_strlen($note) > 300) {
    jsonResponse(['ok' => false, 'message' => 'الملاحظة طويلة جداً'], 400);
  }

  $totalAmount = round($carsAmount + $carpetsAmount + $blanketsAmount, 2);

  return [$date, $carsCount, $carsAmount, $carpetsCount, $carpetsAmount, $blanketsCount, $blanketsAmount, $totalAmount, $note ?: null];
}

/* ══════════════════════════════════════
   ADMIN: list revenue logs (bounded by month)
═══════════════════════════════════════ */
if ($method === 'GET') {
  requireAdmin();

  $month = trim($_GET['month'] ?? '');
  if ($month === 'all') {
    $stmt = $pdo->query('SELECT * FROM revenue_logs ORDER BY log_date DESC, id DESC');
  } else {
    if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
      $month = date('Y-m');
    }
    $stmt = $pdo->prepare("SELECT * FROM revenue_logs WHERE log_date LIKE :prefix ORDER BY log_date DESC, id DESC");
    $stmt->execute([':prefix' => $month . '%']);
  }

  jsonResponse(['ok' => true, 'logs' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'month' => $month]);
}

/* ══════════════════════════════════════
   ADMIN: create revenue log entry
═══════════════════════════════════════ */
if ($method === 'POST') {
  requireAdmin();
  validateCsrfToken();

  [$date, $carsCount, $carsAmount, $carpetsCount, $carpetsAmount, $blanketsCount, $blanketsAmount, $totalAmount, $note] = validateRevenueInput($input);
  $adminId = $_SESSION['admin_id'] ?? null;
  $now     = date('c');

  $stmt = $pdo->prepare('
    INSERT INTO revenue_logs
      (log_date, cars_count, cars_amount, carpets_count, carpets_amount, blankets_count, blankets_amount, total_amount, note, created_by, created_at)
    VALUES
      (:date, :cc, :ca, :pc, :pa, :bc, :ba, :total, :note, :by, :now)
  ');
  $stmt->execute([
    ':date' => $date, ':cc' => $carsCount, ':ca' => $carsAmount,
    ':pc' => $carpetsCount, ':pa' => $carpetsAmount,
    ':bc' => $blanketsCount, ':ba' => $blanketsAmount,
    ':total' => $totalAmount, ':note' => $note, ':by' => $adminId, ':now' => $now,
  ]);
  $id = (int)$pdo->lastInsertId();

  logAudit($pdo, 'admin', $adminId, 'revenue.created', 'revenue_log', $id, [
    'date' => $date, 'total_amount' => $totalAmount,
  ]);

  jsonResponse(['ok' => true, 'id' => $id], 201);
}

/* ══════════════════════════════════════
   ADMIN: edit revenue log entry
═══════════════════════════════════════ */
if ($method === 'PATCH') {
  requireAdmin();
  validateCsrfToken();

  $id = (int)($input['id'] ?? 0);
  if (!$id) jsonResponse(['ok' => false, 'message' => 'ID مطلوب'], 400);

  [$date, $carsCount, $carsAmount, $carpetsCount, $carpetsAmount, $blanketsCount, $blanketsAmount, $totalAmount, $note] = validateRevenueInput($input);
  $adminId = $_SESSION['admin_id'] ?? null;

  $pdo->prepare('
    UPDATE revenue_logs SET
      log_date = :date, cars_count = :cc, cars_amount = :ca,
      carpets_count = :pc, carpets_amount = :pa,
      blankets_count = :bc, blankets_amount = :ba,
      total_amount = :total, note = :note
    WHERE id = :id
  ')->execute([
    ':date' => $date, ':cc' => $carsCount, ':ca' => $carsAmount,
    ':pc' => $carpetsCount, ':pa' => $carpetsAmount,
    ':bc' => $blanketsCount, ':ba' => $blanketsAmount,
    ':total' => $totalAmount, ':note' => $note, ':id' => $id,
  ]);

  logAudit($pdo, 'admin', $adminId, 'revenue.updated', 'revenue_log', $id, [
    'date' => $date, 'total_amount' => $totalAmount,
  ]);

  jsonResponse(['ok' => true]);
}

/* ══════════════════════════════════════
   ADMIN: delete revenue log entry
═══════════════════════════════════════ */
if ($method === 'DELETE') {
  requireAdmin();
  validateCsrfToken();

  $id = (int)($input['id'] ?? 0);
  if (!$id) jsonResponse(['ok' => false, 'message' => 'ID مطلوب'], 400);

  $pdo->prepare('DELETE FROM revenue_logs WHERE id = :id')->execute([':id' => $id]);

  logAudit($pdo, 'admin', $_SESSION['admin_id'] ?? null, 'revenue.deleted', 'revenue_log', $id, []);

  jsonResponse(['ok' => true]);
}

jsonResponse(['ok' => false, 'message' => 'Method not allowed'], 405);
