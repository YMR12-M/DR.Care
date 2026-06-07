<?php
require_once __DIR__ . '/bootstrap.php';

// Endpoint is disabled by default — must opt-in via environment variable
if (getEnvValue('DRCARE_INIT_ENABLED') !== '1') {
  jsonResponse(['ok' => false, 'message' => 'Not Found'], 404);
}

$stmt = $pdo->prepare('SELECT COUNT(*) FROM admin_users');
$stmt->execute();
$count = (int) $stmt->fetchColumn();

// If admins already exist, require admin session to view list
if ($count > 0) {
  startSession();
  requireAdmin();
  $stmt = $pdo->query('SELECT id, username, email, created_at, last_login, is_active FROM admin_users ORDER BY created_at DESC');
  jsonResponse(['ok' => true, 'admins' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'total' => $count]);
}

// No admins — create from environment (no fallback to weak defaults)
$username = getEnvValue('DRCARE_DEFAULT_ADMIN_USER', 'admin');
$password = getEnvValue('DRCARE_DEFAULT_ADMIN_PASS', '');
$email    = getEnvValue('DRCARE_NOTIFICATION_EMAIL', '');

if (!$password) {
  jsonResponse(['ok' => false, 'message' => 'DRCARE_DEFAULT_ADMIN_PASS مطلوب ولم يُضبط في .env'], 500);
}
if (!$email) {
  jsonResponse(['ok' => false, 'message' => 'DRCARE_NOTIFICATION_EMAIL مطلوب ولم يُضبط في .env'], 500);
}
if (strlen($password) < 12) {
  jsonResponse(['ok' => false, 'message' => 'DRCARE_DEFAULT_ADMIN_PASS يجب أن يكون 12 حرفاً على الأقل'], 400);
}

$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
$pdo->prepare('INSERT INTO admin_users (username, email, password_hash, created_at, is_active) VALUES (:u,:e,:h,:now,1)')
    ->execute([':u' => $username, ':e' => $email, ':h' => $hash, ':now' => date('c')]);

jsonResponse(['ok' => true, 'message' => 'تم إنشاء حساب الأدمن. أوقف DRCARE_INIT_ENABLED فوراً.']);
