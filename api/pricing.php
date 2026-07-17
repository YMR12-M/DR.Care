<?php
/**
 * DR.Care Pricing API
 * Uses Java PricingCalculator when available, falls back to PHP config
 */
require_once __DIR__ . '/bootstrap.php';

$config = require __DIR__ . '/config.php';

$pkg     = trim($_GET['package']  ?? $_POST['package']  ?? '');
$carType = trim($_GET['car_type'] ?? $_POST['car_type'] ?? '');

if (!$pkg || !$carType) {
  jsonResponse(['ok' => false, 'message' => 'package و car_type مطلوبان'], 400);
}

$price = null;

/* ── Try Java first ── */
$javaCmd    = getEnvValue('DRCARE_JAVA_CMD', 'java');
$classesDir = __DIR__ . '/../java/src';
$javaClass  = 'com.drcare.PricingCalculator';

$pkg_esc     = escapeshellarg($pkg);
$carType_esc = escapeshellarg($carType);
$cmd         = "$javaCmd -cp $classesDir $javaClass $pkg_esc $carType_esc 2>/dev/null";

$output = shell_exec($cmd);
if ($output !== null && is_numeric(trim($output))) {
  $price  = (int) trim($output);
  $source = 'java';
}

/* ── PHP fallback ── */
if ($price === null) {
  $pkgStmt = $pdo->prepare('SELECT * FROM packages WHERE code = :code AND is_active = 1 LIMIT 1');
  $pkgStmt->execute([':code' => $pkg]);
  $pkgData = $pkgStmt->fetch(PDO::FETCH_ASSOC) ?: null;
  $carData = array_values(array_filter($config['carTypes'], fn($c) => $c['code'] === $carType))[0] ?? null;

  if (!$pkgData || !$carData) {
    jsonResponse(['ok' => false, 'message' => 'باقة أو نوع عربية غير صحيح'], 400);
  }

  $price  = ($pkgData['price'] ?? 0) + ($carData['extra'] ?? 0);
  $source = 'php';
}

$label = $price === 0 ? 'حسب التعاقد' : number_format($price, 0, '.', ',') . ' جنيه';

jsonResponse([
  'ok'      => true,
  'price'   => $price,
  'label'   => $label,
  'source'  => $source,
  'package' => $pkg,
  'carType' => $carType,
]);
