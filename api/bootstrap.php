<?php
// DR.Care — Bootstrap: DB connection, helpers
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
$allowedOrigin = null;
if (isset($_SERVER['HTTP_ORIGIN'])) {
  $origin = $_SERVER['HTTP_ORIGIN'];
  $appOrigin = getenv('DRCARE_APP_ORIGIN');
  if ($appOrigin && $origin === $appOrigin) {
    $allowedOrigin = $origin;
  } else {
    $originHost = parse_url($origin, PHP_URL_HOST);
    $currentHost = explode(':', $_SERVER['HTTP_HOST'] ?? '')[0];
    if ($originHost && $originHost === $currentHost) {
      $allowedOrigin = $origin;
    }
  }
}
if ($allowedOrigin) {
  header('Access-Control-Allow-Origin: ' . $allowedOrigin);
  header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type, Accept, X-CSRF-Token, X-POS-Token');
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

function jsonResponse($data, $status = 200) {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function loadEnv(string $path): void {
  if (!is_file($path)) {
    return;
  }

  $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  foreach ($lines as $line) {
    if (strpos(trim($line), '#') === 0) {
      continue;
    }

    [$key, $value] = array_map('trim', explode('=', $line, 2) + ['', '']);
    if ($key === '') {
      continue;
    }

    $value = trim($value, " \t\n\r\0\x0B\"'");
    if (getenv($key) === false) {
      putenv("{$key}={$value}");
      $_ENV[$key] = $value;
      $_SERVER[$key] = $value;
    }
  }
}

if (getenv('DRCARE_SKIP_ENV_FILE') !== '1') {
  loadEnv(__DIR__ . '/../.env');
}

function getEnvValue(string $name, $default = null) {
  $value = getenv($name);
  return $value === false ? $default : $value;
}

function hasColumn(PDO $pdo, string $table, string $column): bool {
  $stmt = $pdo->query("PRAGMA table_info({$table})");
  $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
  foreach ($columns as $col) {
    if (strcasecmp($col['name'], $column) === 0) {
      return true;
    }
  }
  return false;
}

function addMissingColumn(PDO $pdo, string $table, string $column, string $definition): void {
  if (!hasColumn($pdo, $table, $column)) {
    $pdo->exec("ALTER TABLE {$table} ADD COLUMN {$column} {$definition}");
  }
}

function encodeHeaderValue(string $value): string {
  return '=?UTF-8?B?' . base64_encode($value) . '?=';
}

function smtpCommand($socket, string $command, array $expectedCodes) {
  fwrite($socket, $command . "\r\n");
  $response = '';
  while (($line = fgets($socket, 512)) !== false) {
    $response .= $line;
    if (isset($line[3]) && $line[3] === ' ') {
      break;
    }
  }
  foreach ($expectedCodes as $code) {
    if (strpos($response, (string)$code) === 0) {
      return $response;
    }
  }
  return false;
}

function smtpSendMail(string $to, string $subject, string $body, string $from, string $fromName): bool {
  $host = getEnvValue('MAILER_SMTP_HOST');
  if (!$host) {
    return false;
  }

  $port = (int)getEnvValue('MAILER_SMTP_PORT', 587);
  $security = strtolower(getEnvValue('MAILER_SMTP_SECURITY', 'starttls'));
  $username = getEnvValue('MAILER_SMTP_USERNAME');
  $password = getEnvValue('MAILER_SMTP_PASSWORD');

  $remote = ($security === 'ssl') ? "ssl://{$host}:{$port}" : "tcp://{$host}:{$port}";
  $socket = @stream_socket_client($remote, $errno, $errstr, 30, STREAM_CLIENT_CONNECT);
  if (!$socket) {
    return false;
  }
  stream_set_timeout($socket, 30);

  $welcome = fgets($socket, 512);
  if (!str_starts_with($welcome, '220')) {
    fclose($socket);
    return false;
  }

  if (!smtpCommand($socket, 'EHLO ' . gethostname(), [250])) {
    fclose($socket);
    return false;
  }

  if ($security === 'starttls' || $security === 'tls') {
    if (!smtpCommand($socket, 'STARTTLS', [220])) {
      fclose($socket);
      return false;
    }
    stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
    if (!smtpCommand($socket, 'EHLO ' . gethostname(), [250])) {
      fclose($socket);
      return false;
    }
  }

  if ($username && $password) {
    if (!smtpCommand($socket, 'AUTH LOGIN', [334])) {
      fclose($socket);
      return false;
    }
    if (!smtpCommand($socket, base64_encode($username), [334])) {
      fclose($socket);
      return false;
    }
    if (!smtpCommand($socket, base64_encode($password), [235])) {
      fclose($socket);
      return false;
    }
  }

  if (!smtpCommand($socket, "MAIL FROM:<{$from}>", [250])) {
    fclose($socket);
    return false;
  }

  if (!smtpCommand($socket, "RCPT TO:<{$to}>", [250, 251])) {
    fclose($socket);
    return false;
  }

  if (!smtpCommand($socket, 'DATA', [354])) {
    fclose($socket);
    return false;
  }

  $encodedSubject = encodeHeaderValue($subject);
  $headers = [];
  $headers[] = 'From: ' . encodeHeaderValue($fromName) . ' <' . $from . '>';
  $headers[] = 'To: <' . $to . '>';
  $headers[] = 'Subject: ' . $encodedSubject;
  $headers[] = 'MIME-Version: 1.0';
  $headers[] = 'Content-Type: text/plain; charset=UTF-8';
  $headers[] = 'Content-Transfer-Encoding: 8bit';
  $headers[] = 'Date: ' . date('r');
  $headers[] = 'X-Mailer: PHP/' . phpversion();

  $message = implode("\r\n", $headers) . "\r\n\r\n" . preg_replace('/\r?\n\./', "\r\n..", $body) . "\r\n.\r\n";
  fwrite($socket, $message);

  if (!smtpCommand($socket, '', [250])) {
    fclose($socket);
    return false;
  }

  smtpCommand($socket, 'QUIT', [221]);
  fclose($socket);
  return true;
}

function sendEmail(string $to, string $subject, string $body): bool {
  $from = getEnvValue('DRCARE_EMAIL_FROM', getEnvValue('MAILER_SMTP_USERNAME', 'no-reply@drcare.local'));
  $fromName = getEnvValue('DRCARE_EMAIL_NAME', 'DR.Care');

  if (getEnvValue('MAILER_SMTP_HOST')) {
    return smtpSendMail($to, $subject, $body, $from, $fromName);
  }

  if (function_exists('mail')) {
    $headers = [];
    $headers[] = 'From: ' . encodeHeaderValue($fromName) . ' <' . $from . '>';
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $headers[] = 'Content-Transfer-Encoding: 8bit';
    return mail($to, $subject, $body, implode("\r\n", $headers));
  }

  return false;
}

function sendBookingNotification(array $booking): bool {
  $recipient = getEnvValue('DRCARE_NOTIFICATION_EMAIL');
  if (!$recipient) return false;

  $id       = $booking['id']          ?? '—';
  $name     = $booking['name']        ?? '—';
  $phone    = $booking['phone']       ?? '—';
  $email    = $booking['email']       ?? 'غير مُحدد';
  $pkg      = $booking['package_name']  ?? '—';
  $car      = $booking['car_type_name'] ?? '—';
  $branch   = $booking['branch']        ?? '—';
  $payment  = $booking['payment_method']?? '—';
  $price    = number_format($booking['total_price'] ?? 0, 0, '.', ',');
  $appt     = ($booking['appointment']  ?? null) ?: 'غير محدد';
  $plate    = ($booking['plate_number'] ?? null) ?: 'غير متوفر';
  $notes    = ($booking['notes']        ?? null) ?: 'لا توجد';
  $date     = $booking['created_at']    ?? date('c');

  $line  = str_repeat('─', 40);
  $subject = "🚗 حجز جديد #$id — DR.Care";

  $body = <<<TEXT
╔══════════════════════════════════════╗
       DR.Care — حجز جديد #$id
╚══════════════════════════════════════╝

$line
  تفاصيل العميل
$line
  الاسم       : $name
  الموبايل    : $phone
  البريد      : $email
  رقم اللوحة  : $plate

$line
  تفاصيل الخدمة
$line
  الباقة      : $pkg
  نوع السيارة : $car
  الفرع       : $branch
  الموعد      : $appt
  طريقة الدفع : $payment
  السعر       : $price جنيه

$line
  ملاحظات
$line
  $notes

$line
  وقت الحجز: $date
$line

لإدارة الطلب: http://localhost:8000/admin.html

DR.Care — مغسلة عربيات مصرية
TEXT;

  $sent = sendEmail($recipient, $subject, $body);
  if (!$sent) error_log("DR.Care mail failed: booking #$id");
  return $sent;
}

/* ── HTTPS Enforcement (production only) ── */
$host = $_SERVER['HTTP_HOST'] ?? '';
$isLocal = preg_match('/^(localhost|127\.|192\.168\.|10\.|::1)/i', $host);
$isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'
        || (strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
if (!$isLocal && !$isHttps) {
  header('Location: https://' . $host . ($_SERVER['REQUEST_URI'] ?? '/'), true, 301);
  exit;
}

// DB file path (override via DRCARE_DB_PATH for tests)
$dbFile = getEnvValue('DRCARE_DB_PATH') ?: (__DIR__ . '/../data/drcare.db');
if (!is_dir(dirname($dbFile))) {
  @mkdir(dirname($dbFile), 0755, true);
}

try {
  $pdo = new PDO('sqlite:' . $dbFile);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  // Create bookings table if missing
  $pdo->exec("CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    package_code TEXT,
    package_name TEXT,
    car_type_code TEXT,
    car_type_name TEXT,
    branch TEXT,
    appointment TEXT,
    notes TEXT,
    plate_number TEXT,
    payment_method TEXT,
    total_price REAL DEFAULT 0,
    created_at TEXT,
    status TEXT DEFAULT 'new'
  )");

  addMissingColumn($pdo, 'bookings', 'email', 'TEXT');
  addMissingColumn($pdo, 'bookings', 'customer_id', 'INTEGER');
  addMissingColumn($pdo, 'bookings', 'source', "TEXT DEFAULT 'web'");
  addMissingColumn($pdo, 'bookings', 'payment_status', "TEXT NOT NULL DEFAULT 'pending'");
  addMissingColumn($pdo, 'bookings', 'pkg_price',       'REAL DEFAULT 0');
  addMissingColumn($pdo, 'bookings', 'car_extra_price', 'REAL DEFAULT 0');
  addMissingColumn($pdo, 'bookings', 'discount_amount', 'REAL DEFAULT 0');
  addMissingColumn($pdo, 'bookings', 'discount_note',   'TEXT DEFAULT NULL');
  addMissingColumn($pdo, 'bookings', 'claim_token',        'TEXT DEFAULT NULL');
  addMissingColumn($pdo, 'bookings', 'payment_screenshot', 'TEXT DEFAULT NULL');
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_bookings_claim ON bookings(claim_token) WHERE claim_token IS NOT NULL");

  $pdo->exec("CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT,
    last_login TEXT,
    is_active INTEGER DEFAULT 1
  )");

  createDefaultAdminIfMissing($pdo);

  /* ── Rate-limit table ── */
  $pdo->exec("CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rl_key  TEXT NOT NULL,
    hit_at  TEXT NOT NULL
  )");
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_rl_key ON rate_limits(rl_key)");

  /* ── Appointment slots ── */
  $pdo->exec("CREATE TABLE IF NOT EXISTS appointment_slots (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_date    TEXT NOT NULL,
    slot_time    TEXT NOT NULL,
    max_bookings INTEGER NOT NULL DEFAULT 1,
    booked_count INTEGER NOT NULL DEFAULT 0,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(slot_date, slot_time)
  )");
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_slots_date ON appointment_slots(slot_date, is_active)");

  /* ── Push subscriptions ── */
  $pdo->exec("CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    endpoint    TEXT NOT NULL UNIQUE,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    created_at  TEXT NOT NULL
  )");

  /* ── Reviews table ── */
  $pdo->exec("CREATE TABLE IF NOT EXISTS reviews (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id  INTEGER NOT NULL UNIQUE,
    customer_id INTEGER,
    rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TEXT NOT NULL
  )");
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id)");
  addMissingColumn($pdo, 'reviews', 'admin_reply', 'TEXT DEFAULT NULL');
  addMissingColumn($pdo, 'reviews', 'admin_replied_at', 'TEXT DEFAULT NULL');

  /* ── Coupons table ── */
  $pdo->exec("CREATE TABLE IF NOT EXISTS coupons (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    code           TEXT UNIQUE NOT NULL,
    discount_type  TEXT NOT NULL DEFAULT 'percent',
    discount_value REAL NOT NULL,
    min_order      REAL NOT NULL DEFAULT 0,
    max_uses       INTEGER DEFAULT NULL,
    used_count     INTEGER NOT NULL DEFAULT 0,
    expires_at     TEXT DEFAULT NULL,
    is_active      INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL
  )");

  $pdo->exec("CREATE TABLE IF NOT EXISTS customer_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT,
    last_login TEXT,
    is_active INTEGER DEFAULT 1
  )");
  addMissingColumn($pdo, 'customer_users', 'email_verified',      'INTEGER NOT NULL DEFAULT 0');
  addMissingColumn($pdo, 'customer_users', 'email_verify_token',  'TEXT DEFAULT NULL');
  addMissingColumn($pdo, 'customer_users', 'email_verify_expires','TEXT DEFAULT NULL');
  addMissingColumn($pdo, 'customer_users', 'referral_code',       'TEXT DEFAULT NULL');
  addMissingColumn($pdo, 'customer_users', 'referred_by_id',      'INTEGER DEFAULT NULL');

  /* ── Referrals ── */
  $pdo->exec("CREATE TABLE IF NOT EXISTS referrals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referred_id INTEGER NOT NULL UNIQUE,
    rewarded    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
  )");
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)");

  /* ── Loyalty points ── */
  $pdo->exec("CREATE TABLE IF NOT EXISTS loyalty_points (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    points      INTEGER NOT NULL,
    source      TEXT NOT NULL DEFAULT 'booking',
    booking_id  INTEGER,
    note        TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  )");
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_loyalty_customer ON loyalty_points(customer_id)");

  /* ── Password resets ── */
  $pdo->exec("CREATE TABLE IF NOT EXISTS password_resets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TEXT NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
  )");
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_pr_token ON password_resets(token_hash)");

  /* ── Audit log ── */
  $pdo->exec("CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_type  TEXT NOT NULL,
    actor_id    INTEGER,
    action      TEXT NOT NULL,
    target_type TEXT,
    target_id   INTEGER,
    detail      TEXT,
    created_at  TEXT NOT NULL
  )");
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_log(target_type, target_id)");
} catch (Exception $e) {
  error_log('DB connection error: ' . $e->getMessage());
  jsonResponse(['ok' => false, 'message' => 'Internal server error'], 500);
}

function createDefaultAdminIfMissing(PDO $pdo): void {
  $stmt = $pdo->query('SELECT COUNT(*) FROM admin_users');
  $count = (int) $stmt->fetchColumn();
  if ($count > 0) {
    return;
  }

  // Default admin creation is opt-in. Use `api/admin-init.php` for manual initialization,
  // or enable automatic creation during first setup with DRCARE_DEFAULT_ADMIN_AUTO_CREATE=1.
  $autoCreate = strtolower(trim(getenv('DRCARE_DEFAULT_ADMIN_AUTO_CREATE') ?? ''));
  if (!in_array($autoCreate, ['1', 'true', 'yes'], true)) {
    return;
  }

  $username = getenv('DRCARE_DEFAULT_ADMIN_USER') ?: 'admin';
  $password = getenv('DRCARE_DEFAULT_ADMIN_PASS') ?: '';
  $email = getenv('DRCARE_NOTIFICATION_EMAIL') ?: 'admin@drcare.local';

  if ($password === '') {
    throw new RuntimeException('DRCARE_DEFAULT_ADMIN_PASS must be set when DRCARE_DEFAULT_ADMIN_AUTO_CREATE is enabled.');
  }

  $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);

  $insert = $pdo->prepare('INSERT INTO admin_users (username, email, password_hash, created_at, is_active) VALUES (:username, :email, :hash, :now, 1)');
  $insert->execute([
    ':username' => $username,
    ':email' => $email,
    ':hash' => $passwordHash,
    ':now' => date('c')
  ]);
}

function logAudit(PDO $pdo, string $actorType, ?int $actorId, string $action, string $targetType, ?int $targetId, array $detail = []): void {
  try {
    $pdo->prepare('INSERT INTO audit_log (actor_type,actor_id,action,target_type,target_id,detail,created_at) VALUES (?,?,?,?,?,?,?)')
        ->execute([$actorType, $actorId, $action, $targetType, $targetId, json_encode($detail, JSON_UNESCAPED_UNICODE), date('c')]);
  } catch (Exception $e) {
    error_log('DR.Care audit log error: ' . $e->getMessage());
  }
}

function requireAdmin() {
  startSession();
  if (!isset($_SESSION['admin_id'])) {
    jsonResponse(['ok' => false, 'message' => 'Unauthorized'], 401);
  }
}

function requireAdminSession() {
  if (!isset($_SESSION['admin_id'])) {
    jsonResponse(['ok' => false, 'message' => 'جلسة منتهية، سجل دخولك مرة أخرى'], 401);
  }
}

function requireCustomerSession() {
  if (!isset($_SESSION['customer_id'])) {
    jsonResponse(['ok' => false, 'message' => 'جلسة منتهية، سجل دخولك مرة أخرى'], 401);
  }
}

function isHttpsRequest(): bool {
  return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
      || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https');
}

function startSession() {
  if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
      'lifetime' => 0,
      'path'     => '/',
      'secure'   => isHttpsRequest(),
      'httponly' => true,
      'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    session_start();
  }
}

/* ── Rate Limiting ── */
function checkRateLimit(PDO $pdo, string $action, int $maxHits = 5, int $windowSec = 300): void {
  $disabled = strtolower(trim((string)(getenv('DRCARE_DISABLE_RATE_LIMIT') ?: '')));
  if (in_array($disabled, ['1', 'true', 'yes'], true)) {
    return;
  }

  $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
  if (getenv('DRCARE_TRUSTED_PROXY') === '1' && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    // Use the rightmost IP — the one the trusted proxy appended, not the client-controlled leftmost
    $ips = array_map('trim', explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']));
    $ip = end($ips);
  }
  $key = hash('sha256', $ip . ':' . $action);

  /* purge expired entries */
  $pdo->prepare("DELETE FROM rate_limits WHERE hit_at < datetime('now', :w)")
      ->execute([':w' => "-{$windowSec} seconds"]);

  /* count recent hits */
  $stmt = $pdo->prepare("SELECT COUNT(*) FROM rate_limits WHERE rl_key = :k AND hit_at > datetime('now', :w)");
  $stmt->execute([':k' => $key, ':w' => "-{$windowSec} seconds"]);
  $hits = (int) $stmt->fetchColumn();

  if ($hits >= $maxHits) {
    $retryAfter = $windowSec - (time() % $windowSec);
    header('Retry-After: ' . $retryAfter);
    jsonResponse(['ok' => false, 'message' => 'تم تجاوز الحد المسموح به، حاول مرة أخرى بعد قليل.'], 429);
  }

  $pdo->prepare("INSERT INTO rate_limits (rl_key, hit_at) VALUES (:k, datetime('now'))")
      ->execute([':k' => $key]);
}

/* ── Referral helpers ── */
function generateUniqueReferralCode(PDO $pdo): string {
  do {
    $code = strtoupper(bin2hex(random_bytes(4)));
    $stmt = $pdo->prepare('SELECT id FROM customer_users WHERE referral_code = :c LIMIT 1');
    $stmt->execute([':c' => $code]);
  } while ($stmt->fetch());
  return $code;
}

function maybeRewardReferral(PDO $pdo, int $customerId): void {
  $stmt = $pdo->prepare('SELECT id, referrer_id FROM referrals WHERE referred_id = :rid AND rewarded = 0 LIMIT 1');
  $stmt->execute([':rid' => $customerId]);
  $referral = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$referral) return;

  $now = date('c');
  $pdo->prepare("INSERT INTO loyalty_points (customer_id, points, source, note, created_at) VALUES (?, 50, 'referral', 'مكافأة إحالة صديق', ?)")
      ->execute([(int)$referral['referrer_id'], $now]);
  $pdo->prepare("INSERT INTO loyalty_points (customer_id, points, source, note, created_at) VALUES (?, 25, 'referral', 'مكافأة الانضمام بإحالة', ?)")
      ->execute([$customerId, $now]);
  $pdo->prepare('UPDATE referrals SET rewarded = 1 WHERE id = ?')
      ->execute([(int)$referral['id']]);
}

/* ── WhatsApp (Meta Cloud API) ── */
function sendWhatsApp(string $phone, string $message): bool {
  $token   = getEnvValue('WHATSAPP_API_TOKEN');
  $phoneId = getEnvValue('WHATSAPP_PHONE_NUMBER_ID');
  if (!$token || !$phoneId) return false;

  // Normalize to international format: 01xxxxxxxxx → 201xxxxxxxxx
  $waid = preg_replace('/^0/', '2', $phone);
  if (!str_starts_with($waid, '20')) $waid = '20' . ltrim($waid, '0');

  $payload = json_encode([
    'messaging_product' => 'whatsapp',
    'to'   => $waid,
    'type' => 'text',
    'text' => ['body' => $message],
  ], JSON_UNESCAPED_UNICODE);

  $ch = curl_init("https://graph.facebook.com/v19.0/{$phoneId}/messages");
  curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_HTTPHEADER     => [
      'Authorization: Bearer ' . $token,
      'Content-Type: application/json',
    ],
  ]);
  $res  = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($code !== 200) {
    error_log("DR.Care WhatsApp [{$code}]: {$res}");
    return false;
  }
  return true;
}

/* ── CSRF ── */
function getCsrfToken(): string {
  startSession();
  if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
  }
  return $_SESSION['csrf_token'];
}

function validateCsrfToken(): void {
  startSession();
  $header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

  /* If no token in session yet, generate one so the next client request can use it */
  if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
  }

  if (!$header || !hash_equals($_SESSION['csrf_token'], $header)) {
    jsonResponse(['ok' => false, 'message' => 'طلب غير صالح (CSRF).'], 403);
  }
}
