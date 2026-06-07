<?php
require_once __DIR__ . '/bootstrap.php';

startSession();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  // Get customer profile
  requireCustomerSession();
  
  $customerId = $_SESSION['customer_id'];

  try {
    $stmt = $pdo->prepare('
      SELECT id, name, email, phone, created_at, last_login, is_active, email_verified,
             (SELECT COUNT(*) FROM bookings WHERE customer_id = customer_users.id OR email = customer_users.email) as booking_count
      FROM customer_users
      WHERE id = :id
    ');
    $stmt->execute([':id' => $customerId]);
    $customer = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$customer) {
      jsonResponse(['ok' => false, 'message' => 'الحساب غير موجود'], 404);
    }

    jsonResponse(['ok' => true, 'customer' => $customer]);
  } catch (Exception $e) {
    jsonResponse(['ok' => false, 'message' => 'خطأ في الخادم'], 500);
  }
}

if ($method === 'PATCH') {
  requireCustomerSession();
  validateCsrfToken();
  
  $customerId = $_SESSION['customer_id'];
  $input = json_decode(file_get_contents('php://input'), true) ?? [];

  try {
    // Update personal info
    if (isset($input['name']) && isset($input['phone'])) {
      $name = trim($input['name'] ?? '');
      $phone = trim($input['phone'] ?? '');

      if (!$name || !preg_match('/^[\p{L}\s]{2,80}$/u', $name)) {
        jsonResponse(['ok' => false, 'message' => 'الاسم غير صالح'], 400);
      }

      if (!preg_match('/^01[0125][0-9]{8}$/', $phone)) {
        jsonResponse(['ok' => false, 'message' => 'رقم الموبايل غير صحيح'], 400);
      }

      $stmt = $pdo->prepare('UPDATE customer_users SET name = :name, phone = :phone WHERE id = :id');
      $stmt->execute([':name' => $name, ':phone' => $phone, ':id' => $customerId]);

      $_SESSION['customer_name'] = $name;

      jsonResponse(['ok' => true, 'message' => 'تم تحديث البيانات الشخصية']);
    }

    // Change password
    if (isset($input['current_password']) && isset($input['new_password'])) {
      $current = $input['current_password'];
      $new = $input['new_password'];

      if (strlen($new) < 6) {
        jsonResponse(['ok' => false, 'message' => 'كلمة المرور الجديدة قصيرة جداً'], 400);
      }

      // Get current hash
      $stmt = $pdo->prepare('SELECT password_hash FROM customer_users WHERE id = :id');
      $stmt->execute([':id' => $customerId]);
      $result = $stmt->fetch(PDO::FETCH_ASSOC);

      if (!$result || !password_verify($current, $result['password_hash'])) {
        jsonResponse(['ok' => false, 'message' => 'كلمة المرور الحالية غير صحيحة'], 401);
      }

      $newHash = password_hash($new, PASSWORD_BCRYPT, ['cost' => 10]);
      $stmt = $pdo->prepare('UPDATE customer_users SET password_hash = :hash WHERE id = :id');
      $stmt->execute([':hash' => $newHash, ':id' => $customerId]);

      jsonResponse(['ok' => true, 'message' => 'تم تحديث كلمة المرور']);
    }

    jsonResponse(['ok' => false, 'message' => 'لا توجد بيانات للتحديث'], 400);
  } catch (Exception $e) {
    error_log('DR.Care customer-profile PATCH error: ' . $e->getMessage());
    jsonResponse(['ok' => false, 'message' => 'خطأ في الخادم'], 500);
  }
}

jsonResponse(['ok' => false, 'message' => 'Method Not Allowed'], 405);
