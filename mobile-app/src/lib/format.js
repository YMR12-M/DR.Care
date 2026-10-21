/* Small formatting helpers shared by the brand components.
   UI numerals stay Western (matches phone numbers, prices in the API, what people type);
   Arabic-Indic digits are reserved for the licence plate, where they're authentic. */

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export const toArabicDigits = v => String(v ?? '').replace(/\d/g, d => AR_DIGITS[d]);

export const toWesternDigits = v =>
  String(v ?? '')
    .replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d))
    .replace(/[۰-۹]/g, d => FA_DIGITS.indexOf(d));

/* "أ ب ج 1234" → { letters: ['أ','ب','ج'], digits: '1234' }. Free text that doesn't fit the
   pattern is returned as `raw` so old bookings with odd plates still display. */
export function parsePlate(value) {
  const text = toWesternDigits(value || '').trim();
  if (!text) return { letters: [], digits: '', raw: '' };
  const digits = (text.match(/\d+/g) || []).join('');
  const letters = Array.from(text.replace(/[\d\s\-_/.]+/g, '')).filter(ch => /\p{L}/u.test(ch));
  const fits = letters.length <= 3 && digits.length <= 4;
  return { letters: fits ? letters : [], digits: fits ? digits : '', raw: fits ? '' : text };
}

export function composePlate(letters, digits) {
  const l = (letters || []).join(' ');
  const d = toWesternDigits(digits || '').replace(/\D/g, '').slice(0, 4);
  return [l, d].filter(Boolean).join(' ');
}

/* Is the wash open right now? Hours are 12:00 – 22:00 Cairo time, every day. */
export const OPEN_HOUR = 12;
export const CLOSE_HOUR = 22;
export function isOpenNow(now = new Date()) {
  let h;
  try {
    h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: 'numeric', hourCycle: 'h23' }).format(now));
  } catch {
    h = now.getHours();
  }
  return h >= OPEN_HOUR && h < CLOSE_HOUR;
}

/* Deterministic pseudo-random bar pattern for the ticket barcode (same id → same bars). */
export function barcodeBars(seed, count = 38) {
  let s = (Number(String(seed).replace(/\D/g, '')) || 7) * 2654435761 % 4294967296;
  const next = () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 374761393) >>> 0) / 4294967296);
  const bars = [];
  for (let i = 0; i < count; i++) bars.push({ w: 1 + Math.floor(next() * 3), gap: 1 + Math.floor(next() * 2) });
  return bars;
}
