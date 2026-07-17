/* ─── Fallback data (used only if api/packages.php is unreachable) ─────────
   Single source of truth for these constants — do not redefine locally in screens. */
export const FALLBACK_PACKAGES = [
  { code: 'inside-out', name: 'غسيل داخلي وخارجي', price: 150 },
  { code: 'outside',    name: 'غسيل خارجي فقط',    price: 100 },
  { code: 'deep',       name: 'Deep Cleaning',       price: 250 },
  { code: 'cover',      name: 'غسيل غطاء السيارة',  price: 50  },
  { code: 'rims',       name: 'جنوط وكاوتش',         price: 100 },
  { code: 'engine',     name: 'موتور السيارة',        price: 100 },
  { code: 'chemical',   name: 'الغسيل الكيماوي',     price: 0   },
  { code: 'carpet',     name: 'غسيل سجاد',           price: 0   },
  { code: 'blanket',    name: 'غسيل بطاطين',         price: 80  },
];

export const FALLBACK_CAR_TYPES = [
  { code: 'sedan',  name: 'سيدان',    icon: '🚗', extra: 0   },
  { code: 'suv',    name: 'SUV',      icon: '🚙', extra: 60  },
  { code: 'van',    name: 'فان',      icon: '🚐', extra: 90  },
  { code: 'pickup', name: 'نقل خفيف', icon: '🛻', extra: 120 },
];

export const FALLBACK_BRANCHES = ['قليوب — شارع العروبة'];
export const FALLBACK_PAYMENT_METHODS = ['كاش', 'Instapay'];

/* Display-only icon lookup — never affects the value sent to the API */
export const PAYMENT_METHOD_ICONS = { 'كاش': '💵', 'Instapay': '📱' };

export async function fetchConfig() {
  const r = await fetch('/api/packages.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  const d = await r.json();
  return {
    packages:        d?.packages?.length        ? d.packages        : FALLBACK_PACKAGES,
    carTypes:        d?.carTypes?.length         ? d.carTypes        : FALLBACK_CAR_TYPES,
    branches:        d?.branches?.length         ? d.branches        : FALLBACK_BRANCHES,
    paymentMethods:  d?.paymentMethods?.length   ? d.paymentMethods  : FALLBACK_PAYMENT_METHODS,
    instapayNumber:  d?.instapayNumber ?? null,
  };
}
