<?php
declare(strict_types=1);

namespace DRCare\Tests\Integration;

use DRCare\Tests\Support\ApiTestCase;
use DRCare\Tests\Support\HttpClient;

final class BookingFlowTest extends ApiTestCase
{
    public function testBookingRequiresAuthentication(): void
    {
        $guest = new HttpClient(self::baseUrl());
        $result = $this->createBooking($guest, ['email' => 'guest@example.com']);

        $this->assertSame(401, $result['response']['status']);
        $guest->cleanup();
    }

    public function testCustomerCanCreateAndListBooking(): void
    {
        $client = new HttpClient(self::baseUrl());
        $email = $this->uniqueEmail();
        $this->registerCustomer($client, $email);

        $result = $this->createBooking($client, ['email' => $email, 'phone' => '01012345678']);
        $response = $result['response'];

        $this->assertSame(201, $response['status'], $response['raw'] ?? '');
        $this->assertTrue($response['body']['ok'] ?? false);
        $this->assertSame(340, $response['body']['booking']['total'] ?? null);

        $list = $client->get('/api/customer-bookings.php');
        $this->assertSame(200, $list['status']);
        $this->assertNotEmpty($list['body']['bookings']);
        $this->assertSame($email, $list['body']['bookings'][0]['email'] ?? null);

        $client->cleanup();
    }

    public function testPublicTrackingRequiresMatchingPhone(): void
    {
        $client = new HttpClient(self::baseUrl());
        $email = $this->uniqueEmail();
        $this->registerCustomer($client, $email);

        $created = $this->createBooking($client, [
            'email' => $email,
            'phone' => '01077778888',
        ]);
        $bookingId = $created['response']['body']['booking']['id'] ?? null;
        $this->assertNotNull($bookingId);

        $tracker = new HttpClient(self::baseUrl());
        $ok = $tracker->get('/api/customer-bookings.php?track_id=' . $bookingId . '&track_phone=01077778888');
        $this->assertSame(200, $ok['status']);
        $this->assertCount(1, $ok['body']['bookings'] ?? []);

        $bad = $tracker->get('/api/customer-bookings.php?track_id=' . $bookingId . '&track_phone=01000000000');
        $this->assertSame(404, $bad['status']);

        $client->cleanup();
        $tracker->cleanup();
    }

    public function testBookingRejectsInvalidBranch(): void
    {
        $client = new HttpClient(self::baseUrl());
        $email = $this->uniqueEmail();
        $this->registerCustomer($client, $email);

        $result = $this->createBooking($client, [
            'email' => $email,
            'branch' => 'فرع وهمي',
        ]);

        $this->assertSame(400, $result['response']['status']);
        $client->cleanup();
    }

    public function testAdminCanListAndUpdateBookingStatus(): void
    {
        $customer = new HttpClient(self::baseUrl());
        $email = $this->uniqueEmail();
        $this->registerCustomer($customer, $email);
        $created = $this->createBooking($customer, ['email' => $email]);
        $bookingId = $created['response']['body']['booking']['id'] ?? null;

        $admin = self::$adminClient;
        $this->loginAdmin($admin);

        $list = $admin->get('/api/bookings.php');
        $this->assertSame(200, $list['status']);
        $this->assertNotEmpty($list['body']['bookings']);

        $patch = $admin->patch('/api/bookings.php', [
            'id' => $bookingId,
            'status' => 'confirmed',
        ]);
        $this->assertSame(200, $patch['status']);
        $this->assertTrue($patch['body']['ok'] ?? false);

        $updated = $admin->get('/api/bookings.php');
        $match = array_values(array_filter(
            $updated['body']['bookings'] ?? [],
            fn ($b) => (int) ($b['id'] ?? 0) === (int) $bookingId
        ));
        $this->assertSame('confirmed', $match[0]['status'] ?? null);

        $customer->cleanup();
    }
}
