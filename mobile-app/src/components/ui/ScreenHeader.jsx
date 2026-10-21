import { ArrowRight } from 'lucide-react';

/* Sticky title bar for pushed screens (edit profile, forgot password, …): square back key + painted title. */
export default function ScreenHeader({ title, onBack, children }) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3"
      style={{ background: 'var(--black)', borderBottom: '2px solid var(--line-2)', paddingTop: 'calc(0.75rem + var(--safe-top))' }}
    >
      <button
        type="button" onClick={onBack} aria-label="رجوع"
        className="w-10 h-10 flex items-center justify-center flex-shrink-0 active:translate-y-0.5 transition-transform"
        style={{ background: 'var(--panel-3)', borderRadius: 8, color: 'var(--white-2)' }}
      >
        <ArrowRight size={20} strokeWidth={2.6} />
      </button>
      <h1 className="font-display text-[1.7rem] leading-none flex-1 min-w-0 truncate">{title}</h1>
      {children}
    </header>
  );
}
