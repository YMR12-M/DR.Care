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
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(6,6,6,0.96)',
        backdropFilter: 'blur(20px)',
        boxShadow: 'var(--shadow-floating)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex h-16 px-2 py-1.5 gap-1">
        {tabs.map(({ path, label, Icon }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-200 active:scale-95"
              style={{
                color: isActive ? '#0a0800' : '#6e6860',
                background: isActive ? 'var(--yellow)' : 'transparent',
                boxShadow: isActive ? 'var(--shadow-yellow-glow)' : 'none',
              }}
              type="button"
            >
              <Icon size={19} strokeWidth={isActive ? 2.6 : 2.1} fill={isActive ? '#0a0800' : 'none'} fillOpacity={isActive ? 0.12 : 0} />
              <span className="text-[10px] font-bold leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
