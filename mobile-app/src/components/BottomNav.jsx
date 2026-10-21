import { useLocation, useNavigate } from 'react-router-dom';
import { GarageGlyph, TicketGlyph, ReceiptGlyph, WheelGlyph } from './brand/NavGlyphs';

const tabs = [
  { path: '/',         label: 'الرئيسية', Glyph: GarageGlyph },
  { path: '/book',     label: 'احجز',     Glyph: TicketGlyph },
  { path: '/bookings', label: 'حجوزاتي',  Glyph: ReceiptGlyph },
  { path: '/profile',  label: 'حسابي',    Glyph: WheelGlyph },
];

/* Docked rail, always labelled. The active tab lights up as a yellow sign plate. */
export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="fixed left-0 right-0 bottom-0 z-50"
      style={{ background: 'var(--black)', borderTop: '2px solid var(--line-2)', paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="flex">
        {tabs.map(({ path, label, Glyph }) => {
          const isActive = path === '/'
            ? location.pathname === '/'
            : location.pathname === path || location.pathname.startsWith(path + '/');

          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              aria-current={isActive ? 'page' : undefined}
              className="flex-1 flex flex-col items-center gap-1 pt-2 pb-2 active:opacity-70"
              style={{ color: isActive ? 'var(--white)' : 'var(--muted-2)' }}
            >
              <span
                className="flex items-center justify-center transition-colors duration-100"
                style={{
                  width: 50, height: 30, borderRadius: 7,
                  background: isActive ? 'var(--yellow)' : 'transparent',
                  color: isActive ? 'var(--on-yellow)' : 'currentColor',
                }}
              >
                <Glyph size={24} />
              </span>
              <span className="text-[11px] font-bold leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
