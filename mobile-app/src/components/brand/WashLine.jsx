import { Check } from 'lucide-react';
import CarArt from './CarArt';

/* "خط الغسيل" — the one progress device used across the app. A car rolls along the wash line
   from right to left (RTL); each station is a sign on the track. Used for booking status,
   booking steps and loyalty rewards.

     stage   0-based index of the station the car is standing at
     labels  one string per station (length = number of stations, default 4)
     tone    'water' shows the shower over the car while a wash is in progress
*/

const BOOKING_STATIONS = ['استلمنا حجزك', 'الموعد اتأكد', 'بنغسلها دلوقتي', 'جاهزة'];

export default function WashLine({ stage = 0, labels = BOOKING_STATIONS, car = 'sedan', washing = false, compact = false, finish = true, ariaLabel, className = '' }) {
  const n = labels.length;
  const last = n - 1;
  const clamped = Math.max(0, Math.min(last, stage));      // may be fractional (car between stations)
  const atStation = Number.isInteger(clamped);
  const inset = 100 / (2 * n);              // station centres sit at 1/(2n) .. 1-1/(2n)
  const span = 100 - 2 * inset;
  const posAt = i => inset + (last ? (i / last) * span : 0);   // % from the right edge
  const fillPct = last ? (clamped / last) * 100 : 0;
  const done = finish && clamped === last;   // `finish={false}` for steppers: the last station isn't "complete" yet

  const carW = compact ? 50 : 62;
  const carH = (carW * 70) / 160;
  const trackTop = compact ? 28 : 46;

  return (
    <div className={`relative ${className}`} style={{ height: trackTop + (compact ? 26 : 58) }} role="img" aria-label={ariaLabel || `المرحلة ${Math.floor(clamped) + 1} من ${n}`}>
      {/* road */}
      <div className="absolute" style={{ insetInline: `${inset}%`, top: trackTop, height: 10, background: 'var(--panel-3)', borderRadius: 2, overflow: 'hidden' }}>
        <div
          className={`hazard hazard--sm ${washing ? 'hazard--belt' : ''}`}
          style={{ position: 'absolute', top: 0, bottom: 0, right: 0, height: 'auto', width: `${fillPct}%`, transition: 'width 0.6s cubic-bezier(0.2,0.8,0.2,1)' }}
        />
      </div>

      {/* stations */}
      {labels.map((label, i) => {
        const reached = i <= clamped + 1e-6;
        const here = atStation && i === clamped;
        return (
          <div key={i} className="absolute flex flex-col items-center" style={{ right: `${posAt(i)}%`, transform: 'translateX(50%)', top: trackTop + 5 - 10, width: `${100 / n}%` }}>
            <span
              className="flex items-center justify-center"
              style={{
                width: 20, height: 20, borderRadius: 5,
                background: reached ? 'var(--yellow)' : 'var(--panel-2)',
                border: `3px solid var(--black)`,
                outline: `2px solid ${reached ? 'var(--yellow)' : 'var(--steel)'}`,
                color: 'var(--on-yellow)',
              }}
            >
              {reached && !here && <Check size={11} strokeWidth={4} />}
              {here && !done && <span style={{ width: 6, height: 6, borderRadius: 1, background: 'var(--on-yellow)' }} />}
              {here && done && <Check size={11} strokeWidth={4} />}
            </span>
            {!compact && (
              <span className="text-center font-semibold leading-snug" style={{ marginTop: 9, fontSize: 11, color: reached ? 'var(--white)' : 'var(--muted-2)', maxWidth: 76 }}>
                {label}
              </span>
            )}
          </div>
        );
      })}

      {/* the car */}
      <div className="absolute" style={{ right: `${posAt(clamped)}%`, transform: 'translateX(50%)', top: trackTop + 3 - carH, width: carW, transition: 'right 0.7s cubic-bezier(0.3,0.9,0.3,1)' }}>
        {washing && (
          <svg viewBox="0 0 40 18" width={carW * 0.62} height={carW * 0.62 * 0.45} style={{ position: 'absolute', top: -carW * 0.28, left: '50%', transform: 'translateX(-50%)' }} aria-hidden="true">
            <g stroke="var(--water)" strokeWidth="2" strokeLinecap="round" fill="none">
              <path className="hs-jet" d="M8 0 L5 17" /><path className="hs-jet" style={{ animationDelay: '.2s' }} d="M20 0 V17" /><path className="hs-jet" style={{ animationDelay: '.4s' }} d="M32 0 L35 17" />
            </g>
          </svg>
        )}
        <CarArt type={car} style={{ color: done ? 'var(--success)' : 'var(--yellow)', display: 'block', width: '100%', animation: washing ? 'carIdle 0.5s ease-in-out infinite' : 'none' }} />
      </div>
    </div>
  );
}
