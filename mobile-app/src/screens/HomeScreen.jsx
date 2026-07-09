import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, CarFront, Bus, Truck, Droplets, Sparkles, Trophy, Disc, Shield, Wrench,
  FlaskConical, LayoutGrid, BedDouble, Star, MapPin, Phone, Clock, Gift,
  ChevronLeft, Loader2, CheckCircle2, Wallet,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PromoBanner from '../components/PromoBanner';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconBadge from '../components/ui/IconBadge';
import { FALLBACK_PACKAGES, FALLBACK_CAR_TYPES, fetchConfig } from '../lib/config';

const CAR_TYPE_ICONS = { sedan: Car, suv: CarFront, van: Bus, pickup: Truck };
const CAR_TYPES = FALLBACK_CAR_TYPES.map(c => ({ ...c, Icon: CAR_TYPE_ICONS[c.code] || Car }));

const STATUS_LABEL = { new: 'في الانتظار', confirmed: 'مؤكد', in_service: 'جاري التنفيذ' };
const STATUS_ICON  = { new: Clock, confirmed: CheckCircle2, in_service: Loader2 };

const SERVICE_CHIPS = [
  { Icon: Droplets,     name: 'خارجي',        code: 'outside' },
  { Icon: Sparkles,     name: 'داخلي وخارجي', code: 'inside-out' },
  { Icon: Trophy,       name: 'Deep Cleaning', code: 'deep' },
  { Icon: Disc,         name: 'جنوط',          code: 'rims' },
  { Icon: Shield,       name: 'الغطاء',        code: 'cover' },
  { Icon: Wrench,       name: 'الموتور',       code: 'engine' },
  { Icon: FlaskConical, name: 'كيماوي',        code: 'chemical' },
  { Icon: LayoutGrid,   name: 'سجاد',          code: 'carpet' },
  { Icon: BedDouble,    name: 'بطاطين',        code: 'blanket' },
];

/* ─── Active booking status card ─────────────────────── */
function ActiveBookingCard({ navigate }) {
  const [booking, setBooking] = useState(undefined); // undefined=loading, null=none

  useEffect(() => {
    fetch('../api/customer-bookings.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => {
        const active = (d.bookings || []).find(b => ['new', 'confirmed', 'in_service'].includes(b.status));
        setBooking(active || null);
      })
      .catch(() => setBooking(null));
  }, []);

  if (booking === undefined) {
    return <div className="w-full h-[68px] rounded-2xl skeleton" />;
  }
  if (!booking) return null;
  const Icon = STATUS_ICON[booking.status] || Clock;

  return (
    <button
      type="button"
      onClick={() => navigate('/bookings')}
      className="w-full flex items-center gap-3 rounded-2xl p-4 text-right active:scale-[0.98] transition-transform"
      style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', boxShadow: 'var(--shadow-yellow-glow)' }}
    >
      <IconBadge icon={Icon} size="md" tone="yellow" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold" style={{ color: 'var(--muted)' }}>حجزك الحالي — #{booking.id}</p>
        <p className="text-sm font-black" style={{ color: 'var(--yellow)' }}>{booking.package_name} · {STATUS_LABEL[booking.status]}</p>
      </div>
      <ChevronLeft size={16} style={{ color: 'var(--yellow)' }} />
    </button>
  );
}

/* ─── Package carousel card ──────────────────────────── */
function PackageCard({ pkg, navigate }) {
  const iconMap = { 'inside-out': Sparkles, outside: Droplets, deep: Trophy, cover: Shield, rims: Disc, engine: Wrench, chemical: FlaskConical, carpet: LayoutGrid, blanket: BedDouble };
  const Icon = iconMap[pkg.code] || Sparkles;
  return (
    <button
      type="button"
      onClick={() => navigate('/book', { state: { service: pkg.code } })}
      className="flex-shrink-0 w-40 text-right rounded-2xl p-5 active:scale-95 transition-transform"
      style={{ background: 'var(--panel-2)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--line-2)' }}
    >
      <IconBadge icon={Icon} size="md" tone="yellow" className="mb-3" />
      <p className="text-xs font-black mb-1 leading-tight" style={{ color: 'var(--white)' }}>{pkg.name}</p>
      <p className="text-sm font-black" style={{ color: 'var(--yellow)' }}>
        {pkg.price > 0 ? `${pkg.price} ج` : 'حسب الشغل'}
      </p>
    </button>
  );
}

/* ─── Compact price calculator ───────────────────────── */
function PriceCalculator({ packages }) {
  const navigate = useNavigate();
  const [pkgCode, setPkgCode] = useState('inside-out');
  const [carType, setCarType] = useState('sedan');
  const [bump, setBump] = useState(false);
  const prevTotal = useRef(null);
  const pkg = packages.find(p => p.code === pkgCode) || packages[0];
  const car = CAR_TYPES.find(c => c.code === carType);
  const total = (pkg?.price || 0) + (car?.extra || 0);

  useEffect(() => {
    if (prevTotal.current !== null && prevTotal.current !== total) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 350);
      return () => clearTimeout(t);
    }
    prevTotal.current = total;
  }, [total]);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <select
          value={pkgCode}
          onChange={e => setPkgCode(e.target.value)}
          className="flex-1 rounded-xl px-3 py-2.5 text-xs font-bold appearance-none"
          style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--white)' }}
        >
          {packages.filter(p => p.price > 0).map(p => (
            <option key={p.code} value={p.code} style={{ background: '#141414' }}>{p.name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {CAR_TYPES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCarType(c.code)}
              className="w-9 h-9 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
              style={{
                background: carType === c.code ? 'var(--yellow-soft)' : 'var(--panel-3)',
                border: `1px solid ${carType === c.code ? 'var(--yellow-line)' : 'var(--line-2)'}`,
                color: carType === c.code ? 'var(--yellow)' : 'var(--muted)',
              }}
              aria-label={c.name}
            >
              <c.Icon size={16} strokeWidth={2.2} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold" style={{ color: 'var(--muted)' }}>السعر التقديري</p>
          <p
            className="text-2xl font-black transition-transform duration-300"
            style={{ color: 'var(--yellow)', transform: bump ? 'scale(1.15)' : 'scale(1)' }}
          >
            {total} <span className="text-sm">ج</span>
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => navigate('/book', { state: { service: pkgCode, carType } })}>
          احجز
        </Button>
      </div>
    </Card>
  );
}

/* ─── Main Component ────────────────────────────────────── */
export default function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [packages, setPackages] = useState(FALLBACK_PACKAGES);
  const [avgRating, setAvgRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [loyaltyBalance, setLoyaltyBalance] = useState(null);

  useEffect(() => {
    fetchConfig().then(c => setPackages(c.packages)).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('../api/reviews.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => {
        const list = d?.reviews || [];
        if (list.length) {
          setAvgRating((list.reduce((s, r) => s + (Number(r.rating) || 0), 0) / list.length).toFixed(1));
          setReviewCount(list.length);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch('../api/loyalty.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => { if (d.ok) setLoyaltyBalance(d.balance); })
      .catch(() => {});
  }, [user]);

  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="h-full overflow-y-auto scroll-hide" style={{ background: 'var(--black)' }}>

      <PromoBanner />

      {/* Compact app bar — greeting instead of marketing headline */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3 fade-in">
        <div>
          <p className="text-xl font-black leading-none tracking-tight" style={{ color: 'var(--white)' }}>
            {user ? `أهلاً يا ${firstName} 👋` : 'أهلاً بيك 👋'}
          </p>
          <button
            type="button"
            onClick={() => document.getElementById('branch-card')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-1 text-xs mt-1 active:opacity-70"
            style={{ color: 'var(--muted)' }}
          >
            <MapPin size={12} /> قليوب — شارع العروبة
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate(user ? '/profile' : '/login')}
          className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm active:scale-90 transition-transform flex-shrink-0"
          style={{
            background: 'linear-gradient(155deg, var(--yellow) 0%, var(--yellow-2) 100%)',
            color: '#0a0800',
            boxShadow: 'var(--shadow-yellow-glow), 0 0 0 2px var(--black), 0 0 0 3.5px var(--yellow-line)',
          }}
        >
          {user ? (user.name || 'أ').charAt(0).toUpperCase() : 'DR'}
        </button>
      </header>

      <div className="px-5 flex flex-col gap-5 pb-6">

        {/* Active booking status (app-native: surfaces the user's current state) */}
        {user && <div className="fade-in fade-in-1"><ActiveBookingCard navigate={navigate} /></div>}

        {/* Primary action card — replaces the marketing hero */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 fade-in fade-in-2"
          style={{
            background: 'linear-gradient(135deg, var(--panel-2) 0%, var(--panel) 100%)',
            boxShadow: 'var(--shadow-floating)',
          }}
        >
          <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full blur-3xl opacity-25 pointer-events-none" style={{ background: 'var(--yellow)' }} />
          <Car
            size={130}
            strokeWidth={1}
            className="absolute -left-3 -bottom-6 pointer-events-none"
            style={{ color: 'var(--yellow)', opacity: 0.08, transform: 'rotate(-8deg)' }}
          />
          <div className="relative flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: 'var(--yellow)' }}>غسلة كاملة في ٢٥ دقيقة</p>
              <p className="text-xl font-black" style={{ color: 'var(--white)' }}>احجز غسلتك دلوقتي</p>
            </div>
            <IconBadge icon={Car} size="lg" tone="yellow" />
          </div>
          <Button variant="primary" size="lg" onClick={() => navigate('/book')} className="w-full relative btn-pulse">
            احجز الآن
          </Button>
        </div>

        {/* Loyalty teaser — only if logged in and has points */}
        {user && loyaltyBalance > 0 && (
          <button
            type="button"
            onClick={() => navigate('/coupons')}
            className="w-full flex items-center gap-3 rounded-2xl p-4 text-right active:scale-[0.98] transition-transform fade-in fade-in-3"
            style={{ background: 'var(--panel-2)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--line-2)' }}
          >
            <IconBadge icon={Gift} size="sm" tone="yellow" />
            <p className="flex-1 text-xs font-bold" style={{ color: 'var(--white-2)' }}>
              عندك <span style={{ color: 'var(--yellow)' }}>{loyaltyBalance} نقطة</span> — استبدلها بخصم
            </p>
            <ChevronLeft size={14} style={{ color: 'var(--muted-2)' }} />
          </button>
        )}

        {/* Service categories — horizontal chip row (app-native, not a stacked grid) */}
        <div className="fade-in fade-in-3">
          <p className="text-xs font-black mb-2.5" style={{ color: 'var(--muted)' }}>اختار الخدمة</p>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scroll-fade-x" style={{ scrollbarWidth: 'none' }}>
            {SERVICE_CHIPS.map(s => (
              <button
                key={s.code}
                type="button"
                onClick={() => navigate('/book', { state: { service: s.code } })}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
                style={{ width: 60 }}
              >
                <IconBadge icon={s.Icon} size="md" tone="panel" />
                <span className="text-[10px] font-bold text-center leading-tight" style={{ color: 'var(--muted)' }}>{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Packages — horizontal carousel, not a long vertical list */}
        <div className="fade-in fade-in-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-black" style={{ color: 'var(--muted)' }}>الباقات</p>
            <button type="button" onClick={() => navigate('/book')} className="text-[11px] font-bold active:opacity-70" style={{ color: 'var(--yellow)' }}>
              كل الباقات
            </button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scroll-fade-x" style={{ scrollbarWidth: 'none' }}>
            {packages.map(p => <PackageCard key={p.code} pkg={p} navigate={navigate} />)}
          </div>
        </div>

        {/* Price calculator — compact, collapsed into one card */}
        <div className="fade-in fade-in-5"><PriceCalculator packages={packages} /></div>

        {/* Branch — single compact card, not a whole section */}
        <Card id="branch-card" className="p-4 fade-in fade-in-6">
          <div className="flex items-center gap-3 mb-3">
            <IconBadge icon={MapPin} size="sm" tone="yellow" />
            <div className="flex-1">
              <p className="text-xs font-black" style={{ color: 'var(--white)' }}>قليوب — شارع العروبة</p>
              <p className="text-[10px]" style={{ color: 'var(--muted)' }}>يومياً ١٢م – ١٠م</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href="https://maps.google.com/?q=قليوب+شارع+العروبة"
              target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black active:scale-95 transition-transform"
              style={{ background: 'var(--panel-3)', color: 'var(--white-2)' }}
            >
              <MapPin size={13}/> الخريطة
            </a>
            <a
              href="tel:01037957593"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black active:scale-95 transition-transform"
              style={{ background: 'var(--yellow-soft)', color: 'var(--yellow)' }}
            >
              <Phone size={13}/> اتصال
            </a>
          </div>
        </Card>

        {/* Rating summary — compact strip, not a dedicated reviews section */}
        {avgRating && (
          <div className="flex items-center gap-2 justify-center py-1 fade-in fade-in-7">
            <Star size={14} fill="#ffd21f" stroke="#ffd21f" />
            <span className="text-xs font-bold" style={{ color: 'var(--white-2)' }}>{avgRating} من 5</span>
            <span className="text-xs" style={{ color: 'var(--muted-2)' }}>· {reviewCount} تقييم</span>
          </div>
        )}

        {/* Minimal footer — brand mark only, no sitemap columns */}
        <div className="flex items-center justify-center gap-2 pt-4 pb-2">
          <Wallet size={12} style={{ color: 'var(--muted-2)' }} />
          <p className="text-[10px]" style={{ color: 'var(--muted-2)' }}>DR.Care © 2026 — كاش أو Instapay</p>
        </div>
      </div>

      {/* Bottom nav padding */}
      <div style={{ height: '80px' }} />
    </div>
  );
}
