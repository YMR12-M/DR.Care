<?php
declare(strict_types=1);

namespace DRCare\Tests\Integration;

use DRCare\Tests\Support\ApiTestCase;

final class HealthAndConfigTest extends ApiTestCase
{
    public function testHealthEndpointReturnsOk(): void
    {
        $response = self::$client->get('/api/health.php');

        $this->assertSame(200, $response['status']);
        $this->assertTrue($response['body']['ok'] ?? false);
        $this->assertArrayHasKey('uptime', $response['body']);
    }

    public function testPackagesEndpointReturnsConfig(): void
    {
        $response = self::$client->get('/api/packages.php');

        $this->assertSame(200, $response['status']);
        $this->assertTrue($response['body']['ok'] ?? false);
        $this->assertNotEmpty($response['body']['packages']);
        $this->assertNotEmpty($response['body']['carTypes']);
        $this->assertNotEmpty($response['body']['branches']);
        $this->assertNotEmpty($response['body']['paymentMethods']);
    }

    public function testPricingEndpointCalculatesPrice(): void
    {
        $response = self::$client->get('/api/pricing.php?package=full&car_type=suv');

        $this->assertSame(200, $response['status']);
        $this->assertTrue($response['body']['ok'] ?? false);
        $this->assertSame(340, $response['body']['price']);
    }

    public function testPricingRejectsMissingParams(): void
    {
        $response = self::$client->get('/api/pricing.php');

        $this->assertSame(400, $response['status']);
        $this->assertFalse($response['body']['ok'] ?? true);
    }

    public function testStaticPagesAreServed(): void
    {
        foreach (['index.html', 'login.html', 'customer-login.html', 'admin.html'] as $page) {
            $ch = curl_init(self::baseUrl() . '/' . $page);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_NOBODY => true,
                CURLOPT_TIMEOUT => 5,
            ]);
            curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $this->assertSame(200, $status, "Expected 200 for {$page}");
        }
    }
}
