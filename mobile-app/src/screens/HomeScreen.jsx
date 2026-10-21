import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Star, ChevronLeft, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PromoBanner from '../components/PromoBanner';
import Button from '../components/ui/Button';
import SectionHeader from '../components/ui/SectionHeader';
import HeroScene from '../components/brand/HeroScene';
import NeonEmblem from '../components/brand/NeonEmblem';
import CarArt from '../components/brand/CarArt';
import WashLine from '../components/brand/WashLine';
import OpenSign from '../components/brand/OpenSign';
import { FALLBACK_PACKAGES, FALLBACK_CAR_TYPES, fetchConfig } from '../lib/config';
import { getPackageVisual, sortForMenu } from '../lib/packageVisuals';
import { Mixed } from '../lib/bidi';

const STAGE = { new: 0, confirmed: 1, in_service: 2, completed: 3 };

/* ─── Active booking → the wash line, right on the home screen ─────────────── */
function ActiveBooking({ navigate, loyaltyBalance }) {
  const [booking, setBooking] = useState(undefined); // undefined = loading, null = none

  useEffect(() => {
    fetch('/api/customer-bookings.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => setBooking((d.bookings || []).find(b => ['new', 'confirmed', 'in_service'].includes(b.status)) || null))
      .catch(() => setBooking(null));
  }, []);

  if (booking === undefined) return <div className="w-full h-[150px] skeleton" style={{ borderRadius: 10 }} />;

  if (!booking) {
    if (!loyaltyBalance) return null;
    return (
      <button
        type="button" onClick={() => navigate('/coupons')}
        className="w-full flex items-center gap-3 p-3.5 text-right active:translate-y-0.5 transition-transform"
        style={{ background: 'var(--panel-2)', border: '2px solid var(--line-2)', borderRadius: 10 }}
      >
        <span className="led-board flex items-center justify-center px-3 py-1.5" style={{ borderRadius: 6 }}>
          <span className="led num" style={{ fontSize: 30 }}>{loyaltyBalance}</span>
        </span>
        <span className="flex-1 text-sm font-bold" style={{ color: 'var(--white-2)' }}>نقطة معاك — استبدلها بخصم على غسلتك الجاية</span>
        <ChevronLeft size={18} style={{ color: 'var(--yellow)' }} />
      </button>
    );
  }

  const stage = STAGE[booking.status] ?? 0;
  return (
    <button
      type="button" onClick={() => navigate('/bookings')}
      className="w-full text-right p-4 active:translate-y-0.5 transition-transform"
      style={{ background: 'var(--panel-2)', border: '2px solid var(--yellow)', borderRadius: 10, boxShadow: '0 4px 0 rgba(0,0,0,0.45)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold" style={{ color: 'var(--muted)' }}>حجزك الحالي</p>
          <p className="font-display text-[1.3rem] leading-tight truncate" style={{ color: 'var(--white)' }}>{booking.package_name}</p>
        </div>
        <span className="font-display text-lg flex-shrink-0 px-2 pt-1" style={{ background: 'var(--yellow)', color: 'var(--on-yellow)', borderRadius: 5 }} dir="ltr">#{booking.id}</span>
      </div>
      <WashLine stage={stage} washing={booking.status === 'in_service'} className="mt-1" />
    </button>
  );
}

/* ─── Menu board ──────────────────────────────────────────────────────────── */
function MenuBoard({ packages, navigate }) {
  const items = sortForMenu(packages);
  return (
    <div className="board px-4 py-1.5">
      {items.map((p, i) => {
        const v = getPackageVisual(p.code);
        const price = p.price || p.base_price || 0;
        return (
          <button
            key={p.code} type="button"
            onClick={() => navigate('/book', { state: { service: p.code } })}
            className="block w-full text-right py-3 active:bg-[var(--yellow)] active:text-[var(--on-yellow)] transition-colors duration-75 group"
            style={{ borderTop: i ? '1px dashed rgba(243,240,230,0.11)' : 'none', borderRadius: 4 }}
          >
            <span className="flex items-baseline gap-2.5">
              <span className="font-display text-base self-center flex items-center justify-center flex-shrink-0 pt-1" style={{ width: 26, height: 26, background: 'var(--yellow)', color: 'var(--on-yellow)', borderRadius: 5 }}>{i + 1}</span>
              <span className="text-[0.95rem] font-semibold min-w-0" style={{ color: 'inherit' }}>
                <Mixed>{p.name}</Mixed>
                {v.popular && i < 2 && <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 mr-2 align-middle" style={{ background: 'var(--water)', color: 'var(--on-yellow)', borderRadius: 3, transform: 'rotate(-3deg)' }}>الأشهر</span>}
              </span>
              <span className="leader" />
              {price > 0
                ? <span className="font-display text-[1.65rem] leading-none flex-shrink-0 num" style={{ color: 'var(--yellow)' }}>{price}<small className="text-[11px] font-bold mr-1" style={{ color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>ج</small></span>
                : <span className="text-[12px] font-bold flex-shrink-0" style={{ color: 'var(--yellow)' }}>حسب الشغل</span>}
            </span>
            {v.desc && <span className="block text-[11.5px] mt-1 pr-[36px]" style={{ color: 'var(--muted)' }}>{v.desc}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ─── "الحسبة" — pick a wash and a car, read the total off an LED board ───── */
function PriceCalculator({ packages, carTypes }) {
  const navigate = useNavigate();
  const priced = packages.filter(p => (p.price || p.base_price || 0) > 0);
  const [pkgCode, setPkgCode] = useState('inside-out');
  const [carType, setCarType] = useState('sedan');
  const [bump, setBump] = useState(false);
  const prevTotal = useRef(null);

  const pkg = priced.find(p => p.code === pkgCode) || priced[0];
  const car = carTypes.find(c => c.code === carType);
  const total = (pkg?.price || pkg?.base_price || 0) + (car?.extra || 0);

  useEffect(() => {
    if (prevTotal.current !== null && prevTotal.current !== total) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 220);
      return () => clearTimeout(t);
    }
    prevTotal.current = total;
  }, [total]);

  return (
    <div style={{ background: 'var(--panel-2)', border: '2px solid var(--line-2)', borderRadius: 10 }} className="overflow-hidden">
      <div className="p-4 pb-3">
        <label htmlFor="calc-pkg" className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--muted)' }}>الغسلة</label>
        <div className="relative">
          <select
            id="calc-pkg" value={pkg?.code} onChange={e => setPkgCode(e.target.value)}
            className="input-premium text-sm font-semibold appearance-none pr-3.5 pl-10"
            style={{ height: '3rem' }}
          >
            {priced.map(p => <option key={p.code} value={p.code} style={{ background: '#1b1e23' }}>{p.name}</option>)}
          </select>
          <ChevronDown size={18} strokeWidth={2.6} className="absolute top-1/2 -translate-y-1/2 pointer-events-none" style={{ left: '0.9rem', color: 'var(--yellow)' }} />
        </div>

        <p className="text-[11px] font-bold mt-4 mb-1.5" style={{ color: 'var(--muted)' }}>نوع العربية</p>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="نوع العربية">
          {carTypes.map(c => {
            const on = c.code === carType;
            return (
              <button
                key={c.code} type="button" role="radio" aria-checked={on} onClick={() => setCarType(c.code)}
                className="flex flex-col items-center gap-1.5 pt-2.5 pb-2 active:translate-y-0.5 transition-transform"
                style={{ background: on ? 'var(--yellow)' : 'var(--panel-3)', color: on ? 'var(--on-yellow)' : 'var(--muted)', borderRadius: 8, border: `2px solid ${on ? 'var(--yellow)' : 'var(--line-2)'}` }}
              >
                <CarArt type={c.code} style={{ width: '82%', height: 'auto', color: on ? 'var(--on-yellow)' : 'var(--white-2)' }} />
                <span className="text-[11px] font-bold leading-none">{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-stretch" style={{ borderTop: '2px dashed var(--line-2)' }}>
        <div className="flex-1 p-4 flex flex-col justify-center">
          <p className="text-[11px] font-bold mb-1.5" style={{ color: 'var(--muted)' }}>الإجمالي التقريبي</p>
          <div className="led-board inline-flex items-baseline gap-1.5 px-3.5 py-2 self-start" style={{ borderRadius: 6 }} aria-live="polite">
            <span className="led num relative z-[1]" style={{ fontSize: 46, transform: bump ? 'translateY(-3px)' : 'none', transition: 'transform 0.15s' }}>{total}</span>
            <span className="font-display relative z-[1]" style={{ fontSize: 24, color: 'var(--yellow)' }}>ج</span>
          </div>
        </div>
        <div className="p-4 pr-0 flex items-center">
          <Button size="md" onClick={() => navigate('/book', { state: { service: pkg?.code, carType } })}>احجز <ArrowLeft size={17} strokeWidth={3} /></Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────────────────────── */
export default function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [packages, setPackages] = useState(FALLBACK_PACKAGES);
  const [carTypes, setCarTypes] = useState(FALLBACK_CAR_TYPES);
  const [avgRating, setAvgRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [loyaltyBalance, setLoyaltyBalance] = useState(null);
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    fetchConfig().then(c => { setPackages(c.packages); setCarTypes(c.carTypes); }).catch(() => {});
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
  const onScroll = e => setPastHero(e.target.scrollTop > 380);

  return (
    <div onScroll={onScroll} className="h-full overflow-y-auto scroll-hide main-content" style={{ background: 'var(--black)' }}>

      {/* Sticky mini-bar: the booking CTA stays one tap away once the hero scrolls off */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4"
        style={{
          height: 50, marginBottom: -50, background: 'var(--black)', borderBottom: '2px solid var(--line-2)',
          opacity: pastHero ? 1 : 0, pointerEvents: pastHero ? 'auto' : 'none', transition: 'opacity 0.15s', paddingTop: 'var(--safe-top)',
        }}
      >
        <span className="flex items-center gap-2.5"><NeonEmblem size={26} /><span className="font-display text-xl">DR.Care</span></span>
        <button type="button" onClick={() => navigate('/book')} className="btn-sign btn-sign--md" style={{ padding: '0.45rem 1.1rem', fontSize: '1.05rem' }}>احجز</button>
      </div>

      <div style={{ paddingTop: 'var(--safe-top)' }}><PromoBanner /></div>

      {/* ═══ HERO — the wash bay ═══ */}
      <section className="relative overflow-hidden" style={{ background: '#0f1215' }}>
        <HeroScene top={178} bottom={74} className="block w-full h-auto" />

        <div className="absolute inset-0 flex flex-col">
          <div className="flex items-center justify-between px-5 pt-4">
            <div className="flex items-center gap-3 min-w-0">
              <NeonEmblem size={46} animate />
              <div className="min-w-0">
                <p className="font-display text-xl leading-none truncate" style={{ color: 'var(--white)' }}>
                  {user ? `أهلاً يا ${firstName}` : 'أهلاً بيك'}
                </p>
                <button
                  type="button" onClick={() => document.getElementById('branch-card')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold mt-1.5 active:opacity-70" style={{ color: 'var(--muted)' }}
                >
                  <MapPin size={12} style={{ color: 'var(--yellow)' }} /> قليوب — شارع العروبة
                </button>
              </div>
            </div>
            <button
              type="button" onClick={() => navigate(user ? '/profile' : '/login')}
              className="btn-sign btn-sign--md flex-shrink-0" style={{ padding: '0.5rem 1rem', fontSize: '1.05rem', minWidth: 62 }}
            >
              {user ? (user.name || 'أ').charAt(0).toUpperCase() : 'دخول'}
            </button>
          </div>

          <h1 className="px-5 mt-5 font-display" style={{ fontSize: '3.7rem', lineHeight: 1.02, color: 'var(--white)' }}>
            خلّي اللمعة<br /><span style={{ color: 'var(--yellow)' }}>علينا.</span>
          </h1>

          <div className="flex-1" />

          <div className="px-4 pb-4">
            <Button size="lg" onClick={() => navigate('/book')} className="w-full">
              احجز غسلتك دلوقتي <ArrowLeft size={22} strokeWidth={3} />
            </Button>
          </div>
        </div>
      </section>

      <div className="px-5 flex flex-col gap-8 pt-5 pb-6">

        <ul className="grid grid-cols-3 text-center" style={{ border: '2px solid var(--line-2)', borderRadius: 8 }}>
          {['غسيل بميعاد', 'أسعار ثابتة', 'متابعة لحظية'].map((t, i) => (
            <li key={t} className="py-2.5 text-[12.5px] font-bold" style={{ color: 'var(--white-2)', borderInlineStart: i ? '2px solid var(--line-2)' : 'none' }}>{t}</li>
          ))}
        </ul>

        {user && <ActiveBooking navigate={navigate} loyaltyBalance={loyaltyBalance} />}

        <section>
          <SectionHeader title="قايمة الغسيل" eyebrow="اضغط على أي خدمة وابدأ الحجز" />
          <MenuBoard packages={packages} navigate={navigate} />
        </section>

        <section>
          <SectionHeader title="احسب سعرك" eyebrow="من غير ما تحجز" />
          <PriceCalculator packages={packages} carTypes={carTypes} />
        </section>

        <section id="branch-card">
          <SectionHeader title="الفرع" />
          <div style={{ background: 'var(--panel-2)', border: '2px solid var(--line-2)', borderRadius: 10 }} className="overflow-hidden">
            <div className="hazard hazard--sm" />
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-[1.35rem] leading-tight">قليوب — شارع العروبة</p>
                <p className="text-[12px] font-semibold mt-1" style={{ color: 'var(--muted)' }}>يومياً من 12 الضهر لحد 10 بالليل</p>
                <p className="text-[12px] font-semibold mt-0.5 num" style={{ color: 'var(--muted)' }} dir="ltr">0103 795 7593</p>
              </div>
              <OpenSign />
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pb-4">
              <a href="https://maps.google.com/?q=قليوب+شارع+العروبة" target="_blank" rel="noopener noreferrer" className="btn-sign btn-sign--md btn-sign--secondary"><MapPin size={16} /> الخريطة</a>
              <a href="tel:01037957593" className="btn-sign btn-sign--md"><Phone size={16} strokeWidth={2.6} /> اتصل بينا</a>
            </div>
          </div>
        </section>

        {avgRating && (
          <div className="flex items-center gap-2 justify-center">
            <Star size={15} fill="var(--yellow)" stroke="var(--yellow)" />
            <span className="text-sm font-bold num" style={{ color: 'var(--white-2)' }}>{avgRating} من 5</span>
            <span className="text-xs" style={{ color: 'var(--muted-2)' }}>· {reviewCount} تقييم</span>
          </div>
        )}

        <p className="text-center text-[11px]" style={{ color: 'var(--muted-2)' }}>DR.Care © 2026 — قليوب</p>
      </div>
    </div>
  );
}
