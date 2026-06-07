<?php
require_once __DIR__ . '/bootstrap.php';
startSession();
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
}

$dbFile    = __DIR__ . '/../data/drcare.db';
$backupDir = __DIR__ . '/../data/backups';

if (!is_file($dbFile)) {
  jsonResponse(['ok' => false, 'message' => 'ملف قاعدة البيانات غير موجود'], 500);
}
if (!is_dir($backupDir) && !@mkdir($backupDir, 0750, true)) {
  jsonResponse(['ok' => false, 'message' => 'تعذر إنشاء مجلد النسخ الاحتياطية'], 500);
}

$filename   = 'drcare-' . date('Y-m-d-His') . '.db';
$backupPath = $backupDir . '/' . $filename;

if (!copy($dbFile, $backupPath)) {
  jsonResponse(['ok' => false, 'message' => 'فشل إنشاء النسخة الاحتياطية'], 500);
}

// Retain only the last 15 backups
$files = glob($backupDir . '/drcare-*.db') ?: [];
if (count($files) > 15) {
  sort($files);
  foreach (array_slice($files, 0, count($files) - 15) as $old) {
    @unlink($old);
  }
}

logAudit($pdo, 'admin', $_SESSION['admin_id'] ?? null, 'backup.created', 'system', null, ['file' => $filename]);

jsonResponse(['ok' => true, 'message' => 'تم إنشاء النسخة الاحتياطية بنجاح', 'file' => $filename]);
