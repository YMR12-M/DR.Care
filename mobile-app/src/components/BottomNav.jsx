import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarPlus, ClipboardList, CircleUser } from 'lucide-react';

const tabs = [
  { path: '/',         label: 'الرئيسية', Icon: Home },
  { path: '/book',     label: 'احجز',     Icon: CalendarPlus },
  { path: '/bookings', label: 'حجوزاتي',  Icon: ClipboardList },
  { path: '/profile',  label: 'حسابي',    Icon: CircleUser },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed left-0 right-0 z-50 flex justify-center px-4"
      style={{ bottom: 'calc(14px + var(--safe-bottom))' }}
    >
      <div
        className="glass flex items-center gap-1.5 px-2.5 py-2.5 rounded-full"
        style={{ boxShadow: 'var(--shadow-premium)' }}
      >
        {tabs.map(({ path, label, Icon }) => {
          const isActive = path === '/'
            ? location.pathname === '/'
            : location.pathname === path || location.pathname.startsWith(path + '/');

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex items-center justify-center gap-2 rounded-full transition-all duration-300 active:scale-95"
              style={{
                color: isActive ? '#0a0800' : 'var(--muted)',
                background: isActive ? 'var(--gradient-gold)' : 'transparent',
                boxShadow: isActive ? '0 4px 16px rgba(255,210,31,0.35), inset 0 1px 0 rgba(255,255,255,0.35)' : 'none',
                padding: isActive ? '0.85rem 1.4rem' : '0.85rem 0.9rem',
              }}
              type="button"
            >
              <Icon size={24} strokeWidth={isActive ? 2.6 : 2.1} fill={isActive ? '#0a0800' : 'none'} fillOpacity={isActive ? 0.12 : 0} />
              {isActive && <span className="text-[13px] font-black leading-none whitespace-nowrap">{label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
