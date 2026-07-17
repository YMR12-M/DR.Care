import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, CarFront, Bus, Truck, Star, MapPin, Phone, Clock, Gift,
  ChevronLeft, ChevronRight, ChevronDown, Loader2, CheckCircle2, Wallet, Zap,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PromoBanner from '../components/PromoBanner';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconBadge from '../components/ui/IconBadge';
import { FALLBACK_PACKAGES, FALLBACK_CAR_TYPES, fetchConfig } from '../lib/config';
import { getPackageVisual } from '../lib/packageVisuals';

const CAR_TYPE_ICONS = { sedan: Car, suv: CarFront, van: Bus, pickup: Truck };
const CAR_TYPES = FALLBACK_CAR_TYPES.map(c => ({ ...c, Icon: CAR_TYPE_ICONS[c.code] || Car }));

const STATUS_LABEL = { new: 'في الانتظار', confirmed: 'مؤكد', in_service: 'جاري التنفيذ' };
const STATUS_ICON  = { new: Clock, confirmed: CheckCircle2, in_service: Loader2 };

const SERVICE_TILES = [
  { name: 'داخلي وخارجي', code: 'inside-out' },
  { name: 'خارجي',        code: 'outside' },
  { name: 'Deep Clean',   code: 'deep' },
  { name: 'جنوط',          code: 'rims' },
  { name: 'الغطاء',        code: 'cover' },
  { name: 'الموتور',       code: 'engine' },
  { name: 'كيماوي',        code: 'chemical' },
  { name: 'سجاد',          code: 'carpet' },
  { name: 'بطاطين',        code: 'blanket' },
];

/* ─── Active booking status pill ─────────────────────── */
function ActiveBookingCard({ navigate }) {
  const [booking, setBooking] = useState(undefined); // undefined=loading, null=none

  useEffect(() => {
    fetch('/api/customer-bookings.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => {
        const active = (d.bookings || []).find(b => ['new', 'confirmed', 'in_service'].includes(b.status));
        setBooking(active || null);
      })
      .catch(() => setBooking(null));
  }, []);

  if (booking === undefined) {
    return <div className="w-full h-[54px] rounded-2xl skeleton" />;
  }
  if (!booking) return null;
  const Icon = STATUS_ICON[booking.status] || Clock;

  return (
    <button
      type="button"
      onClick={() => navigate('/bookings')}
      className="glass w-full flex items-center gap-3 rounded-2xl p-3.5 text-right active:scale-[0.98] transition-transform"
    >
      <IconBadge icon={Icon} size="sm" tone="yellow" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold" style={{ color: 'var(--muted)' }}>حجزك الحالي — #{booking.id}</p>
        <p className="text-sm font-black truncate" style={{ color: 'var(--yellow)' }}>{booking.package_name} · {STATUS_LABEL[booking.status]}</p>
      </div>
      <ChevronLeft size={16} style={{ color: 'var(--yellow)' }} />
    </button>
  );
}

/* ─── Service grid tile — colored per category, bigger + more tactile than a chip ── */
function ServiceTile({ s, navigate }) {
  const v = getPackageVisual(s.code);
  const Icon = v.icon;
  return (
    <button
      type="button"
      onClick={() => navigate('/book', { state: { service: s.code } })}
      className="relative flex flex-col items-center justify-center gap-2 rounded-2xl py-4 active:scale-95 transition-transform overflow-hidden"
      style={{
        background: `linear-gradient(165deg, color-mix(in srgb, ${v.color} 14%, var(--panel-2)) 0%, var(--panel-2) 65%)`,
        border: `1px solid color-mix(in srgb, ${v.color} 30%, var(--line-2))`,
      }}
    >
      {v.popular && (
        <span className="absolute top-1.5 left-1.5 text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'var(--gradient-gold)', color: '#0a0800' }}>
          الأشهر
        </span>
      )}
      <Icon size={22} style={{ color: v.color }} strokeWidth={2.2} />
      <span className="text-[11px] font-bold text-center leading-tight" style={{ color: 'var(--white-2)' }}>{s.name}</span>
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
      <p className="text-sm font-black mb-3.5" style={{ color: 'var(--white)' }}>احسب سعرك</p>

      <label className="text-[10px] font-bold block mb-1.5" style={{ color: 'var(--muted)' }}>الباقة</label>
      <div className="relative mb-3.5">
        <select
          value={pkgCode}
          onChange={e => setPkgCode(e.target.value)}
          className="w-full rounded-xl py-3 text-xs font-bold appearance-none"
          style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--white)', paddingRight: '0.9rem', paddingLeft: '2.25rem' }}
        >
          {packages.filter(p => p.price > 0).map(p => (
            <option key={p.code} value={p.code} style={{ background: '#141414' }}>{p.name}</option>
          ))}
        </select>
        <ChevronDown size={15} className="absolute top-1/2 -translate-y-1/2 pointer-events-none" style={{ left: '0.85rem', color: 'var(--muted)' }} />
      </div>

      <label className="text-[10px] font-bold block mb-1.5" style={{ color: 'var(--muted)' }}>نوع العربية</label>
      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {CAR_TYPES.map(c => {
          const sel = carType === c.code;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => setCarType(c.code)}
              className="flex flex-col items-center gap-1 rounded-xl py-2.5 active:scale-95 transition-transform"
              style={{
                background: sel ? 'var(--yellow-soft)' : 'var(--panel-3)',
                border: `1px solid ${sel ? 'var(--yellow-line)' : 'var(--line-2)'}`,
              }}
            >
              <c.Icon size={17} strokeWidth={2.2} style={{ color: sel ? 'var(--yellow)' : 'var(--muted)' }} />
              <span className="text-[9px] font-bold" style={{ color: sel ? 'var(--yellow)' : 'var(--muted-2)' }}>{c.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-3.5" style={{ borderTop: '1px solid var(--line)' }}>
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
  const [branchCount, setBranchCount] = useState(1);
  const [avgRating, setAvgRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [loyaltyBalance, setLoyaltyBalance] = useState(null);

  useEffect(() => {
    fetchConfig().then(c => { setPackages(c.packages); setBranchCount(c.branches.length); }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/reviews.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
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
    fetch('/api/loyalty.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => { if (d.ok) setLoyaltyBalance(d.balance); })
      .catch(() => {});
  }, [user]);

  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content" style={{ background: 'var(--black)' }}>

      <PromoBanner />

      {/* ═══ FULL-BLEED HERO — the one dramatic showroom moment, not another bordered card ═══ */}
      <div
        className="relative overflow-hidden fade-in"
        style={{ background: 'linear-gradient(165deg, rgba(255,210,31,0.16) 0%, var(--panel) 42%, var(--black) 100%)' }}
      >
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: 'var(--yellow)' }} />
        <div className="absolute top-24 -left-20 w-52 h-52 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: 'var(--cat-indigo)' }} />

        {/* Top bar overlaid directly on the hero, not a separate block */}
        <div className="relative flex items-center justify-between px-5 pt-6">
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--white)' }}>
              {user ? `أهلاً يا ${firstName} 👋` : 'أهلاً بيك 👋'}
            </p>
            <button
              type="button"
              onClick={() => document.getElementById('branch-card')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-1 text-[11px] mt-0.5 active:opacity-70"
              style={{ color: 'var(--yellow)' }}
            >
              <MapPin size={11} /> قليوب — شارع العروبة
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate(user ? '/profile' : '/login')}
            className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm active:scale-90 transition-transform flex-shrink-0"
            style={{ background: 'var(--gradient-gold)', color: '#0a0800', boxShadow: 'var(--shadow-gold-premium)' }}
          >
            {user ? (user.name || 'أ').charAt(0).toUpperCase() : 'DR'}
          </button>
        </div>

        {user && (
          <div className="relative px-5 mt-4 fade-in fade-in-1">
            <ActiveBookingCard navigate={navigate} />
          </div>
        )}

        {/* Big centered headline — the visual anchor of the whole screen */}
        <div className="relative px-5 mt-7 text-center">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full mb-3" style={{ background: 'var(--panel-3)', color: 'var(--muted)' }}>
            صُنع في مصر 🇪🇬
          </span>
          <h1 className="text-3xl font-black leading-tight text-gradient-yellow">
            عربيتك تستاهل<br />الأفضل
          </h1>
          <p className="text-xs mt-2.5" style={{ color: 'var(--muted)' }}>
            غسيل احترافي في أقل من ساعة — {branchCount} {branchCount === 1 ? 'فرع' : 'فروع'} خدمتك
          </p>
          <Button variant="primary" size="lg" onClick={() => navigate('/book')} className="btn-pulse mt-5" style={{ padding: '0.95rem 2.5rem' }}>
            <span className="inline-flex items-center gap-2">احجز دلوقتي <ChevronRight size={16} /></span>
          </Button>
        </div>

        {/* Spacer so the floating stat strip below has room to overlap into the hero */}
        <div className="h-12" />
      </div>

      {/* ═══ FLOATING STAT STRIP — glass pill overlapping the hero's bottom edge for depth ═══ */}
      <div className="relative px-5 fade-in fade-in-2" style={{ marginTop: '-2.75rem' }}>
        <div className="glass rounded-2xl flex items-center py-3.5" style={{ boxShadow: 'var(--shadow-premium)' }}>
          {[
            { Icon: Zap,  value: '< ساعة',              label: 'سرعة' },
            { Icon: Star, value: `${avgRating || '4.9'}`, label: 'تقييم' },
            { Icon: MapPin, value: branchCount,           label: 'فروع' },
          ].map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1" style={{ borderRight: i > 0 ? '1px solid var(--line-2)' : 'none' }}>
              <s.Icon size={15} style={{ color: 'var(--yellow)' }} />
              <p className="text-sm font-black" style={{ color: 'var(--white)' }}>{s.value}</p>
              <p className="text-[9px]" style={{ color: 'var(--muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 flex flex-col gap-6 pt-6 pb-6">

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

        {/* Services — a real tactile grid instead of a scrolling chip row */}
        <div className="fade-in fade-in-3">
          <p className="text-sm font-black mb-3" style={{ color: 'var(--white)' }}>اختار الخدمة</p>
          <div className="grid grid-cols-3 gap-2.5">
            {SERVICE_TILES.map(s => <ServiceTile key={s.code} s={s} navigate={navigate} />)}
          </div>
        </div>

        {/* Price calculator — compact, collapsed into one card */}
        <div className="fade-in fade-in-5"><PriceCalculator packages={packages} /></div>

        {/* Branch — single compact card */}
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

        {/* Rating summary */}
        {avgRating && (
          <div className="flex items-center gap-2 justify-center py-1 fade-in fade-in-7">
            <Star size={14} fill="#ffd21f" stroke="#ffd21f" />
            <span className="text-xs font-bold" style={{ color: 'var(--white-2)' }}>{avgRating} من 5</span>
            <span className="text-xs" style={{ color: 'var(--muted-2)' }}>· {reviewCount} تقييم</span>
          </div>
        )}

        {/* Minimal footer */}
        <div className="flex items-center justify-center gap-2 pt-4 pb-2">
          <Wallet size={12} style={{ color: 'var(--muted-2)' }} />
          <p className="text-[10px]" style={{ color: 'var(--muted-2)' }}>DR.Care © 2026 — كاش أو Instapay</p>
        </div>
      </div>
    </div>
  );
}
