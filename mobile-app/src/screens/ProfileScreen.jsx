import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, UserRoundPen, Gift, Phone, MapPin, LogOut, User as UserIcon, ChevronLeft, Star } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { secureFetch } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconBadge from '../components/ui/IconBadge';

/* Brand icons not in lucide-react — kept minimal, size/strokeWidth-compatible
   with how IconBadge calls its `icon` prop. */
function WhatsAppIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="currentColor">
      <path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.665 4.827 1.827 6.84L2 30l7.36-1.82A13.94 13.94 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.5a11.47 11.47 0 0 1-5.85-1.603l-.418-.25-4.37 1.08 1.1-4.27-.273-.44A11.5 11.5 0 1 1 16 27.5zm6.29-8.65c-.345-.173-2.044-1.01-2.36-1.124-.318-.115-.55-.173-.78.173-.23.346-.892 1.124-1.093 1.355-.2.23-.403.26-.748.086-.346-.173-1.46-.538-2.78-1.716-1.027-.917-1.72-2.048-1.922-2.394-.2-.346-.02-.533.15-.705.154-.155.346-.404.52-.606.172-.202.23-.346.345-.577.115-.23.058-.433-.03-.606-.086-.173-.78-1.88-1.068-2.575-.28-.676-.566-.583-.78-.593l-.664-.01c-.23 0-.605.086-.922.433-.317.346-1.21 1.183-1.21 2.886 0 1.703 1.24 3.348 1.413 3.578.173.23 2.44 3.726 5.91 5.224.826.356 1.47.569 1.974.728.829.264 1.584.226 2.18.137.665-.1 2.044-.835 2.333-1.642.288-.808.288-1.5.2-1.643-.086-.144-.317-.23-.663-.404z"/>
    </svg>
  );
}
function FacebookIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.17 2.1 15.99 2 14.75 2 12 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"/>
    </svg>
  );
}

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

/* Contact & social — the app's only WhatsApp entry point now (the old global
   floating button was removed), plus the site's real social links. */
function ContactCard({ className = '' }) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <MenuItem icon={Phone}       label="اتصال مباشر"        onClick={() => window.open('tel:+201037957593')} />
      <MenuItem icon={WhatsAppIcon} label="واتساب"             onClick={() => window.open('https://wa.me/201037957593?text=' + encodeURIComponent('مرحباً DR.Care 🚗 أريد الاستفسار عن الخدمات'), '_blank')} />
      <MenuItem icon={FacebookIcon} label="صفحتنا على فيسبوك"   onClick={() => window.open('https://www.facebook.com/Dr.Careforcars', '_blank')} />
      <MenuItem icon={MapPin}      label="الموقع على الخريطة" onClick={() => window.open('https://maps.google.com/maps?q=DR.Care+مغسلة+قليوب&hl=ar', '_blank')} last />
    </Card>
  );
}

export default function ProfileScreen() {
  const navigate              = useNavigate();
  const { user, loading, logout } = useAuth();
  const { showToast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);

  /* Hidden POS entry: 7 quick taps on the version line opens the POS */
  const posTaps = useRef({ count: 0, timer: null });
  const handleVersionTap = () => {
    const t = posTaps.current;
    clearTimeout(t.timer);
    t.count += 1;
    if (t.count >= 7) {
      t.count = 0;
      showToast('فتح نظام POS...', 'info');
      setTimeout(() => { window.location.href = '/CarWash-POS/'; }, 400);
      return;
    }
    t.timer = setTimeout(() => { t.count = 0; }, 1500);
  };

  useEffect(() => {
    if (!user) return;
    secureFetch('/api/loyalty.php')
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
      <div
        className="h-full relative overflow-hidden flex flex-col items-center justify-center px-7 text-center"
        style={{
          background: 'radial-gradient(ellipse 480px 380px at 50% 32%, rgba(255,210,31,0.09), transparent 62%), var(--black)',
        }}
      >
        <div className="absolute top-8 -right-16 w-56 h-56 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: 'var(--yellow)' }} />
        <div className="absolute bottom-24 -left-16 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: 'var(--cat-indigo)' }} />

        <div
          className="relative w-20 h-20 rounded-3xl flex items-center justify-center mb-5 gold-rim fade-in"
          style={{ background: 'var(--gradient-gold-soft)', border: '1px solid var(--yellow-line)', boxShadow: 'var(--shadow-gold-premium)' }}
        >
          <UserIcon size={30} style={{ color: 'var(--yellow)' }} strokeWidth={2.2} />
        </div>

        <h2 className="text-xl font-black mb-3 fade-in fade-in-1" style={{ color: 'var(--white)' }}>حسابك في DR.Care</h2>
        <p className="text-sm mb-9 leading-relaxed fade-in fade-in-2" style={{ color: 'var(--muted)' }}>
          سجّل دخولك عشان تتابع حجوزاتك، نقاط الولاء، وبياناتك في مكان واحد
        </p>

        <div className="w-full flex flex-col gap-3 fade-in fade-in-3">
          <Button variant="primary" size="lg" onClick={() => navigate('/login')} className="w-full">
            تسجيل الدخول
          </Button>
          <Button variant="ghost" size="md" onClick={() => navigate('/register')} className="w-full" style={{ border: '1px solid var(--line-2)' }}>
            إنشاء حساب جديد
          </Button>
        </div>

        <ContactCard className="w-full mt-8 fade-in fade-in-4" />
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

      {/* Profile Card — premium identity card, the app's "signature" surface */}
      <Card variant="premium" className="mx-5 mt-5 p-5 relative overflow-hidden fade-in">
        {/* glow */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: 'var(--yellow)' }}/>
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0"
            style={{
              background: 'var(--gradient-gold)', color: '#0a0800',
              boxShadow: 'var(--shadow-gold-premium)',
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
        <MenuItem icon={Gift}          label="كوبونات الخصم"  onClick={() => navigate('/coupons')} last />
      </Card>

      {/* Contact & social */}
      <p className="text-xs font-black mx-5 mt-5 mb-2" style={{ color: 'var(--muted)' }}>تواصل معنا وتابعنا</p>
      <ContactCard className="mx-5 fade-in fade-in-2" />

      <Card className="mx-5 mt-4 overflow-hidden fade-in fade-in-3">
        <button type="button" onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold active:opacity-70"
          style={{ color: 'var(--error)' }}>
          <IconBadge icon={LogOut} size="sm" tone="panel" />
          <span className="flex-1 text-right">{loggingOut ? 'جاري الخروج...' : 'تسجيل الخروج'}</span>
        </button>
      </Card>

      <p
        className="text-center text-xs mt-6 mb-2 select-none"
        style={{ color: 'var(--muted-2)' }}
        onClick={handleVersionTap}
      >
        DR.Care v2.0 — مغسلة عربيات مصرية
      </p>
    </div>
  );
}
