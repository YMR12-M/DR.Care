<?php
// DR.Care — Appointment Slots API
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
startSession();

$method = $_SERVER['REQUEST_METHOD'];

/* ── GET: public (available slots) OR admin (all slots) ── */
if ($method === 'GET') {
    $isAdmin = isset($_GET['admin']) && isset($_SESSION['admin_id']);

    if ($isAdmin) {
        $stmt = $pdo->query("
            SELECT id, slot_date, slot_time, max_bookings, booked_count, is_active
            FROM appointment_slots
            ORDER BY slot_date ASC, slot_time ASC
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $all = array_map(fn($r) => [
            'id'           => (int)$r['id'],
            'slot_date'    => $r['slot_date'],
            'slot_time'    => $r['slot_time'],
            'max_bookings' => (int)$r['max_bookings'],
            'booked_count' => (int)$r['booked_count'],
            'is_active'    => (int)$r['is_active'],
        ], $rows);
        jsonResponse(['all_slots' => $all]);
    }

    $stmt = $pdo->query("
        SELECT id, slot_date, slot_time, max_bookings, booked_count
        FROM appointment_slots
        WHERE is_active = 1
          AND slot_date >= date('now', 'localtime')
        ORDER BY slot_date ASC, slot_time ASC
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $grouped = [];
    foreach ($rows as $r) {
        $avail = (int)$r['max_bookings'] - (int)$r['booked_count'];
        if ($avail < 0) $avail = 0;
        $grouped[$r['slot_date']][] = [
            'id'        => (int)$r['id'],
            'time'      => $r['slot_time'],
            'available' => $avail,
        ];
    }

    jsonResponse(['slots' => $grouped]);
}

/* ── POST: admin only — create/update slots for a date ── */
if ($method === 'POST') {
    requireAdmin();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    $date  = trim($input['date']  ?? '');
    $times = $input['times']       ?? [];
    $max   = max(1, (int)($input['max_bookings'] ?? 1));

    if (!$date || empty($times)) {
        jsonResponse(['ok' => false, 'message' => 'date and times required'], 400);
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        jsonResponse(['ok' => false, 'message' => 'invalid date'], 400);
    }

    $stmt = $pdo->prepare("
        INSERT INTO appointment_slots (slot_date, slot_time, max_bookings, created_at)
        VALUES (:date, :time, :max, datetime('now'))
        ON CONFLICT(slot_date, slot_time)
        DO UPDATE SET max_bookings = excluded.max_bookings, is_active = 1
    ");

    $added = 0;
    foreach ($times as $t) {
        $t = trim((string)$t);
        if (!preg_match('/^\d{2}:\d{2}$/', $t)) continue;
        $stmt->execute([':date' => $date, ':time' => $t, ':max' => $max]);
        $added++;
    }

    jsonResponse(['ok' => true, 'added' => $added]);
}

/* ── DELETE: admin only — remove a slot ── */
if ($method === 'DELETE') {
    requireAdmin();
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(['ok' => false, 'message' => 'id required'], 400);
    $pdo->prepare("DELETE FROM appointment_slots WHERE id = :id")->execute([':id' => $id]);
    jsonResponse(['ok' => true]);
}

jsonResponse(['ok' => false, 'message' => 'method not allowed'], 405);
