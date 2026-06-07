<?php
require_once __DIR__ . '/bootstrap.php';
startSession();
jsonResponse(['ok' => true, 'token' => getCsrfToken()]);
