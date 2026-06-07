<?php
declare(strict_types=1);

namespace DRCare\Tests\Integration;

use DRCare\Tests\Support\ApiTestCase;
use DRCare\Tests\Support\HttpClient;

final class CustomerAuthTest extends ApiTestCase
{
    public function testRegisterLoginCheckAndLogout(): void
    {
        $client = new HttpClient(self::baseUrl());
        $email = $this->uniqueEmail();

        $register = $client->post('/api/customer-login.php', [
            'action' => 'register',
            'name' => 'أحمد اختبار',
            'email' => $email,
            'phone' => '01011112222',
            'password' => 'password123',
        ]);
        $this->assertSame(200, $register['status']);
        $this->assertTrue($register['body']['ok'] ?? false);

        $check = $client->get('/api/customer-login.php?action=check');
        $this->assertTrue($check['body']['authenticated'] ?? false);
        $this->assertSame($email, $check['body']['email'] ?? null);

        $logout = $client->post('/api/customer-login.php', ['action' => 'logout']);
        $this->assertTrue($logout['body']['ok'] ?? false);

        $checkAfter = $client->get('/api/customer-login.php?action=check');
        $this->assertFalse($checkAfter['body']['authenticated'] ?? true);

        $client->cleanup();
    }

    public function testRegisterRejectsDuplicateEmail(): void
    {
        $client = new HttpClient(self::baseUrl());
        $email = $this->uniqueEmail();

        $this->registerCustomer($client, $email);

        $duplicate = $client->post('/api/customer-login.php', [
            'action' => 'register',
            'name' => 'آخر',
            'email' => $email,
            'phone' => '01033334444',
            'password' => 'password123',
        ]);

        $this->assertSame(409, $duplicate['status']);
        $client->cleanup();
    }

    public function testRegisterRejectsInvalidPhone(): void
    {
        $client = new HttpClient(self::baseUrl());

        $response = $client->post('/api/customer-login.php', [
            'action' => 'register',
            'name' => 'اختبار',
            'email' => $this->uniqueEmail(),
            'phone' => '02012345678',
            'password' => 'password123',
        ]);

        $this->assertSame(400, $response['status']);
        $client->cleanup();
    }

    public function testLoginRejectsWrongPassword(): void
    {
        $client = new HttpClient(self::baseUrl());
        $email = $this->uniqueEmail();
        $this->registerCustomer($client, $email, 'correct-pass');

        $client->post('/api/customer-login.php', ['action' => 'logout']);

        $bad = $client->post('/api/customer-login.php', [
            'action' => 'login',
            'email' => $email,
            'password' => 'wrong-pass',
        ]);

        $this->assertSame(401, $bad['status']);
        $client->cleanup();
    }

    public function testProfileGetAndPatch(): void
    {
        $client = new HttpClient(self::baseUrl());
        $email = $this->uniqueEmail();
        $this->registerCustomer($client, $email);

        $profile = $client->get('/api/customer-profile.php');
        $this->assertSame(200, $profile['status']);
        $this->assertSame('عميل اختبار', $profile['body']['customer']['name'] ?? null);

        $token = $this->csrfToken($client);
        $patch = $client->patch('/api/customer-profile.php', [
            'name' => 'اسم محدث',
            'phone' => '01055556666',
        ], ['X-CSRF-Token' => $token]);

        $this->assertSame(200, $patch['status'], $patch['raw'] ?? json_encode($patch['body'] ?? []));
        $this->assertTrue($patch['body']['ok'] ?? false);

        $updated = $client->get('/api/customer-profile.php');
        $this->assertSame('اسم محدث', $updated['body']['customer']['name'] ?? null);
        $this->assertSame('01055556666', $updated['body']['customer']['phone'] ?? null);

        $client->cleanup();
    }
}
