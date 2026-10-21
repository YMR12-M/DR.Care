import { Check, X, Info } from 'lucide-react';
import { useToast } from '../hooks/useToast';

/* Toasts are flat sign strips: a coloured end-cap that carries the state, dark body, white text. */
const TYPE = {
  success: { color: 'var(--success)', Icon: Check },
  error:   { color: 'var(--error)',   Icon: X },
  info:    { color: 'var(--yellow)',  Icon: Info },
};

export default function Toast() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex flex-col gap-2 pointer-events-none"
      style={{ padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}
    >
      {toasts.map((t) => {
        const s = TYPE[t.type] || TYPE.info;
        return (
          <div
            key={t.id}
            role="status"
            onClick={() => dismiss(t.id)}
            className="flex items-stretch pointer-events-auto cursor-pointer overflow-hidden"
            style={{ background: 'var(--panel-2)', border: `2px solid ${s.color}`, borderRadius: 8, boxShadow: '0 4px 0 rgba(0,0,0,0.5)', animation: 'slideDown 0.28s cubic-bezier(0.2,0.9,0.3,1)' }}
          >
            <span className="flex items-center justify-center flex-shrink-0" style={{ width: 40, background: s.color, color: 'var(--on-yellow)' }}>
              <s.Icon size={18} strokeWidth={3.2} />
            </span>
            <span className="text-sm font-bold flex-1 px-3.5 py-3" style={{ color: 'var(--white)' }}>{t.msg}</span>
          </div>
        );
      })}
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
