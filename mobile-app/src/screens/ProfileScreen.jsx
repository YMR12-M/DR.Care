import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold transition-colors"
      style={{ color: danger ? 'var(--error)' : 'var(--white-2)', borderBottom: '1px solid var(--line)' }}
    >
      <span className="text-xl w-6 text-center">{icon}</span>
      <span className="flex-1 text-right">{label}</span>
      <svg className="w-4 h-4 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        style={{ color: 'var(--muted-2)' }}>
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  );
}

export default function ProfileScreen() {
  const navigate              = useNavigate();
  const { user, loading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--black)' }}>
        <div className="w-10 h-10 rounded-full border-4 border-t-[#ffd21f]"
          style={{ borderColor: 'var(--panel-3)', borderTopColor: 'var(--yellow)', animation: 'spin 0.8s linear infinite' }}/>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--black)' }}>
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4"
          style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)' }}>👤</div>
        <h2 className="text-lg font-black mb-2" style={{ color: 'var(--white)' }}>حسابك</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>سجل دخولك لمتابعة حجوزاتك وبياناتك</p>
        <button onClick={() => navigate('/login')} className="w-full btn-yellow py-4 rounded-2xl text-base mb-3">
          تسجيل الدخول
        </button>
        <button onClick={() => navigate('/register')}
          className="w-full py-4 rounded-2xl text-base font-bold"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--white-2)' }}>
          إنشاء حساب جديد
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content" style={{ background: 'var(--black)' }}>
      <header
        className="sticky top-0 z-40 px-4 py-4"
        style={{ background: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)' }}
      >
        <h1 className="text-base font-black" style={{ color: 'var(--white)' }}>حسابي</h1>
      </header>

      {/* Profile Card */}
      <div className="mx-4 mt-4 rounded-2xl p-5 relative overflow-hidden"
        style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
        {/* glow */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: 'var(--yellow)' }}/>
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0"
            style={{ background: 'var(--yellow)', color: '#0a0800' }}>
            {user.name?.[0] || 'أ'}
          </div>
          <div>
            <h2 className="font-black text-lg leading-none" style={{ color: 'var(--white)' }}>{user.name}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{user.email}</p>
            {user.phone && <p className="text-sm" style={{ color: 'var(--muted)' }}>{user.phone}</p>}
          </div>
        </div>
        {user.loyalty_points > 0 && (
          <div className="relative mt-4 rounded-xl p-3 flex items-center gap-2"
            style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)' }}>
            <span className="text-xl">⭐</span>
            <div>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>نقاط الولاء</p>
              <p className="font-black" style={{ color: 'var(--yellow)' }}>{user.loyalty_points} نقطة</p>
            </div>
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
        <MenuItem icon="📋" label="حجوزاتي"       onClick={() => navigate('/bookings')} />
        <MenuItem icon="👤" label="تعديل البيانات" onClick={() => navigate('/edit-profile')} />
        <MenuItem icon="🎁" label="كوبونات الخصم"  onClick={() => navigate('/coupons')} />
        <MenuItem icon="📞" label="تواصل معنا"     onClick={() => window.open('tel:+201000000000')} />
      </div>

      <div className="mx-4 mt-3 rounded-2xl overflow-hidden" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
        <button type="button" onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold"
          style={{ color: 'var(--error)' }}>
          <span className="text-xl w-6 text-center">🚪</span>
          <span className="flex-1 text-right">{loggingOut ? 'جاري الخروج...' : 'تسجيل الخروج'}</span>
        </button>
      </div>

      <p className="text-center text-xs mt-6 mb-2" style={{ color: 'var(--muted-2)' }}>
        DR.Care v2.0 — مغسلة عربيات مصرية
      </p>
    </div>
  );
}
