import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

function getSecsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight - now) / 1000);
}

function formatCountdown(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

const MESSAGES = [
  'احجز اليوم — أول 5 حجوزات يومياً لهم أسبقية التنفيذ الفوري',
  'كاش أو Instapay',
  'قليوب — شارع العروبة · يومياً 12م – 10م',
];

/* The promo line is now an LED board over the wash-bay door: dot-matrix text scrolling the
   way Arabic tickers do (towards the right), with the daily countdown pinned at the start. */
export default function PromoBanner() {
  const [closed, setClosed] = useState(() => {
    try { return sessionStorage.getItem('dr_m_promo_closed') === '1'; } catch { return false; }
  });
  const [secs, setSecs] = useState(getSecsUntilMidnight);

  useEffect(() => {
    if (closed) return;
    const t = setInterval(() => setSecs(getSecsUntilMidnight()), 1000);
    return () => clearInterval(t);
  }, [closed]);

  const close = () => {
    setClosed(true);
    try { sessionStorage.setItem('dr_m_promo_closed', '1'); } catch { /* storage unavailable */ }
  };

  if (closed) return null;

  return (
    <div role="note" aria-label="عرض اليوم">
      <div className="led-board flex items-center" style={{ height: 38 }}>
        <span className="led num flex-shrink-0 px-3 relative z-10" style={{ fontSize: 22, background: '#000' }} dir="ltr" aria-label="الوقت المتبقي">
          {formatCountdown(secs)}
        </span>
        <div className="flex-1 min-w-0 overflow-hidden relative" aria-hidden="true">
          <div className="inline-flex" style={{ gap: 44, paddingInline: 22, animation: 'marquee 28s linear infinite', willChange: 'transform' }}>
            {[...MESSAGES, ...MESSAGES].map((m, i) => (
              <span key={i} className="led whitespace-nowrap" style={{ fontSize: 22 }}>{m}</span>
            ))}
          </div>
        </div>
        <button
          type="button" onClick={close} aria-label="إغلاق"
          className="flex-shrink-0 w-10 h-full flex items-center justify-center relative z-10 active:opacity-60"
          style={{ background: '#000', color: 'var(--yellow)' }}
        >
          <X size={15} strokeWidth={3} />
        </button>
      </div>
      <div className="hazard hazard--sm" />
    </div>
  );
}
