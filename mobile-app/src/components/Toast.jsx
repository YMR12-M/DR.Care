import { useToast } from '../hooks/useToast';

const TYPE_STYLES = {
  success: { bg: 'rgba(111,207,71,0.15)', border: 'rgba(111,207,71,0.35)', color: '#6fcf47' },
  error:   { bg: 'rgba(240,83,62,0.15)',  border: 'rgba(240,83,62,0.35)',  color: '#f0533e' },
  info:    { bg: 'rgba(255,210,31,0.12)', border: 'rgba(255,210,31,0.30)', color: '#ffd21f' },
};

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export default function Toast() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex flex-col gap-2 pointer-events-none"
      style={{ padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}
    >
      {toasts.map((t) => {
        const s = TYPE_STYLES[t.type] || TYPE_STYLES.info;
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 pointer-events-auto cursor-pointer"
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              backdropFilter: 'blur(16px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              animation: 'slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{ background: s.border, color: s.color }}
            >
              {ICONS[t.type]}
            </span>
            <span className="text-sm font-bold flex-1" style={{ color: s.color }}>
              {t.msg}
            </span>
          </div>
        );
      })}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)     scale(1); }
        }
      `}</style>
    </div>
  );
}
