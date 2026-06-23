import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors active:bg-slate-50 ${danger ? 'text-red-500' : 'text-slate-700'}`}
    >
      <span className="text-xl w-6 text-center">{icon}</span>
      <span className="flex-1 text-right">{label}</span>
      <svg className="w-4 h-4 text-slate-300 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  );
}

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"/>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-4xl mb-4">👤</div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">حسابك</h2>
        <p className="text-sm text-slate-500 mb-6">سجل دخولك لمتابعة حجوزاتك وبياناتك</p>
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold text-base active:scale-95 transition-transform mb-3"
        >
          تسجيل الدخول
        </button>
        <button
          onClick={() => navigate('/register')}
          className="w-full bg-slate-100 text-slate-700 py-3.5 rounded-2xl font-bold text-base active:scale-95 transition-transform"
        >
          إنشاء حساب جديد
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-4">
        <h1 className="text-base font-bold text-slate-800">حسابي</h1>
      </header>

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 mx-4 mt-4 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-black">
            {user.name?.[0] || 'أ'}
          </div>
          <div>
            <h2 className="font-bold text-lg leading-none">{user.name}</h2>
            <p className="text-blue-200 text-sm mt-1">{user.email}</p>
            {user.phone && <p className="text-blue-200 text-sm">{user.phone}</p>}
          </div>
        </div>
        {user.loyalty_points > 0 && (
          <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <div>
              <p className="text-xs text-blue-200">نقاط الولاء</p>
              <p className="font-bold">{user.loyalty_points} نقطة</p>
            </div>
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="bg-white rounded-2xl border border-slate-100 mx-4 mt-4 overflow-hidden divide-y divide-slate-50">
        <MenuItem icon="📋" label="حجوزاتي" onClick={() => navigate('/bookings')} />
        <MenuItem icon="👤" label="تعديل البيانات" onClick={() => navigate('/edit-profile')} />
        <MenuItem icon="🎁" label="كوبونات الخصم" onClick={() => navigate('/coupons')} />
        <MenuItem icon="📞" label="تواصل معنا" onClick={() => window.open('tel:+201000000000')} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 mx-4 mt-3 overflow-hidden">
        <MenuItem
          icon="🚪"
          label={loggingOut ? 'جاري الخروج...' : 'تسجيل الخروج'}
          onClick={handleLogout}
          danger
        />
      </div>

      <p className="text-center text-xs text-slate-300 mt-6 mb-2">DR.Care v2.0 — مغسلة عربيات مصرية</p>
    </div>
  );
}
