import { parsePlate, composePlate, toArabicDigits, toWesternDigits } from '../../lib/format';

/* An Egyptian private-car plate: blue field, white letters, Arabic-Indic digits.
   <Plate value="أ ب ج 1234" /> for display, <PlateInput /> to type one in place. */

export default function Plate({ value, size = 'md', className = '' }) {
  const { letters, digits, raw } = parsePlate(value);
  if (!letters.length && !digits && !raw) return null;
  return (
    <span className={`plate plate--${size} ${className}`} role="img" aria-label={`لوحة السيارة ${value}`}>
      <span className="plate__country" aria-hidden="true">مصر</span>
      {raw ? (
        <span className="plate__raw" dir="auto">{raw}</span>
      ) : (
        <span className="plate__row" aria-hidden="true">
          <span className="plate__letters">{letters.join(' ')}</span>
          <i className="plate__sep" />
          <span className="plate__digits" dir="ltr">{toArabicDigits(digits)}</span>
        </span>
      )}
    </span>
  );
}

export function PlateInput({ value, onChange, className = '' }) {
  const { letters, digits } = parsePlate(value);

  const setLetters = e => {
    const next = Array.from(e.target.value.toUpperCase()).filter(ch => /\p{L}/u.test(ch)).slice(0, 3);
    onChange(composePlate(next, digits));
  };
  /* shown with spaces so every letter keeps its standalone (non-joined) shape, like on a real plate */
  const setDigits = e => {
    const next = toWesternDigits(e.target.value).replace(/\D/g, '').slice(0, 4);
    onChange(composePlate(letters, next));
  };

  return (
    <span className={`plate plate--lg plate--input ${className}`}>
      <span className="plate__country" aria-hidden="true">مصر</span>
      <span className="plate__row">
        <input
          className="plate__field plate__field--letters"
          value={letters.join(' ')} onChange={setLetters}
          placeholder="أ ب ج" aria-label="حروف اللوحة" maxLength={5} autoComplete="off" autoCapitalize="characters"
        />
        <i className="plate__sep" />
        <input
          className="plate__field plate__field--digits" dir="ltr"
          value={toArabicDigits(digits)} onChange={setDigits}
          placeholder="١٢٣٤" aria-label="أرقام اللوحة" inputMode="numeric" maxLength={4} autoComplete="off"
        />
      </span>
    </span>
  );
}
