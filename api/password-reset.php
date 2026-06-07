<?php
/**
 * DR.Care — Password Reset API
 *
 * POST { action: "request",  email }           → send reset email
 * POST { action: "verify",   token }           → check token validity
 * POST { action: "reset",    token, password } → set new password
 */
require_once __DIR__ . '/bootstrap.php';

startSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
}

$input  = json_decode(file_get_contents('php://input'), true) ?? [];
$action = trim($input['action'] ?? '');

/* ── helpers ── */

function makeResetToken(): string {
  return bin2hex(random_bytes(32)); // 64-char hex
}

function hashToken(string $token): string {
  return hash('sha256', $token);
}

/* ────────────────────────────────────────────────────────── REQUEST ── */
if ($action === 'request') {
  checkRateLimit($pdo, 'password_reset_request', 3, 3600);

  $email = trim($input['email'] ?? '');
  if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    // same vague message to avoid email enumeration
    jsonResponse(['ok' => true, 'message' => 'إذا كان البريد مسجلاً، ستصل رسالة إعادة التعيين خلال دقائق.']);
  }

  $stmt = $pdo->prepare('SELECT id, name FROM customer_users WHERE email = :email AND is_active = 1 LIMIT 1');
  $stmt->execute([':email' => $email]);
  $customer = $stmt->fetch(PDO::FETCH_ASSOC);

  if ($customer) {
    // Invalidate old unused tokens for this customer
    $pdo->prepare('UPDATE password_resets SET used = 1 WHERE customer_id = :id AND used = 0')
        ->execute([':id' => $customer['id']]);

    $token     = makeResetToken();
    $tokenHash = hashToken($token);
    $expiresAt = date('c', time() + 3600); // 1 hour

    $pdo->prepare('INSERT INTO password_resets (customer_id, token_hash, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)')
        ->execute([$customer['id'], $tokenHash, $expiresAt, date('c')]);

    $appOrigin = getEnvValue('DRCARE_APP_ORIGIN', 'http://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    $resetUrl  = rtrim($appOrigin, '/') . '/reset-password.html?token=' . urlencode($token);
    $name      = $customer['name'];

    $body = <<<TEXT
مرحباً $name،

طلبت إعادة تعيين كلمة المرور الخاصة بحسابك على DR.Care.

اضغط على الرابط التالي لإعادة التعيين (الرابط صالح لمدة ساعة واحدة):
$resetUrl

إن لم تكن طلبت ذلك، تجاهل هذه الرسالة وستظل كلمة مرورك كما هي.

DR.Care — مغسلة عربيات مصرية
TEXT;

    sendEmail($email, 'DR.Care — إعادة تعيين كلمة المرور', $body);
  }

  // Always respond the same way
  jsonResponse(['ok' => true, 'message' => 'إذا كان البريد مسجلاً، ستصل رسالة إعادة التعيين خلال دقائق.']);
}

/* ────────────────────────────────────────────────────────── VERIFY ── */
if ($action === 'verify') {
  $token = trim($input['token'] ?? '');
  if (strlen($token) !== 64) {
    jsonResponse(['ok' => false, 'message' => 'رابط غير صالح.'], 400);
  }

  $tokenHash = hashToken($token);
  $stmt = $pdo->prepare("
    SELECT pr.id, cu.email
    FROM password_resets pr
    JOIN customer_users cu ON cu.id = pr.customer_id
    WHERE pr.token_hash = :h
      AND pr.used = 0
      AND pr.expires_at > datetime('now')
    LIMIT 1
  ");
  $stmt->execute([':h' => $tokenHash]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$row) {
    jsonResponse(['ok' => false, 'message' => 'الرابط منتهي الصلاحية أو استُخدم من قبل.'], 400);
  }

  // Mask email: a***@domain.com
  $parts = explode('@', $row['email'], 2);
  $masked = substr($parts[0], 0, 1) . str_repeat('*', max(3, strlen($parts[0]) - 1)) . '@' . $parts[1];

  jsonResponse(['ok' => true, 'email' => $masked]);
}

/* ──────────────────────────────────────────────────────────── RESET ── */
if ($action === 'reset') {
  checkRateLimit($pdo, 'password_reset_do', 5, 3600);

  $token    = trim($input['token'] ?? '');
  $password = $input['password'] ?? '';

  if (strlen($token) !== 64) {
    jsonResponse(['ok' => false, 'message' => 'رابط غير صالح.'], 400);
  }

  if (strlen($password) < 6) {
    jsonResponse(['ok' => false, 'message' => 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'], 400);
  }

  $tokenHash = hashToken($token);
  $stmt = $pdo->prepare("
    SELECT pr.id AS reset_id, pr.customer_id
    FROM password_resets pr
    WHERE pr.token_hash = :h
      AND pr.used = 0
      AND pr.expires_at > datetime('now')
    LIMIT 1
  ");
  $stmt->execute([':h' => $tokenHash]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$row) {
    jsonResponse(['ok' => false, 'message' => 'الرابط منتهي الصلاحية أو استُخدم من قبل.'], 400);
  }

  $newHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);

  $pdo->prepare('UPDATE customer_users SET password_hash = ? WHERE id = ?')
      ->execute([$newHash, $row['customer_id']]);

  $pdo->prepare('UPDATE password_resets SET used = 1 WHERE id = ?')
      ->execute([$row['reset_id']]);

  // Invalidate all other unused tokens for this customer
  $pdo->prepare('UPDATE password_resets SET used = 1 WHERE customer_id = ? AND used = 0')
      ->execute([$row['customer_id']]);

  jsonResponse(['ok' => true, 'message' => 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.']);
}

jsonResponse(['ok' => false, 'message' => 'إجراء غير معروف.'], 400);
