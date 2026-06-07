<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

use DRCare\Tests\Support\TestServer;

register_shutdown_function(static function (): void {
    TestServer::shutdown();
});
