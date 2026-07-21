import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, CarFront, Bus, Truck, Star, MapPin, Phone, Clock, Gift,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2, CheckCircle2, Wallet, Zap,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PromoBanner from '../components/PromoBanner';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconBadge from '../components/ui/IconBadge';
import SlidingPill from '../components/ui/SlidingPill';
import heroImg from '../assets/hero.png';
import { FALLBACK_PACKAGES, FALLBACK_CAR_TYPES, fetchConfig } from '../lib/config';
import { getPackageVisual } from '../lib/packageVisuals';

const CAR_TYPE_ICONS = { sedan: Car, suv: CarFront, van: Bus, pickup: Truck };
const CAR_TYPES = FALLBACK_CAR_TYPES.map(c => ({ ...c, Icon: CAR_TYPE_ICONS[c.code] || Car }));

const STATUS_LABEL    = { new: 'في الانتظار', confirmed: 'مؤكد', in_service: 'جاري التنفيذ' };
const STATUS_ICON     = { new: Clock, confirmed: CheckCircle2, in_service: Loader2 };
const STATUS_PROGRESS = { new: 15, confirmed: 35, in_service: 65 };

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
const FEATURED_TILES = SERVICE_TILES.filter(s => getPackageVisual(s.code).popular);
const REST_TILES     = SERVICE_TILES.filter(s => !getPackageVisual(s.code).popular);

/* ─── Active booking progress / loyalty teaser — one status pill ─────── */
function StatusCard({ navigate, loyaltyBalance }) {
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

  if (booking === undefined) return <div className="w-full h-[64px] rounded-2xl skeleton" />;
  if (!booking && !loyaltyBalance) return null;

  const Icon = booking ? (STATUS_ICON[booking.status] || Clock) : Gift;
  const progress = booking ? (STATUS_PROGRESS[booking.status] ?? 15) : 0;

  return (
    <button
      type="button"
      onClick={() => navigate(booking ? '/bookings' : '/coupons')}
      className="glass w-full flex items-center gap-3 rounded-2xl p-3.5 text-right active:scale-[0.98] transition-transform"
      style={{ boxShadow: 'var(--shadow-premium)' }}
    >
      <IconBadge icon={Icon} size="sm" tone="yellow" />
      <div className="flex-1 min-w-0">
        {booking ? (
          <>
            <p className="text-[11px] font-bold" style={{ color: 'var(--muted)' }}>حجزك الحالي — #{booking.id}</p>
            <p className="text-sm font-black truncate" style={{ color: 'var(--yellow)' }}>{booking.package_name} · {STATUS_LABEL[booking.status]}</p>
            <div className="w-full h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: 'var(--panel-4)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'var(--gradient-gold)' }} />
            </div>
          </>
        ) : (
          <p className="text-xs font-bold" style={{ color: 'var(--white-2)' }}>
            عندك <span style={{ color: 'var(--yellow)' }}>{loyaltyBalance} نقطة</span> — استبدلها بخصم
          </p>
        )}
      </div>
      <ChevronLeft size={16} style={{ color: 'var(--yellow)' }} />
    </button>
  );
}

/* ─── Bento-style stat tile ───────────────────────────── */
function BentoStat({ icon: Icon, value, label, tint }) {
  return (
    <div
      className="flex flex-col items-start gap-2 rounded-2xl p-3.5"
      style={{
        background: `linear-gradient(160deg, color-mix(in srgb, ${tint} 16%, var(--panel-2)) 0%, var(--panel-2) 70%)`,
        border: `1px solid color-mix(in srgb, ${tint} 28%, var(--line-2))`,
      }}
    >
      <Icon size={17} style={{ color: tint }} strokeWidth={2.2} />
      <p className="text-lg font-black" style={{ color: 'var(--white)' }}>{value}</p>
      <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{label}</p>
    </div>
  );
}

/* ─── Featured services — center-snap carousel with scale/opacity depth ── */
function FeaturedCarousel({ packages, navigate }) {
  const trackRef = useRef(null);
  const cardRefs = useRef([]);

  const updateScales = () => {
    const track = trackRef.current;
    if (!track) return;
    const r0 = track.getBoundingClientRect();
    const center = r0.left + r0.width / 2;
    cardRefs.current.forEach(card => {
      if (!card) return;
      const r = card.getBoundingClientRect();
      const cc = r.left + r.width / 2;
      const dist = Math.min(1, Math.abs(cc - center) / (r0.width / 1.4));
      card.style.transform = `scale(${1 - dist * 0.14})`;
      card.style.opacity = 1 - dist * 0.45;
    });
  };

  useEffect(() => {
    updateScales();
    const id = setTimeout(updateScales, 60);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      ref={trackRef}
      onScroll={updateScales}
      className="flex gap-3 overflow-x-auto scroll-hide pb-2"
      style={{ scrollSnapType: 'x mandatory', paddingLeft: '34%', paddingRight: '34%' }}
    >
      {FEATURED_TILES.map((s, i) => {
        const v = getPackageVisual(s.code);
        const Icon = v.icon;
        const pkg = packages.find(p => p.code === s.code);
        const price = pkg?.price || pkg?.base_price || 0;
        return (
          <button
            key={s.code}
            ref={el => (cardRefs.current[i] = el)}
            type="button"
            onClick={() => navigate('/book', { state: { service: s.code } })}
            className="relative flex-shrink-0 flex flex-col justify-between rounded-[22px] p-4 active:scale-95 transition-transform"
            style={{
              width: 150, height: 150, scrollSnapAlign: 'center', transition: 'transform 0.15s, opacity 0.15s',
              background: `linear-gradient(165deg, color-mix(in srgb, ${v.color} 20%, var(--panel-2)) 0%, var(--panel-2) 68%)`,
              border: `1px solid color-mix(in srgb, ${v.color} 34%, var(--line-2))`,
              boxShadow: 'var(--shadow-elevated)',
            }}
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `color-mix(in srgb, ${v.color} 22%, transparent)` }}>
              <Icon size={22} style={{ color: v.color }} strokeWidth={2.2} />
            </div>
            <div className="text-right">
              <p className="text-[13px] font-bold leading-tight" style={{ color: 'var(--white-2)' }}>{s.name}</p>
              {price > 0 && <p className="text-[13px] font-black mt-1" style={{ color: v.color }}>من {price} ج</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Service grid tile — used for the collapsible "كل الخدمات" list ──── */
function ServiceTile({ s, navigate }) {
  const v = getPackageVisual(s.code);
  const Icon = v.icon;
  return (
    <button
      type="button"
      onClick={() => navigate('/book', { state: { service: s.code } })}
      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3.5 active:scale-95 transition-transform"
      style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)' }}
    >
      <Icon size={19} style={{ color: v.color }} strokeWidth={2.2} />
      <span className="text-[10px] font-bold text-center leading-tight" style={{ color: 'var(--white-2)' }}>{s.name}</span>
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
  const PkgIcon = getPackageVisual(pkgCode).icon;

  useEffect(() => {
    if (prevTotal.current !== null && prevTotal.current !== total) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 350);
      return () => clearTimeout(t);
    }
    prevTotal.current = total;
  }, [total]);

  return (
    <Card variant="premium" className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <IconBadge icon={PkgIcon} size="md" tone="yellow" />
        <div className="flex-1">
          <p className="text-sm font-black" style={{ color: 'var(--white)' }}>احسب سعرك</p>
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>اختار الباقة ونوع العربية</p>
        </div>
      </div>

      <label className="text-[10px] font-bold block mb-1.5" style={{ color: 'var(--muted)' }}>الباقة</label>
      <div className="relative mb-4">
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
      <div className="mb-4 rounded-xl p-1" style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)' }}>
        <SlidingPill
          items={CAR_TYPES}
          active={carType}
          onChange={setCarType}
          renderItem={(c, sel) => (
            <div className="flex flex-col items-center gap-1 py-2">
              <c.Icon size={17} strokeWidth={2.2} style={{ color: sel ? 'var(--yellow)' : 'var(--muted)' }} />
              <span className="text-[9px] font-bold" style={{ color: sel ? 'var(--yellow)' : 'var(--muted-2)' }}>{c.name}</span>
            </div>
          )}
        />
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
  const [expanded, setExpanded] = useState(false);
  const [t, setT] = useState(0);
  const restRef = useRef(null);
  const [restHeight, setRestHeight] = useState(0);

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

  useEffect(() => {
    if (restRef.current) setRestHeight(restRef.current.scrollHeight);
  }, [expanded]);

  const firstName = user?.name?.split(' ')[0];
  const onScroll = e => setT(Math.min(1, e.target.scrollTop / 160));
  const compactOpacity = Math.min(1, Math.max(0, (t - 0.5) / 0.35));

  return (
    <div onScroll={onScroll} className="h-full overflow-y-auto scroll-hide main-content" style={{ background: 'var(--black)' }}>

      <PromoBanner />

      <div className="relative">
        {/* Compact header — fades in once the hero image has scrolled mostly out of view */}
        <div
          className="sticky top-0 z-40 flex items-center justify-between px-4"
          style={{
            height: 52, opacity: compactOpacity, marginBottom: -52,
            background: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)',
            pointerEvents: compactOpacity > 0.05 ? 'auto' : 'none',
          }}
        >
          <span className="text-sm font-black" style={{ color: 'var(--white)' }}>DR.Care</span>
          <button
            type="button" onClick={() => navigate('/book')}
            className="text-[11px] font-black px-3.5 py-2 rounded-full active:scale-95 transition-transform"
            style={{ background: 'var(--gradient-gold)', color: '#0a0800' }}
          >
            احجز
          </button>
        </div>

        {/* ═══ FULL-BLEED HERO — showroom photo with parallax + gold-lit gradient ═══ */}
        <div className="relative overflow-hidden fade-in" style={{ height: 340 }}>
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `url(${heroImg})`, backgroundSize: 'cover', backgroundPosition: 'center', transform: `translateY(${-t * 26}px) scale(1.08)` }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,2,2,0.55) 0%, rgba(2,2,2,0.25) 30%, rgba(2,2,2,0.6) 68%, var(--black) 97%)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 380px 260px at 85% 8%, rgba(255,210,31,0.28), transparent 60%)' }} />

          <div className="relative flex items-center justify-between px-5 pt-6" style={{ opacity: 1 - t * 1.4 }}>
            <div>
              <p className="text-sm font-black" style={{ color: 'var(--white)', textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
                {user ? `أهلاً يا ${firstName} 👋` : 'أهلاً بيك 👋'}
              </p>
              <button
                type="button"
                onClick={() => document.getElementById('branch-card')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-1 text-[11px] mt-1 active:opacity-70 px-2 py-1 rounded-full"
                style={{ color: 'var(--yellow)', background: 'rgba(2,2,2,0.4)' }}
              >
                <MapPin size={11} /> قليوب — شارع العروبة
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate(user ? '/profile' : '/login')}
              className="w-11 h-11 rounded-full flex items-center justify-center font-black text-base active:scale-90 transition-transform flex-shrink-0"
              style={{ background: 'var(--gradient-gold)', color: '#0a0800', boxShadow: 'var(--shadow-gold-premium)' }}
            >
              {user ? (user.name || 'أ').charAt(0).toUpperCase() : 'DR'}
            </button>
          </div>

          <div className="relative px-5 text-center" style={{ marginTop: 34, opacity: 1 - t * 1.4, transform: `scale(${1 - t * 0.08})` }}>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full mb-3 glass">
              <Zap size={10} style={{ color: 'var(--yellow)' }} /> صُنع في مصر 🇪🇬
            </span>
            <h1 className="text-3xl font-black leading-tight text-gradient-yellow" style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }}>
              عربيتك تستاهل<br />الأفضل
            </h1>
          </div>
        </div>

        {/* Rounded panel overlapping the hero's bottom edge, holding the primary CTA */}
        <div className="relative z-10 gold-rim" style={{ marginTop: -26, borderRadius: '28px 28px 0 0', background: 'var(--panel)', boxShadow: '0 -18px 40px rgba(0,0,0,0.5)' }}>
          <div className="px-5 pt-6 pb-1">
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              غسيل احترافي في أقل من ساعة — {branchCount} {branchCount === 1 ? 'فرع' : 'فروع'} خدمتك
            </p>
          </div>
          <div className="px-5 pb-5">
            <Button variant="primary" size="lg" onClick={() => navigate('/book')} className="btn-pulse w-full">
              <span className="inline-flex items-center gap-2 justify-center w-full">احجز دلوقتي <ChevronRight size={16} /></span>
            </Button>
          </div>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-6 pt-5">

        {/* Bento stat row */}
        <div className="grid grid-cols-3 gap-2.5 fade-in">
          <BentoStat icon={Zap} value="< ساعة" label="سرعة الخدمة" tint="var(--yellow)" />
          <BentoStat icon={Star} value={avgRating || '4.9'} label="تقييم العملاء" tint="var(--cat-blue)" />
          <BentoStat icon={MapPin} value={branchCount} label={branchCount === 1 ? 'فرع بالقليوب' : 'فروع بالقليوب'} tint="var(--cat-purple)" />
        </div>

        {/* Active booking progress / loyalty teaser */}
        {user && <StatusCard navigate={navigate} loyaltyBalance={loyaltyBalance} />}

        <div className="fade-in fade-in-1">
          <div className="flex items-end justify-between mb-3">
            <p className="text-sm font-black" style={{ color: 'var(--white)' }}>الأكثر طلبًا</p>
            <span className="text-[10px]" style={{ color: 'var(--muted-2)' }}>مرر للتصفح ←</span>
          </div>
        </div>
      </div>

      {/* Featured carousel — edge-to-edge, own horizontal scroll */}
      <div className="fade-in fade-in-2"><FeaturedCarousel packages={packages} navigate={navigate} /></div>

      <div className="px-5 flex flex-col gap-6 pt-1 pb-6">

        {/* All services — collapsible */}
        <div className="fade-in fade-in-3">
          <div className="flex items-end justify-between mb-3">
            <p className="text-sm font-black" style={{ color: 'var(--white)' }}>كل الخدمات</p>
            <button
              type="button" onClick={() => setExpanded(x => !x)}
              className="flex items-center gap-1 text-[11px] font-bold active:opacity-70"
              style={{ color: 'var(--yellow)' }}
            >
              {expanded ? 'إخفاء' : 'عرض المزيد'}
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
          <div style={{ maxHeight: expanded ? restHeight : 0, overflow: 'hidden', transition: 'max-height 0.45s cubic-bezier(0.65,0,0.35,1)' }}>
            <div ref={restRef} className="grid grid-cols-3 gap-2.5">
              {REST_TILES.map(s => <ServiceTile key={s.code} s={s} navigate={navigate} />)}
            </div>
          </div>
        </div>

        {/* Price calculator */}
        <div className="fade-in fade-in-4"><PriceCalculator packages={packages} /></div>

        {/* Branch — single compact card */}
        <Card id="branch-card" className="p-4 fade-in fade-in-5">
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
          <div className="flex items-center gap-2 justify-center py-1 fade-in fade-in-6">
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
