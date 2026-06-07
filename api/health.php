<?php
require_once __DIR__ . '/bootstrap.php';
jsonResponse(['ok' => true, 'uptime' => microtime(true)]);
