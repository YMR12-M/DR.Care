<?php
// DR.Care — Config (packages, car types, branches, payment methods)
return [
  'packages' => [
    ['code' => 'quick',  'name' => 'غسلة سريعة', 'price' => 150],
    ['code' => 'full',   'name' => 'Full Care',   'price' => 280],
    ['code' => 'detail', 'name' => 'دكتور العربية', 'price' => 650],
    ['code' => 'fleet',  'name' => 'باقات الشركات', 'price' => 0]
  ],
  'carTypes' => [
    ['code' => 'sedan',  'name' => 'سيدان',    'extra' => 0],
    ['code' => 'suv',    'name' => 'SUV',      'extra' => 60],
    ['code' => 'van',    'name' => 'فان',      'extra' => 90],
    ['code' => 'pickup', 'name' => 'نقل خفيف','extra' => 120]
  ],
  'branches' => ['قليوب شارع الملحاني'],
  'paymentMethods' => ['كاش', 'Instapay', 'Vodafone Cash', 'بطاقة بنكية']
];
