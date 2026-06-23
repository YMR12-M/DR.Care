import { useState, useEffect } from 'react';

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
    try { sessionStorage.setItem('dr_m_promo_closed', '1'); } catch {}
  };

  if (closed) return null;

  return (
    <div
      className="relative flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-bold"
      style={{
        background: 'var(--yellow)',
        color: '#0a0800',
      }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-base flex-shrink-0">🚗</span>
        <span className="truncate leading-tight">
          احجز اليوم — أول 5 حجوزات يومياً لهم أسبقية التنفيذ الفوري
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="font-black tabular-nums text-[11px] rounded px-1.5 py-0.5"
          style={{ background: 'rgba(0,0,0,0.15)', letterSpacing: '0.04em' }}
        >
          {formatCountdown(secs)}
        </span>
        <button
          onClick={close}
          className="w-5 h-5 flex items-center justify-center rounded-full font-black text-sm leading-none flex-shrink-0 active:scale-90 transition-transform"
          style={{ background: 'rgba(0,0,0,0.15)', color: '#0a0800' }}
          type="button"
          aria-label="إغلاق"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
