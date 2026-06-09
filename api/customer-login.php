<?php
require_once __DIR__ . '/bootstrap.php';

startSession();

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $input['action'] ?? '';

/* ── helper: send verification email ── */
function sendVerificationEmail(string $email, string $name, string $token): void {
  $appOrigin = getEnvValue('DRCARE_APP_ORIGIN', 'http://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
  $url       = rtrim($appOrigin, '/') . '/verify-email.html?token=' . urlencode($token);
  $body      = <<<TEXT
مرحباً {$name}،

أهلاً بك في DR.Care! لتفعيل بريدك الإلكتروني اضغط على الرابط التالي (صالح 24 ساعة):
{$url}

إذا لم تسجل في DR.Care، تجاهل هذه الرسالة.

DR.Care — مغسلة عربيات مصرية
TEXT;
  sendEmail($email, 'DR.Care — تفعيل البريد الإلكتروني', $body);
}

if ($method === 'POST') {
  if ($action === 'register') {
    checkRateLimit($pdo, 'customer_register', 3, 3600); // 3 محاولات / ساعة
    // Customer Registration
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $password = trim($input['password'] ?? '');

    if (!$name || !preg_match('/^[\p{L}\s]{2,80}$/u', $name)) {
      jsonResponse(['ok' => false, 'message' => 'الاسم غير صالح'], 400);
    }

    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
      jsonResponse(['ok' => false, 'message' => 'البريد الإلكتروني غير صالح'], 400);
    }

    if (!preg_match('/^01[0125][0-9]{8}$/', $phone)) {
      jsonResponse(['ok' => false, 'message' => 'رقم الموبايل غير صحيح'], 400);
    }

    if (strlen($password) < 6) {
      jsonResponse(['ok' => false, 'message' => 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'], 400);
    }

    try {
      // Check if email exists
      $stmt = $pdo->prepare('SELECT id FROM customer_users WHERE email = :email LIMIT 1');
      $stmt->execute([':email' => $email]);
      if ($stmt->fetch()) {
        jsonResponse(['ok' => false, 'message' => 'البريد الإلكتروني مسجل بالفعل'], 409);
      }

      $hash           = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
      $verifyToken    = bin2hex(random_bytes(32));
      $verifyExp      = date('c', time() + 86400); // 24h
      $myReferralCode = generateUniqueReferralCode($pdo);

      // Validate incoming referral code
      $referralCode = strtoupper(trim($input['referral_code'] ?? ''));
      $referrerId   = null;
      if ($referralCode) {
        $refStmt = $pdo->prepare('SELECT id FROM customer_users WHERE referral_code = :c AND is_active = 1 LIMIT 1');
        $refStmt->execute([':c' => $referralCode]);
        $refRow = $refStmt->fetch(PDO::FETCH_ASSOC);
        if ($refRow) $referrerId = (int)$refRow['id'];
      }

      $stmt = $pdo->prepare('INSERT INTO customer_users (name, email, phone, password_hash, created_at, email_verified, email_verify_token, email_verify_expires, referral_code, referred_by_id) VALUES (:name, :email, :phone, :hash, :now, 0, :token, :exp, :rcode, :refby)');
      $stmt->execute([
        ':name'  => $name,
        ':email' => $email,
        ':phone' => $phone,
        ':hash'  => $hash,
        ':now'   => date('c'),
        ':token' => $verifyToken,
        ':exp'   => $verifyExp,
        ':rcode' => $myReferralCode,
        ':refby' => $referrerId,
      ]);

      session_regenerate_id(true);
      $customerId = (int)$pdo->lastInsertId();
      $_SESSION['customer_id']    = $customerId;
      $_SESSION['customer_email'] = $email;
      $_SESSION['customer_name']  = $name;

      if ($referrerId) {
        $pdo->prepare('INSERT INTO referrals (referrer_id, referred_id, created_at) VALUES (?, ?, ?)')
            ->execute([$referrerId, $customerId, date('c')]);
      }

      sendVerificationEmail($email, $name, $verifyToken);

      jsonResponse(['ok' => true, 'message' => 'تم إنشاء الحساب بنجاح! تحقق من بريدك لتفعيل حسابك.']);
    } catch (Exception $e) {
      jsonResponse(['ok' => false, 'message' => 'خطأ في الخادم'], 500);
    }
  }

  if ($action === 'login') {
    checkRateLimit($pdo, 'customer_login', 5, 300); // 5 محاولات / 5 دقايق
    // Customer Login
    $email = trim($input['email'] ?? '');
    $password = trim($input['password'] ?? '');

    if (!$email || !$password) {
      jsonResponse(['ok' => false, 'message' => 'البريد الإلكتروني وكلمة المرور مطلوبة'], 400);
    }

    try {
      $stmt = $pdo->prepare('SELECT id, name, email, phone, password_hash, is_active FROM customer_users WHERE email = :email LIMIT 1');
      $stmt->execute([':email' => $email]);
      $customer = $stmt->fetch(PDO::FETCH_ASSOC);

      if (!$customer || !$customer['is_active']) {
        jsonResponse(['ok' => false, 'message' => 'بيانات تسجيل دخول غير صحيحة'], 401);
      }

      if (!password_verify($password, $customer['password_hash'])) {
        jsonResponse(['ok' => false, 'message' => 'بيانات تسجيل دخول غير صحيحة'], 401);
      }

      session_regenerate_id(true);
      $_SESSION['customer_id']    = $customer['id'];
      $_SESSION['customer_email'] = $customer['email'];
      $_SESSION['customer_name']  = $customer['name'];
      $_SESSION['customer_phone'] = $customer['phone'] ?? null;

      $pdo->prepare('UPDATE customer_users SET last_login = :now WHERE id = :id')
        ->execute([':now' => date('c'), ':id' => $customer['id']]);

      jsonResponse(['ok' => true, 'message' => 'تم تسجيل الدخول بنجاح']);
    } catch (Exception $e) {
      jsonResponse(['ok' => false, 'message' => 'خطأ في الخادم'], 500);
    }
  }
}

if ($method === 'POST' && $action === 'verify_email') {
  $token = trim($input['token'] ?? '');
  if (strlen($token) !== 64) {
    jsonResponse(['ok' => false, 'message' => 'رابط غير صالح.'], 400);
  }
  $stmt = $pdo->prepare("SELECT id, name FROM customer_users WHERE email_verify_token = :t AND email_verified = 0 AND email_verify_expires > datetime('now') LIMIT 1");
  $stmt->execute([':t' => $token]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row) {
    jsonResponse(['ok' => false, 'message' => 'الرابط منتهي الصلاحية أو البريد مفعّل بالفعل.'], 400);
  }
  $pdo->prepare('UPDATE customer_users SET email_verified = 1, email_verify_token = NULL, email_verify_expires = NULL WHERE id = :id')
      ->execute([':id' => $row['id']]);
  jsonResponse(['ok' => true, 'message' => 'تم تفعيل بريدك الإلكتروني بنجاح! ✓']);
}

if ($method === 'POST' && $action === 'resend_verification') {
  checkRateLimit($pdo, 'resend_verification', 2, 3600);
  if (!isset($_SESSION['customer_id'])) {
    jsonResponse(['ok' => false, 'message' => 'سجّل دخولك أولاً.'], 401);
  }
  $stmt = $pdo->prepare('SELECT email, name, email_verified FROM customer_users WHERE id = :id LIMIT 1');
  $stmt->execute([':id' => (int)$_SESSION['customer_id']]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row || $row['email_verified']) {
    jsonResponse(['ok' => true, 'message' => 'البريد مفعّل بالفعل.']);
  }
  $token = bin2hex(random_bytes(32));
  $exp   = date('c', time() + 86400);
  $pdo->prepare('UPDATE customer_users SET email_verify_token = :t, email_verify_expires = :e WHERE id = :id')
      ->execute([':t' => $token, ':e' => $exp, ':id' => (int)$_SESSION['customer_id']]);
  sendVerificationEmail($row['email'], $row['name'], $token);
  jsonResponse(['ok' => true, 'message' => 'تم إرسال رسالة التفعيل مرة أخرى. تحقق من بريدك.']);
}

if ($method === 'POST' && $action === 'logout') {
  session_destroy();
  jsonResponse(['ok' => true]);
}

// Legacy GET logout — deprecated, kept for backwards compat
if ($method === 'GET' && ($_GET['action'] ?? '') === 'logout') {
  session_destroy();
  header('Location: /mobile-bookings.html');
  exit;
}

if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'check') {
  if (isset($_SESSION['customer_id'])) {
    $stmt = $pdo->prepare('SELECT email_verified, phone FROM customer_users WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => (int)$_SESSION['customer_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    jsonResponse([
      'ok'             => true,
      'authenticated'  => true,
      'name'           => $_SESSION['customer_name']  ?? null,
      'email'          => $_SESSION['customer_email'] ?? null,
      'phone'          => $row['phone'] ?? ($_SESSION['customer_phone'] ?? null),
      'email_verified' => (bool)($row['email_verified'] ?? false),
    ]);
  } else {
    jsonResponse(['ok' => true, 'authenticated' => false]);
  }
}

jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
