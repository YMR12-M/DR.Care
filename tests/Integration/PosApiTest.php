<?php
declare(strict_types=1);

namespace DRCare\Tests\Integration;

use DRCare\Tests\Support\ApiTestCase;
use DRCare\Tests\Support\HttpClient;
use PDO;

final class PosApiTest extends ApiTestCase
{
    private const POS_TOKEN = 'test-pos-token-ci';

    private function posHeaders(): array
    {
        return ['X-POS-Token' => self::POS_TOKEN];
    }

    public function testPosHealthWithoutToken(): void
    {
        $response = self::$client->get('/api/pos.php');
        $this->assertSame(200, $response['status']);
        $this->assertTrue($response['body']['ok'] ?? false);
    }

    public function testPosRejectsMissingToken(): void
    {
        $response = self::$client->get('/api/pos.php?action=today');
        $this->assertSame(401, $response['status']);
    }

    public function testPosCreatesBookingAndListsToday(): void
    {
        $create = self::$client->post('/api/pos.php', [
            'token' => self::POS_TOKEN,
            'name' => 'عميل POS',
            'phone' => '01044445555',
            'packageCode' => 'outside',
            'carType' => 'sedan',
            'branch' => 'قليوب — شارع العروبة',
            'paymentMethod' => 'كاش',
            'plateNumber' => 'س ي 9999',
        ]);

        $this->assertSame(200, $create['status'], $create['raw'] ?? '');
        $this->assertTrue($create['body']['ok'] ?? false);
        $this->assertSame(100, $create['body']['booking']['total_price'] ?? null);
        $this->assertSame('new', $create['body']['booking']['status'] ?? null);

        $today = self::$client->get('/api/pos.php?action=today', $this->posHeaders());
        $this->assertSame(200, $today['status'], $today['raw'] ?? '');
        $this->assertNotEmpty($today['body']['bookings']);
        $this->assertGreaterThanOrEqual(100, $today['body']['revenue'] ?? 0);
    }

    public function testPosSearchFindsBooking(): void
    {
        self::$client->post('/api/pos.php', [
            'token' => self::POS_TOKEN,
            'name' => 'بحث POS',
            'phone' => '01066667777',
            'packageCode' => 'inside-out',
            'carType' => 'sedan',
            'branch' => 'قليوب — شارع العروبة',
            'paymentMethod' => 'كاش',
        ]);

        $search = self::$client->get(
            '/api/pos.php?action=search&q=01066667777',
            $this->posHeaders()
        );
        $this->assertSame(200, $search['status']);
        $this->assertNotEmpty($search['body']['bookings']);
    }

    public function testPosRejectsInvalidStatusTransition(): void
    {
        $client = new HttpClient(self::baseUrl());
        $create = $client->post('/api/pos.php', [
            'token' => self::POS_TOKEN,
            'name' => 'عميل انتقال POS',
            'phone' => '01055556666',
            'packageCode' => 'outside',
            'carType' => 'sedan',
            'branch' => 'قليوب — شارع العروبة',
            'paymentMethod' => 'كاش',
        ]);
        $bookingId = $create['body']['booking']['id'] ?? null;
        $this->assertNotNull($bookingId);

        // Cannot skip new -> completed directly.
        $skip = $client->patch('/api/pos.php', [
            'token' => self::POS_TOKEN,
            'id' => $bookingId,
            'status' => 'completed',
        ]);
        $this->assertSame(409, $skip['status']);

        $client->cleanup();
    }

    public function testPosCompletionAwardsLoyaltyPointsWhenLinkedToCustomer(): void
    {
        $client = new HttpClient(self::baseUrl());
        $create = $client->post('/api/pos.php', [
            'token' => self::POS_TOKEN,
            'name' => 'عميل ولاء POS',
            'phone' => '01033334444',
            'packageCode' => 'outside',
            'carType' => 'sedan',
            'branch' => 'قليوب — شارع العروبة',
            'paymentMethod' => 'كاش',
        ]);
        $bookingId = $create['body']['booking']['id'] ?? null;
        $this->assertNotNull($bookingId);

        // Link this POS booking to a customer, as claim-booking.php would.
        $registration = $this->registerCustomer($client);
        $pdo = new PDO('sqlite:' . self::dbPath());
        $customerId = (int) $pdo->query(
            "SELECT id FROM customer_users WHERE email = " . $pdo->quote($registration['email'])
        )->fetchColumn();
        $pdo->prepare('UPDATE bookings SET customer_id = ? WHERE id = ?')->execute([$customerId, $bookingId]);

        foreach (['confirmed', 'in_service', 'completed'] as $status) {
            $step = $client->patch('/api/pos.php', [
                'token' => self::POS_TOKEN,
                'id' => $bookingId,
                'status' => $status,
            ]);
            $this->assertSame(200, $step['status'], $step['raw'] ?? '');
        }

        $points = $pdo->prepare('SELECT COUNT(*) FROM loyalty_points WHERE booking_id = ? AND source = ?');
        $points->execute([$bookingId, 'booking']);
        $this->assertSame(1, (int) $points->fetchColumn());

        $client->cleanup();
    }
}
