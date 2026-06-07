<?php
require_once __DIR__ . '/bootstrap.php';

startSession();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  checkRateLimit($pdo, 'admin_login', 5, 600); // 5 محاولات / 10 دقايق
  $username = trim($input['username'] ?? '');
  $password = trim($input['password'] ?? '');

  if (!$username || !$password) {
    jsonResponse(['ok' => false, 'message' => 'اسم المستخدم وكلمة المرور مطلوبة'], 400);
  }

  try {
    $stmt = $pdo->prepare('SELECT id, username, password_hash, is_active FROM admin_users WHERE username = :username LIMIT 1');
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !$user['is_active']) {
      jsonResponse(['ok' => false, 'message' => 'بيانات تسجيل دخول غير صحيحة'], 401);
    }

    if (!password_verify($password, $user['password_hash'])) {
      jsonResponse(['ok' => false, 'message' => 'بيانات تسجيل دخول غير صحيحة'], 401);
    }

    $oldCsrf = $_SESSION['csrf_token'] ?? null;
    session_regenerate_id(true);
    $_SESSION['admin_id'] = $user['id'];
    $_SESSION['admin_username'] = $user['username'];
    if ($oldCsrf) $_SESSION['csrf_token'] = $oldCsrf;

    $pdo->prepare('UPDATE admin_users SET last_login = :now WHERE id = :id')
      ->execute([':now' => date('c'), ':id' => $user['id']]);

    jsonResponse(['ok' => true, 'message' => 'تم تسجيل الدخول بنجاح']);
  } catch (Exception $e) {
    jsonResponse(['ok' => false, 'message' => 'خطأ في الخادم'], 500);
  }
}

if ($method === 'POST' && (json_decode(file_get_contents('php://input'), true)['action'] ?? '') === 'logout') {
  session_destroy();
  jsonResponse(['ok' => true]);
}

// Legacy GET logout
if ($method === 'GET' && ($_GET['action'] ?? '') === 'logout') {
  session_destroy();
  header('Location: /login.html');
  exit;
}

if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'check') {
  if (isset($_SESSION['admin_id'])) {
    jsonResponse([
      'ok' => true,
      'authenticated' => true,
      'username' => $_SESSION['admin_username'] ?? null
    ]);
  } else {
    jsonResponse([
      'ok' => true,
      'authenticated' => false
    ]);
  }
}

jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
