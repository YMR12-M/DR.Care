<?php
// Return config for frontend (packages, car types, branches, payment methods)
require_once __DIR__ . '/bootstrap.php';

$config = require __DIR__ . '/config.php';

jsonResponse(['ok' => true, 'packages' => $config['packages'], 'carTypes' => $config['carTypes'], 'branches' => $config['branches'], 'paymentMethods' => $config['paymentMethods'], 'instapayNumber' => $config['instapayNumber']]);
