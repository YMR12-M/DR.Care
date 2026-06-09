<?php
declare(strict_types=1);

namespace DRCare\Tests\Support;

use PHPUnit\Framework\TestCase;

abstract class ApiTestCase extends TestCase
{
    protected static ?HttpClient $client = null;
    protected static ?HttpClient $adminClient = null;

    public static function setUpBeforeClass(): void
    {
        TestServer::boot();
        self::$client = new HttpClient(TestServer::boot()->baseUrl());
        self::$adminClient = new HttpClient(TestServer::boot()->baseUrl());
    }

    public static function tearDownAfterClass(): void
    {
        self::$client?->cleanup();
        self::$adminClient?->cleanup();
        self::$client = null;
        self::$adminClient = null;
    }

    public static function tearDownAfterClassOnce(): void
    {
        TestServer::shutdown();
    }

    protected static function baseUrl(): string
    {
        return TestServer::boot()->baseUrl();
    }

    protected static function dbPath(): string
    {
        return TestServer::boot()->dbPath();
    }

    protected function uniqueEmail(): string
    {
        return 'test_' . bin2hex(random_bytes(4)) . '@example.com';
    }

    protected function futureAppointment(): string
    {
        return (new \DateTimeImmutable('+1 day'))->format('Y-m-d\TH:i');
    }

    protected function registerCustomer(HttpClient $client, ?string $email = null, string $password = 'secret12'): array
    {
        $email ??= $this->uniqueEmail();
        $response = $client->post('/api/customer-login.php', [
            'action' => 'register',
            'name' => 'عميل اختبار',
            'email' => $email,
            'phone' => '01012345678',
            'password' => $password,
        ]);

        self::assertSame(200, $response['status'], $response['raw'] ?? '');
        self::assertTrue($response['body']['ok'] ?? false);

        return ['email' => $email, 'password' => $password, 'response' => $response];
    }

    protected function loginAdmin(HttpClient $client): void
    {
        $response = $client->post('/api/admin-login.php', [
            'username' => 'testadmin',
            'password' => 'Admin@Test123',
        ]);

        self::assertSame(200, $response['status'], $response['raw'] ?? '');
        self::assertTrue($response['body']['ok'] ?? false);
    }

    protected function csrfToken(HttpClient $client): string
    {
        $response = $client->get('/api/csrf.php');
        self::assertSame(200, $response['status']);
        self::assertNotEmpty($response['body']['token'] ?? '');

        return (string) $response['body']['token'];
    }

    protected function createBooking(HttpClient $client, array $overrides = []): array
    {
        $token = $this->csrfToken($client);
        $payload = array_merge([
            'name' => 'عميل اختبار',
            'email' => 'booking@example.com',
            'phone' => '01098765432',
            'servicePackage' => 'inside-out',
            'carType' => 'suv',
            'branch' => 'قليوب — شارع العروبة',
            'appointment' => $this->futureAppointment(),
            'paymentMethod' => 'كاش',
            'plateNumber' => 'أ ب ج 1234',
            'notes' => 'اختبار',
        ], $overrides);

        $response = $client->post('/api/bookings.php', $payload, [
            'X-CSRF-Token' => $token,
        ]);

        return ['response' => $response, 'payload' => $payload];
    }
}
