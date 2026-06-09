<?php
declare(strict_types=1);

namespace DRCare\Tests\Integration;

use DRCare\Tests\Support\ApiTestCase;
use DRCare\Tests\Support\HttpClient;
use PDO;

final class AdminAndCouponsTest extends ApiTestCase
{
    public function testAdminLoginAndSessionCheck(): void
    {
        $admin = new HttpClient(self::baseUrl());
        $this->loginAdmin($admin);

        $check = $admin->get('/api/admin-login.php?action=check');
        $this->assertTrue($check['body']['authenticated'] ?? false);
        $this->assertSame('testadmin', $check['body']['username'] ?? null);

        $admin->cleanup();
    }

    public function testAdminBookingsRequireAuth(): void
    {
        $guest = new HttpClient(self::baseUrl());
        $response = $guest->get('/api/bookings.php');
        $this->assertSame(401, $response['status']);
        $guest->cleanup();
    }

    public function testCouponValidateCreateAndApply(): void
    {
        $admin = self::$adminClient;
        $this->loginAdmin($admin);

        $create = $admin->post('/api/coupons.php', [
            'action' => 'create',
            'code' => 'TEST20',
            'discount_type' => 'percent',
            'discount_value' => 20,
            'min_order' => 100,
            'max_uses' => 5,
        ]);
        $this->assertSame(200, $create['status'], $create['raw'] ?? '');
        $this->assertTrue($create['body']['ok'] ?? false);

        $validate = self::$client->post('/api/coupons.php', [
            'action' => 'validate',
            'code' => 'TEST20',
            'subtotal' => 210,
        ]);
        $this->assertSame(200, $validate['status']);
        $this->assertEquals(42.0, $validate['body']['discount']);
        $this->assertEquals(168.0, $validate['body']['new_total']);

        $customer = new HttpClient(self::baseUrl());
        $email = $this->uniqueEmail();
        $this->registerCustomer($customer, $email);

        $token = $this->csrfToken($customer);
        $booking = $customer->post('/api/bookings.php', [
            'name' => 'عميل كوبون',
            'email' => $email,
            'phone' => '01022223333',
            'servicePackage' => 'inside-out',
            'carType' => 'suv',
            'branch' => 'قليوب — شارع العروبة',
            'paymentMethod' => 'كاش',
            'couponCode' => 'TEST20',
        ], ['X-CSRF-Token' => $token]);

        $this->assertSame(201, $booking['status']);
        $this->assertSame(168, $booking['body']['booking']['total'] ?? null);

        $pdo = new PDO('sqlite:' . self::dbPath());
        $used = (int) $pdo->query("SELECT used_count FROM coupons WHERE code = 'TEST20'")->fetchColumn();
        $this->assertSame(1, $used);

        $customer->cleanup();
    }

    public function testCouponValidateRejectsExpiredCode(): void
    {
        $admin = self::$adminClient;
        $this->loginAdmin($admin);

        $admin->post('/api/coupons.php', [
            'action' => 'create',
            'code' => 'OLD',
            'discount_type' => 'fixed',
            'discount_value' => 50,
            'expires_at' => '2020-01-01T00:00:00+00:00',
        ]);

        $validate = self::$client->post('/api/coupons.php', [
            'action' => 'validate',
            'code' => 'OLD',
            'subtotal' => 200,
        ]);

        $this->assertSame(400, $validate['status']);
    }
}
