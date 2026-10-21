import { ChevronLeft } from 'lucide-react';

/* The customer's DR.Care card: hazard top edge, lanyard slot, initial on a yellow sign,
   and (optionally) the points balance on a little LED display. */
export default function MemberCard({ name, email, phone, points, onPoints, children, className = '' }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: 'var(--panel-2)', border: '2px solid var(--steel)', borderRadius: 12, boxShadow: '0 4px 0 rgba(0,0,0,0.45)' }}>
      <div className="hazard hazard--sm" />
      <div className="px-4 pb-4 pt-2.5">
        <div className="flex justify-center mb-3" aria-hidden="true">
          <span style={{ width: 46, height: 9, borderRadius: 5, background: 'var(--black)', border: '2px solid var(--steel)' }} />
        </div>
        <div className="flex items-center gap-4">
          <span className="font-display flex items-center justify-center flex-shrink-0 pt-1.5" style={{ width: 64, height: 64, fontSize: '2.3rem', background: 'var(--yellow)', color: 'var(--on-yellow)', borderRadius: 10 }}>
            {(name || 'أ').trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-[1.6rem] leading-tight truncate">{name || '...'}</h2>
            {email && <p className="text-[13px] mt-0.5 truncate" style={{ color: 'var(--muted)' }} dir="ltr" >{email}</p>}
            {phone && <p className="text-[13px] num" style={{ color: 'var(--muted)' }} dir="ltr">{phone}</p>}
          </div>
        </div>
        {points != null && points > 0 && (
          <button
            type="button" onClick={onPoints}
            className="mt-4 w-full flex items-center gap-3 p-2.5 active:translate-y-0.5 transition-transform"
            style={{ background: 'var(--panel)', border: '2px solid var(--line-2)', borderRadius: 8 }}
          >
            <span className="led-board inline-flex items-baseline gap-1.5 px-3 py-1" style={{ borderRadius: 5 }}>
              <span className="led num relative z-[1]" style={{ fontSize: 30 }}>{points}</span>
            </span>
            <span className="flex-1 text-right text-[13px] font-bold" style={{ color: 'var(--white-2)' }}>نقطة ولاء — استبدلها بخصم</span>
            <ChevronLeft size={18} style={{ color: 'var(--yellow)' }} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
