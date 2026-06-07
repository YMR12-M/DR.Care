<?php
require_once __DIR__ . '/bootstrap.php';

/**
 * Minimal VAPID Web Push sender — no external dependencies
 * Supports ES256 signing via PHP openssl
 */

/* ── base64url helpers ── */
function b64url_encode(string $data): string {
  return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function b64url_decode(string $data): string {
  return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}

/* ── Build VAPID JWT ── */
function buildVapidJwt(string $endpoint, string $pemPath, string $subject): ?string {
  if (!file_exists($pemPath)) return null;

  $parsed  = parse_url($endpoint);
  $audience = $parsed['scheme'] . '://' . $parsed['host'];

  $header  = b64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
  $payload = b64url_encode(json_encode([
    'aud' => $audience,
    'exp' => time() + 43200,
    'sub' => $subject,
  ]));

  $signing  = "$header.$payload";
  $keyRes   = openssl_pkey_get_private(file_get_contents($pemPath));
  if (!$keyRes) return null;

  $signature = '';
  openssl_sign($signing, $signature, $keyRes, OPENSSL_ALGO_SHA256);

  /* DER → raw r||s (64 bytes) */
  $pos = 2;
  $pos++; // skip integer tag
  $rLen = ord($signature[$pos++]);
  if ($rLen === 0x81) { $rLen = ord($signature[$pos++]); }
  $r = ltrim(substr($signature, $pos, $rLen), "\x00");
  $pos += $rLen;
  $pos++; // skip integer tag
  $sLen = ord($signature[$pos++]);
  if ($sLen === 0x81) { $sLen = ord($signature[$pos++]); }
  $s = ltrim(substr($signature, $pos, $sLen), "\x00");

  $r = str_pad($r, 32, "\x00", STR_PAD_LEFT);
  $s = str_pad($s, 32, "\x00", STR_PAD_LEFT);

  return "$header.$payload." . b64url_encode($r . $s);
}

/* ── Send one push (no payload encryption — notification title/body via sw default) ── */
function sendWebPush(array $sub, string $pemPath, string $vapidPublic, string $subject, array $data = []): bool {
  $jwt = buildVapidJwt($sub['endpoint'], $pemPath, $subject);
  if (!$jwt) return false;

  $body    = json_encode($data) ?: '{}';
  $headers = [
    "Authorization: vapid t={$jwt},k={$vapidPublic}",
    'Content-Type: application/json',
    'TTL: 86400',
  ];

  $ch = curl_init($sub['endpoint']);
  curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_HTTPHEADER     => $headers,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_SSL_VERIFYPEER => true,
  ]);

  curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  return $code >= 200 && $code < 300;
}

/* ── Main: send notification to all or specific customer ── */
function sendPushNotification(PDO $pdo, string $title, string $body, string $url = '/', ?int $customerId = null): int {
  $pemPath     = getEnvValue('VAPID_PRIVATE_PEM', 'data/vapid_private.pem');
  $vapidPublic = getEnvValue('VAPID_PUBLIC_KEY', '');
  $subject     = getEnvValue('VAPID_SUBJECT', 'mailto:admin@drcare.local');

  $pemFull = __DIR__ . '/../' . $pemPath;

  if (!$vapidPublic || !file_exists($pemFull)) return 0;

  if ($customerId) {
    $stmt = $pdo->prepare('SELECT * FROM push_subscriptions WHERE customer_id = :cid');
    $stmt->execute([':cid' => $customerId]);
  } else {
    $stmt = $pdo->query('SELECT * FROM push_subscriptions');
  }
  $subs = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $sent = 0;
  foreach ($subs as $sub) {
    $ok = sendWebPush(
      ['endpoint' => $sub['endpoint']],
      $pemFull, $vapidPublic, $subject,
      ['title' => $title, 'body' => $body, 'url' => $url]
    );
    if ($ok) $sent++;
    else {
      /* Remove expired subscription */
      $pdo->prepare('DELETE FROM push_subscriptions WHERE endpoint = :ep')
          ->execute([':ep' => $sub['endpoint']]);
    }
  }
  return $sent;
}

/* ── Admin-only HTTP trigger (only when invoked directly) ── */
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
  startSession();
  requireAdmin();

  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  $title  = trim($input['title'] ?? 'DR.Care');
  $body   = trim($input['body']  ?? 'إشعار جديد');
  $url    = trim($input['url']   ?? '/');
  $cid    = isset($input['customer_id']) ? (int)$input['customer_id'] : null;

  $sent = sendPushNotification($pdo, $title, $body, $url, $cid ?: null);
  jsonResponse(['ok' => true, 'sent' => $sent]);
}
