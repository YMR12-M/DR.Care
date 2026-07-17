<?php
// DR.Care — Config (packages, car types, branches, payment methods)
return [
  'packages' => [
    ['code' => 'inside-out', 'name' => 'غسيل داخلي وخارجي',          'price' => 150],
    ['code' => 'outside',    'name' => 'غسيل خارجي فقط',              'price' => 100],
    ['code' => 'deep',       'name' => 'غسيل متخصص (Deep Cleaning)',  'price' => 250],
    ['code' => 'cover',      'name' => 'غسيل غطاء السيارة',           'price' => 50],
    ['code' => 'rims',       'name' => 'غسيل وتنظيف جنوط السيارة',   'price' => 100],
    ['code' => 'engine',     'name' => 'غسيل موتور السيارة',          'price' => 100],
    ['code' => 'chemical',   'name' => 'الغسيل الكيماوي',             'price' => 0],
    ['code' => 'carpet',     'name' => 'غسيل سجاد',                   'price' => 0],
    ['code' => 'blanket',    'name' => 'غسيل بطاطين',                 'price' => 80]
  ],
  'carTypes' => [
    ['code' => 'sedan',  'name' => 'سيدان',    'extra' => 0],
    ['code' => 'suv',    'name' => 'SUV',      'extra' => 60],
    ['code' => 'van',    'name' => 'فان',      'extra' => 90],
    ['code' => 'pickup', 'name' => 'نقل خفيف','extra' => 120]
  ],
  'expenseCategories' => [
    ['code' => 'salaries',    'name' => 'مرتبات العمالة'],
    ['code' => 'maids',       'name' => 'الخادمات'],
    ['code' => 'maintenance', 'name' => 'الصيانة'],
    ['code' => 'electricity', 'name' => 'الكهرباء'],
    ['code' => 'rent',        'name' => 'الإيجار'],
    ['code' => 'other',       'name' => 'أخرى']
  ],
  'branches' => ['قليوب — شارع العروبة'],
  'paymentMethods'  => ['كاش', 'Instapay'],
  'instapayNumber'  => '01037957593'
];
