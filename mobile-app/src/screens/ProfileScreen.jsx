import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, UserRoundPen, Gift, Phone, LogOut, User as UserIcon, ChevronLeft, Star } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { secureFetch } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconBadge from '../components/ui/IconBadge';

function MenuItem({ icon: Icon, label, onClick, danger, last }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold transition-colors active:opacity-70"
      style={{ color: danger ? 'var(--error)' : 'var(--white-2)', borderBottom: last ? 'none' : '1px solid var(--line)' }}
    >
      <IconBadge icon={Icon} size="sm" tone={danger ? 'panel' : 'panel'} />
      <span className="flex-1 text-right">{label}</span>
      <ChevronLeft size={16} style={{ color: 'var(--muted-2)' }} />
    </button>
  );
}

export default function ProfileScreen() {
  const navigate              = useNavigate();
  const { user, loading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);

  useEffect(() => {
    if (!user) return;
    secureFetch('../api/loyalty.php')
      .then(r => r.json())
      .then(d => setLoyaltyBalance(d?.balance || 0))
      .catch(() => {});
  }, [user]);

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
        <IconBadge icon={UserIcon} size="lg" tone="yellow" className="mb-4" />
        <h2 className="text-lg font-black mb-2" style={{ color: 'var(--white)' }}>حسابك</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>سجل دخولك لمتابعة حجوزاتك وبياناتك</p>
        <Button variant="primary" size="lg" onClick={() => navigate('/login')} className="w-full mb-3">
          تسجيل الدخول
        </Button>
        <Button variant="secondary" size="lg" onClick={() => navigate('/register')} className="w-full">
          إنشاء حساب جديد
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content" style={{ background: 'var(--black)' }}>
      <header
        className="sticky top-0 z-40 px-5 py-4"
        style={{ background: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)' }}
      >
        <h1 className="text-lg font-black" style={{ color: 'var(--white)' }}>حسابي</h1>
      </header>

      {/* Profile Card */}
      <Card className="mx-5 mt-5 p-5 relative overflow-hidden fade-in">
        {/* glow */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: 'var(--yellow)' }}/>
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0"
            style={{
              background: 'linear-gradient(155deg, var(--yellow) 0%, var(--yellow-2) 100%)', color: '#0a0800',
              boxShadow: 'var(--shadow-yellow-glow)',
            }}>
            {user.name?.[0] || 'أ'}
          </div>
          <div>
            <h2 className="font-black text-lg leading-none" style={{ color: 'var(--white)' }}>{user.name}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{user.email}</p>
            {user.phone && <p className="text-sm" style={{ color: 'var(--muted)' }}>{user.phone}</p>}
          </div>
        </div>
        {loyaltyBalance > 0 && (
          <button
            type="button"
            onClick={() => navigate('/coupons')}
            className="relative mt-4 w-full rounded-xl p-3 flex items-center gap-2 active:scale-[0.98] transition-transform"
            style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)' }}
          >
            <Star size={20} fill="var(--yellow)" stroke="var(--yellow)" />
            <div className="text-right flex-1">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>نقاط الولاء</p>
              <p className="font-black" style={{ color: 'var(--yellow)' }}>{loyaltyBalance} نقطة</p>
            </div>
            <ChevronLeft size={16} style={{ color: 'var(--yellow)' }} />
          </button>
        )}
      </Card>

      {/* Menu */}
      <Card className="mx-5 mt-4 overflow-hidden fade-in fade-in-1">
        <MenuItem icon={ClipboardList} label="حجوزاتي"       onClick={() => navigate('/bookings')} />
        <MenuItem icon={UserRoundPen}  label="تعديل البيانات" onClick={() => navigate('/edit-profile')} />
        <MenuItem icon={Gift}          label="كوبونات الخصم"  onClick={() => navigate('/coupons')} />
        <MenuItem icon={Phone}         label="تواصل معنا"     onClick={() => window.open('tel:+201037957593')} last />
      </Card>

      <Card className="mx-5 mt-4 overflow-hidden fade-in fade-in-2">
        <button type="button" onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold active:opacity-70"
          style={{ color: 'var(--error)' }}>
          <IconBadge icon={LogOut} size="sm" tone="panel" />
          <span className="flex-1 text-right">{loggingOut ? 'جاري الخروج...' : 'تسجيل الخروج'}</span>
        </button>
      </Card>

      <p className="text-center text-xs mt-6 mb-2" style={{ color: 'var(--muted-2)' }}>
        DR.Care v2.0 — مغسلة عربيات مصرية
      </p>
    </div>
  );
}
