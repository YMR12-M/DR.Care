<?php
declare(strict_types=1);

namespace DRCare\Tests\Unit;

use BookingStateMachine;
use BookingTransitionException;
use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/api/BookingStateMachine.php';

final class BookingStateMachineTest extends TestCase
{
    public function testSameStateIsAlwaysAllowedAsNoOp(): void
    {
        foreach (BookingStateMachine::STATES as $state) {
            $this->assertTrue(BookingStateMachine::canTransition($state, $state, 'admin'));
            $this->assertTrue(BookingStateMachine::canTransition($state, $state, 'pos'));
            $this->assertTrue(BookingStateMachine::canTransition($state, $state, 'customer'));
        }
    }

    public function testAdminAndPosCanAdvanceTheHappyPath(): void
    {
        $this->assertTrue(BookingStateMachine::canTransition('new', 'confirmed', 'admin'));
        $this->assertTrue(BookingStateMachine::canTransition('new', 'confirmed', 'pos'));
        $this->assertTrue(BookingStateMachine::canTransition('confirmed', 'in_service', 'admin'));
        $this->assertTrue(BookingStateMachine::canTransition('confirmed', 'in_service', 'pos'));
        $this->assertTrue(BookingStateMachine::canTransition('in_service', 'completed', 'admin'));
        $this->assertTrue(BookingStateMachine::canTransition('in_service', 'completed', 'pos'));
    }

    public function testCustomerCanOnlyCancelFromNewOrConfirmed(): void
    {
        $this->assertTrue(BookingStateMachine::canTransition('new', 'cancelled', 'customer'));
        $this->assertTrue(BookingStateMachine::canTransition('confirmed', 'cancelled', 'customer'));
        $this->assertFalse(BookingStateMachine::canTransition('in_service', 'cancelled', 'customer'));
        $this->assertFalse(BookingStateMachine::canTransition('completed', 'cancelled', 'customer'));
    }

    public function testCustomerCannotAdvanceStatus(): void
    {
        $this->assertFalse(BookingStateMachine::canTransition('new', 'confirmed', 'customer'));
        $this->assertFalse(BookingStateMachine::canTransition('confirmed', 'in_service', 'customer'));
        $this->assertFalse(BookingStateMachine::canTransition('in_service', 'completed', 'customer'));
    }

    public function testCompletedAndCancelledAreFinal(): void
    {
        foreach (['new', 'confirmed', 'in_service', 'cancelled'] as $to) {
            $this->assertFalse(BookingStateMachine::canTransition('completed', $to, 'admin'));
        }
        foreach (['new', 'confirmed', 'in_service', 'completed'] as $to) {
            $this->assertFalse(BookingStateMachine::canTransition('cancelled', $to, 'admin'));
        }
    }

    public function testCannotSkipStatesEvenAsAdmin(): void
    {
        $this->assertFalse(BookingStateMachine::canTransition('new', 'in_service', 'admin'));
        $this->assertFalse(BookingStateMachine::canTransition('new', 'completed', 'admin'));
        $this->assertFalse(BookingStateMachine::canTransition('confirmed', 'completed', 'admin'));
    }

    public function testAssertTransitionThrowsOnInvalidMove(): void
    {
        $this->expectException(BookingTransitionException::class);
        BookingStateMachine::assertTransition('completed', 'new', 'admin');
    }

    public function testAssertTransitionPassesSilentlyOnValidMove(): void
    {
        BookingStateMachine::assertTransition('new', 'confirmed', 'admin');
        $this->assertTrue(true);
    }

    public function testIsValidState(): void
    {
        $this->assertTrue(BookingStateMachine::isValidState('new'));
        $this->assertFalse(BookingStateMachine::isValidState('bogus'));
    }

    public function testClearsPaymentScreenshotOnlyForTerminalStates(): void
    {
        $this->assertTrue(BookingStateMachine::clearsPaymentScreenshot('completed'));
        $this->assertTrue(BookingStateMachine::clearsPaymentScreenshot('cancelled'));
        $this->assertFalse(BookingStateMachine::clearsPaymentScreenshot('new'));
        $this->assertFalse(BookingStateMachine::clearsPaymentScreenshot('confirmed'));
        $this->assertFalse(BookingStateMachine::clearsPaymentScreenshot('in_service'));
    }
}
