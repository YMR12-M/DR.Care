<?php
// DR.Care — Booking Workflow: single source of truth for status transitions.
declare(strict_types=1);

final class BookingTransitionException extends RuntimeException {}

final class BookingStateMachine {
  public const STATES = ['new', 'confirmed', 'in_service', 'completed', 'cancelled'];

  /* from-state => [ to-state => [allowed actor types] ] */
  private const TRANSITIONS = [
    'new'        => ['confirmed' => ['admin', 'pos'], 'cancelled' => ['admin', 'pos', 'customer']],
    'confirmed'  => ['in_service' => ['admin', 'pos'], 'cancelled' => ['admin', 'pos', 'customer']],
    'in_service' => ['completed' => ['admin', 'pos'], 'cancelled' => ['admin', 'pos']],
    'completed'  => [],
    'cancelled'  => [],
  ];

  private const WHATSAPP_MESSAGES = [
    'confirmed'  => "مرحباً {name}،\n\nتم تأكيد حجزك في DR.Care ✅\nرقم الحجز: #{id}\nالباقة: {package}\nالفرع: {branch}\n\nفي انتظارك! 🚗",
    'in_service' => "مرحباً {name}،\n\nعربيتك دلوقتي بتتغسل في DR.Care 🚿✨\nرقم الحجز: #{id}\n\nهنعلّمك لما تخلص!",
    'completed'  => "مرحباً {name}،\n\nتم تسليم عربيتك بنجاح! ✅🎉\nرقم الحجز: #{id}\n\nشكراً لثقتك في DR.Care. نتمنى نشوفك تاني! 🚗",
    'cancelled'  => "مرحباً {name}،\n\nللأسف تم إلغاء حجزك #{id} في DR.Care.\n\nلو عندك أي استفسار تواصل معنا. نتمنى نخدمك تاني! 🚗",
  ];

  public static function isValidState(string $status): bool {
    return in_array($status, self::STATES, true);
  }

  public static function canTransition(string $from, string $to, string $actorType): bool {
    if ($from === $to) return true;
    $allowedActors = self::TRANSITIONS[$from][$to] ?? null;
    return $allowedActors !== null && in_array($actorType, $allowedActors, true);
  }

  public static function assertTransition(string $from, string $to, string $actorType): void {
    if (self::canTransition($from, $to, $actorType)) return;
    throw new BookingTransitionException("لا يمكن تغيير حالة الحجز من \"{$from}\" إلى \"{$to}\"");
  }

  public static function clearsPaymentScreenshot(string $newStatus): bool {
    return in_array($newStatus, ['completed', 'cancelled'], true);
  }

  /** Loyalty points + referral reward + WhatsApp notification, run after the status column is persisted. */
  public static function applyStatusSideEffects(PDO $pdo, int $bookingId, string $from, string $to): void {
    if ($from === $to) return;

    if ($to === 'completed' && $from !== 'completed') {
      self::awardCompletionLoyalty($pdo, $bookingId);
    }

    self::notifyStatusChange($pdo, $bookingId, $to);
  }

  private static function awardCompletionLoyalty(PDO $pdo, int $bookingId): void {
    $bk = $pdo->prepare('SELECT customer_id, total_price, package_name FROM bookings WHERE id = :id');
    $bk->execute([':id' => $bookingId]);
    $bkRow = $bk->fetch(PDO::FETCH_ASSOC);
    if (!$bkRow || !$bkRow['customer_id']) return;

    /* 1 point per 10 ج, minimum 5 points */
    $earned = max(5, (int)floor((float)$bkRow['total_price'] / 10));

    /* Check not already awarded for this booking */
    $already = $pdo->prepare('SELECT id FROM loyalty_points WHERE booking_id = :bid AND source = :src');
    $already->execute([':bid' => $bookingId, ':src' => 'booking']);
    if (!$already->fetch()) {
      $pdo->prepare("
        INSERT INTO loyalty_points (customer_id, points, source, booking_id, note)
        VALUES (:cid, :pts, 'booking', :bid, :note)
      ")->execute([
        ':cid'  => (int)$bkRow['customer_id'],
        ':pts'  => $earned,
        ':bid'  => $bookingId,
        ':note' => "حجز مكتمل: {$bkRow['package_name']}",
      ]);
    }

    maybeRewardReferral($pdo, (int)$bkRow['customer_id']);
  }

  private static function notifyStatusChange(PDO $pdo, int $bookingId, string $to): void {
    if (!isset(self::WHATSAPP_MESSAGES[$to])) return;

    $bkWa = $pdo->prepare('SELECT name, phone, package_name, branch FROM bookings WHERE id = :id');
    $bkWa->execute([':id' => $bookingId]);
    $bkData = $bkWa->fetch(PDO::FETCH_ASSOC);
    if (!$bkData) return;

    $message = strtr(self::WHATSAPP_MESSAGES[$to], [
      '{name}'    => $bkData['name'],
      '{id}'      => (string)$bookingId,
      '{package}' => $bkData['package_name'],
      '{branch}'  => $bkData['branch'],
    ]);
    sendWhatsApp($bkData['phone'], $message);
  }
}
