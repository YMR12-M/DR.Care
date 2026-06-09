<?php
declare(strict_types=1);

namespace DRCare\Tests\Integration;

use DRCare\Tests\Support\ApiTestCase;
use DRCare\Tests\Support\HttpClient;

final class ReviewsTest extends ApiTestCase
{
    public function testReviewRequiresCompletedBooking(): void
    {
        $customer = new HttpClient(self::baseUrl());
        $email = $this->uniqueEmail();
        $this->registerCustomer($customer, $email);

        $created = $this->createBooking($customer, ['email' => $email]);
        $bookingId = $created['response']['body']['booking']['id'] ?? null;

        $token = $this->csrfToken($customer);
        $early = $customer->post('/api/reviews.php', [
            'booking_id' => $bookingId,
            'rating' => 5,
            'comment' => 'مبكر',
        ], ['X-CSRF-Token' => $token]);

        $this->assertSame(400, $early['status']);

        $this->loginAdmin(self::$adminClient);
        $adminCsrf = $this->csrfToken(self::$adminClient);
        self::$adminClient->patch('/api/bookings.php', [
            'id' => $bookingId,
            'status' => 'completed',
        ], ['X-CSRF-Token' => $adminCsrf]);

        $review = $customer->post('/api/reviews.php', [
            'booking_id' => $bookingId,
            'rating' => 5,
            'comment' => 'خدمة ممتازة',
        ], ['X-CSRF-Token' => $token]);

        $this->assertSame(200, $review['status']);
        $this->assertTrue($review['body']['ok'] ?? false);

        $duplicate = $customer->post('/api/reviews.php', [
            'booking_id' => $bookingId,
            'rating' => 4,
        ], ['X-CSRF-Token' => $token]);
        $this->assertSame(409, $duplicate['status']);

        $public = self::$client->get('/api/reviews.php');
        $this->assertSame(200, $public['status']);
        $this->assertNotEmpty($public['body']['reviews']);

        $customer->cleanup();
    }

    public function testReviewsListIsPublic(): void
    {
        $response = self::$client->get('/api/reviews.php');
        $this->assertSame(200, $response['status']);
        $this->assertTrue($response['body']['ok'] ?? false);
        $this->assertIsArray($response['body']['reviews'] ?? null);
    }
}
