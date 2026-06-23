import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PromoBanner from '../components/PromoBanner';

/* ─── Fallback data ─────────────────────────────────────── */
const FALLBACK_PACKAGES = [
  { code: 'inside-out', name: 'غسيل داخلي وخارجي', price: 150 },
  { code: 'outside',    name: 'غسيل خارجي فقط',    price: 100 },
  { code: 'deep',       name: 'Deep Cleaning',       price: 250 },
  { code: 'cover',      name: 'غسيل غطاء السيارة',  price: 50  },
  { code: 'rims',       name: 'جنوط وكاوتش',         price: 100 },
  { code: 'engine',     name: 'موتور السيارة',        price: 100 },
  { code: 'chemical',   name: 'الغسيل الكيماوي',     price: 0   },
  { code: 'carpet',     name: 'غسيل سجاد',           price: 0   },
  { code: 'blanket',    name: 'غسيل بطاطين',         price: 80  },
];

const CAR_TYPES = [
  { code: 'sedan',  name: 'سيدان',    icon: '🚗', extra: 0   },
  { code: 'suv',    name: 'SUV',      icon: '🚙', extra: 60  },
  { code: 'van',    name: 'فان',      icon: '🚐', extra: 90  },
  { code: 'pickup', name: 'نقل خفيف', icon: '🛻', extra: 120 },
];

/* ─── Helpers ─────────────────────────────────────────────── */
function SectionLabel({ text }) {
  return (
    <p className="text-[10px] font-black tracking-[0.18em] mb-2" style={{ color: 'var(--yellow)' }}>
      {text}
    </p>
  );
}
function SectionTitle({ text }) {
  return (
    <h2 className="text-2xl font-black leading-tight mb-1" style={{ color: 'var(--white)' }}>
      {text}
    </h2>
  );
}
function SectionSub({ text }) {
  return (
    <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
      {text}
    </p>
  );
}

function useCountUp(target, duration = 900, decimals = 0) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(parseFloat((eased * target).toFixed(decimals)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, decimals]);
  return val;
}

function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

function Stars({ rating }) {
  return (
    <span className="text-sm">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ color: n <= rating ? '#ffd21f' : '#6e6860' }}>★</span>
      ))}
    </span>
  );
}

function ReviewSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="flex-shrink-0 w-64 rounded-2xl p-4 animate-pulse"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full" style={{ background: 'var(--panel-4)' }} />
            <div>
              <div className="w-24 h-3 rounded mb-1.5" style={{ background: 'var(--panel-4)' }} />
              <div className="w-16 h-2 rounded" style={{ background: 'var(--panel-4)' }} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="w-full h-2.5 rounded" style={{ background: 'var(--panel-4)' }} />
            <div className="w-4/5 h-2.5 rounded" style={{ background: 'var(--panel-4)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Price Calculator ──────────────────────────────────── */
function PriceCalculator({ packages, navigate }) {
  const [pkgCode, setPkgCode] = useState('inside-out');
  const [carType, setCarType] = useState('sedan');
  const [animating, setAnimating] = useState(false);
  const prevTotal = useRef(null);

  const pkg = packages.find(p => p.code === pkgCode) || packages[0];
  const car = CAR_TYPES.find(c => c.code === carType);
  const basePrice = pkg?.price || 0;
  const extra = car?.extra || 0;
  const total = basePrice + extra;

  useEffect(() => {
    if (prevTotal.current !== null && prevTotal.current !== total) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 400);
    }
    prevTotal.current = total;
  }, [total]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--muted)' }}>اختار الباقة</label>
        <select
          value={pkgCode}
          onChange={e => setPkgCode(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm font-bold appearance-none"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)', color: 'var(--white)' }}
        >
          {packages.filter(p => p.price > 0).map(p => (
            <option key={p.code} value={p.code} style={{ background: '#141414' }}>
              {p.name} — {p.price} ج
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--muted)' }}>نوع العربية</label>
        <div className="grid grid-cols-4 gap-2">
          {CAR_TYPES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCarType(c.code)}
              className="flex flex-col items-center gap-1 rounded-xl py-2.5 text-center active:scale-95 transition-transform"
              style={{
                background: carType === c.code ? 'var(--yellow-soft)' : 'var(--panel-2)',
                border: `1px solid ${carType === c.code ? 'var(--yellow-line)' : 'var(--line)'}`,
                color: carType === c.code ? 'var(--yellow)' : 'var(--muted)',
              }}
            >
              <span className="text-xl">{c.icon}</span>
              <span className="text-[10px] font-bold">{c.name}</span>
              {c.extra > 0 && <span className="text-[9px]" style={{ color: 'var(--muted-2)' }}>+{c.extra}ج</span>}
            </button>
          ))}
        </div>
      </div>

      <div
        className="rounded-2xl p-4 text-center"
        style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)' }}
      >
        <p className="text-xs font-bold mb-1" style={{ color: 'var(--muted)' }}>السعر الإجمالي</p>
        <p
          className="text-4xl font-black transition-transform duration-300"
          style={{ color: 'var(--yellow)', transform: animating ? 'scale(1.12)' : 'scale(1)' }}
        >
          {total} <span className="text-xl">ج</span>
        </p>
        {extra > 0 && (
          <p className="text-xs mt-1" style={{ color: 'var(--muted-2)' }}>
            {basePrice} ج + {extra} ج (نوع العربية)
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate('/book', { state: { service: pkgCode, carType } })}
        className="w-full btn-yellow py-4 rounded-2xl text-base font-black active:scale-95 transition-transform"
      >
        احجز الآن بهذا السعر
      </button>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────── */
export default function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [packages, setPackages] = useState(FALLBACK_PACKAGES);
  const [reviews, setReviews] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(false);
  const scrollRef = useRef(null);

  const count25  = useCountUp(25,  900, 0);
  const count49  = useCountUp(4.9, 1100, 1);
  useReveal();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      setScrolled(el.scrollTop > 10);
      setScrollTop(el.scrollTop);
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    fetch('../api/packages.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => { if (d?.packages?.length) setPackages(d.packages); })
      .catch(() => {});
  }, []);

  const loadReviews = () => {
    setReviewsLoading(true);
    setReviewsError(false);
    fetch('../api/reviews.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => setReviews(d?.reviews || []))
      .catch(() => setReviewsError(true))
      .finally(() => setReviewsLoading(false));
  };
  useEffect(() => { loadReviews(); }, []);

  const avgRating = reviews?.length
    ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
    : null;

  const services = [
    { icon: '💧', name: 'غسيل خارجي',   desc: 'فوم + ضغط + مايكروفايبر', price: 'من ١٠٠ ج', code: 'outside' },
    { icon: '✨', name: 'داخلي وخارجي',  desc: 'الأكثر طلباً',              price: '١٥٠ ج',     code: 'inside-out', hot: true },
    { icon: '🏆', name: 'Deep Cleaning', desc: 'تنظيف عميق شامل',           price: 'من ٢٥٠ ج', code: 'deep' },
    { icon: '⚙️', name: 'جنوط وكاوتش',  desc: 'تلميع وتنظيف متخصص',       price: 'من ١٠٠ ج', code: 'rims' },
  ];

  const pkgList = [
    { icon: '💧', name: 'غسيل خارجي',     desc: 'فوم + ضغط · ⏱ ٢٠ دقيقة',          price: '١٠٠ ج',       code: 'outside' },
    { icon: '🏆', name: 'Deep Cleaning',   desc: 'تنظيف عميق · ⏱ ٩٠ دقيقة',          price: '٢٥٠ ج',       code: 'deep' },
    { icon: '🛡️', name: 'غطاء السيارة',   desc: 'غسيل وتنشيف الغطاء',                 price: '٥٠ ج',        code: 'cover' },
    { icon: '⚙️', name: 'جنوط وكاوتش',   desc: 'تنظيف الجنوط · ⏱ ٢٠ دقيقة',        price: '١٠٠ ج',       code: 'rims' },
    { icon: '🔧', name: 'موتور السيارة',   desc: 'تنظيف حجرة المحرك · ⏱ ٣٠ دقيقة',  price: '١٠٠ ج',       code: 'engine' },
    { icon: '🧪', name: 'الغسيل الكيماوي', desc: 'مواد كيماوية متخصصة',               price: 'حسب الشغل',   code: 'chemical' },
  ];

  const whyItems = [
    { icon: '⏱', title: 'سرعة في التنفيذ',        desc: 'غسلة في ٢٥ دقيقة بدون انتظار' },
    { icon: '💰', title: 'سعر واضح قبل الشغل',      desc: 'بتشوف السعر قبل ما تحجز — مفيش مفاجآت' },
    { icon: '📱', title: 'متابعة لحظية',             desc: 'حالة طلبك بتتحدث من الاستلام للتسليم' },
    { icon: '🌟', title: 'خدمة محترمة',              desc: 'معاملة صح من أول لحظة لآخر لحظة' },
  ];

  const steps = [
    { n: '01', title: 'احجز أونلاين',      desc: 'اختار الباقة والميعاد في دقيقتين' },
    { n: '02', title: 'تأكيد فوري',         desc: 'الطلب بيدخل لوحة الإدارة فور الإرسال' },
    { n: '03', title: 'تنفيذ الخدمة',       desc: 'الفريق بيغير حالة الطلب وأنت شايف كل حاجة' },
    { n: '04', title: 'تسليم ومتابعة',      desc: 'تأكيد نهائي ومراجعة رضا العميل' },
  ];

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto"
      style={{ background: 'var(--black)', scrollbarWidth: 'none' }}
    >

      {/* A. PromoBanner */}
      <PromoBanner />

      {/* B. Sticky Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3"
        style={{
          background: 'rgba(2,2,2,0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
          transition: 'border-color 0.2s',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
            style={{ background: 'var(--yellow)', color: '#0a0800' }}
          >
            DR
          </div>
          <div>
            <p className="text-sm font-black leading-none" style={{ color: 'var(--white)' }}>DR.Care</p>
            <p className="text-[10px] leading-none mt-0.5" style={{ color: 'var(--muted)' }}>مغسلة عربيات مصرية</p>
          </div>
        </div>

        {user ? (
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm active:scale-90 transition-transform"
            style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', color: 'var(--yellow)' }}
          >
            {(user.name || user.email || 'أ').charAt(0).toUpperCase()}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-xs font-black px-3 py-2 rounded-xl active:scale-90 transition-transform"
            style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', color: 'var(--yellow)' }}
          >
            دخول
          </button>
        )}
      </header>

      {/* C. Hero Section */}
      <section className="relative px-5 pt-8 pb-10 overflow-hidden">
        <div className="absolute top-8 right-0 w-52 h-52 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: 'var(--yellow)' }} />
        <div className="absolute top-28 left-0 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-10"
          style={{ background: 'var(--yellow)' }} />

        <div className="relative">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black mb-5"
            style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', color: 'var(--yellow)' }}
          >
            🚗 مغسلة عربيات مصرية
          </div>

          <h1 className="text-4xl font-black leading-tight mb-3">
            <span style={{ color: 'var(--white)' }}>عربيتك</span>
            <br />
            <em className="not-italic text-gradient-yellow">تستاهل الأحسن</em>
          </h1>

          <p className="text-sm font-bold mb-2" style={{ color: 'var(--muted)' }}>
            DR.Care — Car Wash & Detailing · قليوب
          </p>
          <p className="text-sm leading-relaxed mb-7" style={{ color: 'var(--muted)' }}>
            غسيل احترافي في ٢٥ دقيقة، بأسعار ثابتة ومتابعة لحظية للطلب.
          </p>

          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => navigate('/book')}
              className="flex-1 btn-yellow py-4 rounded-2xl text-base font-black active:scale-95 transition-transform"
            >
              احجز الآن
            </button>
            <button
              type="button"
              onClick={() => {
                document.getElementById('packages-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex-1 py-4 rounded-2xl text-base font-black active:scale-95 transition-transform"
              style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--white-2)' }}
            >
              💰 الأسعار
            </button>
          </div>

          <div className="flex gap-2 flex-wrap mb-7">
            {['✓ بدون مفاجآت', '✓ متابعة لحظية', '✓ حجز ٢٤/٧'].map(p => (
              <span
                key={p}
                className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ background: 'var(--faint)', border: '1px solid var(--line)', color: 'var(--muted)' }}
              >
                {p}
              </span>
            ))}
          </div>

          {/* Stats bar */}
          <div
            className="flex rounded-2xl overflow-hidden reveal"
            style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
          >
            {[
              { val: count25,         unit: '',    label: 'دقيقة غسلة' },
              { val: count49,         unit: '⭐',  label: 'تقييم العملاء' },
              { val: '24/7',          unit: '',    label: 'حجز أونلاين' },
            ].map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center text-center py-4 relative">
                {i > 0 && <div className="absolute right-0 top-3 bottom-3 w-px" style={{ background: 'var(--line)' }} />}
                <span className="text-2xl font-black leading-none" style={{ color: 'var(--yellow)', textShadow: '0 0 20px rgba(255,210,31,0.3)' }}>
                  {s.val}{s.unit}
                </span>
                <span className="text-[10px] leading-tight px-1 mt-1" style={{ color: 'var(--muted)' }}>{s.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-5 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>📍 قليوب — شارع العروبة</span>
            <a href="tel:01037957593" className="text-xs font-bold active:opacity-70" style={{ color: 'var(--yellow)' }}>
              📞 اتصل الآن
            </a>
          </div>
        </div>
      </section>

      {/* D. Quick Access Bar */}
      <div
        className="flex"
        style={{
          background: 'var(--panel)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <a
          href="https://maps.google.com/?q=قليوب+شارع+العروبة"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex flex-col items-center gap-0.5 py-3.5 text-center active:opacity-70"
        >
          <span className="text-lg leading-none mb-0.5">📍</span>
          <span className="text-[10px] font-black" style={{ color: 'var(--white-2)' }}>قليوب</span>
          <span className="text-[9px]" style={{ color: 'var(--muted)' }}>شارع العروبة</span>
        </a>
        <div style={{ width: '1px', background: 'var(--line)' }} />
        <div className="flex-1 flex flex-col items-center gap-0.5 py-3.5 text-center">
          <span className="text-lg leading-none mb-0.5">⏰</span>
          <span className="text-[10px] font-black" style={{ color: 'var(--white-2)' }}>١٢م – ١٠م</span>
          <span className="text-[9px]" style={{ color: 'var(--muted)' }}>يومياً</span>
        </div>
        <div style={{ width: '1px', background: 'var(--line)' }} />
        <a
          href="tel:01037957593"
          className="flex-1 flex flex-col items-center gap-0.5 py-3.5 text-center active:opacity-70"
        >
          <span className="text-lg leading-none mb-0.5">📞</span>
          <span className="text-[10px] font-black" style={{ color: 'var(--yellow)' }}>اتصل الآن</span>
          <span className="text-[9px]" style={{ color: 'var(--muted)' }}>01037957593</span>
        </a>
      </div>

      {/* E. Services Section */}
      <section className="px-5 py-10" style={{ background: 'var(--black)' }}>
        <div className="reveal">
          <SectionLabel text="OUR SERVICES" />
          <SectionTitle text="خدماتنا باختصار" />
          <SectionSub text="كل عربية بتاخد وقتها الصح" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {services.map((s, i) => (
            <button
              key={s.code}
              type="button"
              onClick={() => navigate('/book', { state: { service: s.code } })}
              className={`text-right rounded-2xl p-4 active:scale-95 transition-all duration-150 relative overflow-hidden reveal reveal-delay-${i % 3}`}
              style={{
                background: s.hot ? 'linear-gradient(135deg, rgba(255,210,31,0.08) 0%, rgba(255,210,31,0.03) 100%)' : 'var(--panel-2)',
                border: s.hot ? '1px solid var(--yellow-line)' : '1px solid var(--line)',
              }}
            >
              {s.hot && (
                <span
                  className="absolute top-2.5 left-2.5 text-[9px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--yellow)', color: '#0a0800' }}
                >
                  🔥 الأكثر طلباً
                </span>
              )}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3"
                style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)' }}
              >
                {s.icon}
              </div>
              <p className="text-sm font-black mb-1 leading-tight" style={{ color: s.hot ? 'var(--yellow)' : 'var(--white)' }}>{s.name}</p>
              <p className="text-[10px] mb-2 leading-relaxed" style={{ color: 'var(--muted)' }}>{s.desc}</p>
              <p className="text-xs font-black" style={{ color: 'var(--yellow)' }}>{s.price}</p>
            </button>
          ))}
        </div>
      </section>

      {/* F. Packages Section */}
      <section id="packages-section" className="px-5 py-10" style={{ background: 'var(--panel)' }}>
        <div className="reveal">
          <SectionLabel text="PACKAGES & PRICING" />
          <SectionTitle text="خدماتنا وأسعارها" />
          <SectionSub text="أسعار واضحة — اختار واحجز في ثواني" />
        </div>

        {/* Featured card */}
        <div
          className="rounded-2xl p-5 mb-4 reveal relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,210,31,0.12) 0%, rgba(255,210,31,0.04) 100%)',
            border: '1.5px solid var(--yellow-line)',
            boxShadow: '0 0 40px rgba(255,210,31,0.08), 0 0 80px rgba(255,210,31,0.04)',
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-20"
            style={{ background: 'var(--yellow)', transform: 'translate(30%, -30%)' }} />
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-2xl block mb-1">✨</span>
              <p className="text-base font-black" style={{ color: 'var(--white)' }}>غسيل داخلي وخارجي</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>الباقة الأكثر طلباً</p>
            </div>
            <div className="text-left flex flex-col items-end gap-2">
              <span
                className="text-[10px] font-black px-2 py-1 rounded-full"
                style={{ background: 'var(--yellow)', color: '#0a0800' }}
              >
                الأكثر طلباً ⭐
              </span>
              <p className="text-3xl font-black" style={{ color: 'var(--yellow)' }}>
                150 <span className="text-base">ج</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {['✓ غسيل خارجي', '✓ تنظيف داخلي', '✓ مايكروفايبر', '⏱ ٤٥ دقيقة'].map(f => (
              <span key={f} className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,210,31,0.12)', border: '1px solid rgba(255,210,31,0.2)', color: 'var(--yellow-2)' }}>
                {f}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate('/book', { state: { service: 'inside-out' } })}
            className="w-full btn-yellow py-3.5 rounded-xl text-sm font-black active:scale-95 transition-transform"
          >
            احجز هذه الباقة
          </button>
        </div>

        {/* Package list */}
        <div className="flex flex-col gap-2 mb-5">
          {pkgList.map(p => (
            <button
              key={p.code}
              type="button"
              onClick={() => navigate('/book', { state: { service: p.code } })}
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform text-right"
              style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
            >
              <span className="text-xl flex-shrink-0">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black leading-none mb-0.5" style={{ color: 'var(--white)' }}>{p.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{p.desc}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="text-sm font-black" style={{ color: 'var(--yellow)' }}>{p.price}</p>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--muted-2)', transform: 'rotate(180deg)' }}>
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Carpet divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>🧺 غسيل سجاد وبطاطين</span>
          <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🟫', name: 'غسيل سجاد',    price: '١٥ ج', sub: 'متر',  code: 'carpet' },
            { icon: '🛏️', name: 'غسيل بطاطين',  price: '٨٠ ج', sub: 'قطعة', code: 'blanket' },
          ].map(item => (
            <button
              key={item.code}
              type="button"
              onClick={() => navigate('/book', { state: { service: item.code } })}
              className="rounded-2xl p-4 text-right active:scale-95 transition-transform"
              style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
            >
              <span className="text-xl block mb-2">{item.icon}</span>
              <p className="text-sm font-black mb-0.5" style={{ color: 'var(--white)' }}>{item.name}</p>
              <p className="text-sm font-black" style={{ color: 'var(--yellow)' }}>
                {item.price} <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>/ {item.sub}</span>
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* G. Price Calculator */}
      <section className="px-5 py-10" style={{ background: 'var(--black)' }}>
        <SectionLabel text="PRICE CALCULATOR" />
        <SectionTitle text="احسب سعرك" />
        <SectionSub text="اختار الباقة ونوع العربية وشوف السعر فوراً" />
        <PriceCalculator packages={packages} navigate={navigate} />
      </section>

      {/* H. Why Us */}
      <section className="px-5 py-10" style={{ background: 'var(--panel)' }}>
        <div className="reveal">
          <SectionLabel text="WHY DR.CARE" />
          <SectionTitle text="ليه DR.Care؟" />
          <SectionSub text="مبنية على التفاصيل اللي بتفرق للعميل المصري" />
        </div>
        <div className="flex flex-col gap-3">
          {whyItems.map((w, i) => (
            <div
              key={i}
              className={`flex items-start gap-4 rounded-2xl p-4 reveal reveal-delay-${i % 3}`}
              style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)' }}
              >
                {w.icon}
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-sm font-black mb-1" style={{ color: 'var(--white)' }}>{w.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{w.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* I. Process Section */}
      <section className="px-5 py-10" style={{ background: 'var(--black)' }}>
        <div className="reveal">
          <SectionLabel text="HOW IT WORKS" />
          <SectionTitle text="من الحجز للتسليم" />
          <SectionSub text="٤ خطوات بسيطة وعربيتك تبقى زي الفل" />
        </div>
        <div className="flex flex-col">
          {steps.map((step, i) => (
            <div key={i} className={`flex gap-4 items-start relative reveal reveal-delay-${i % 3}`}
              style={{ paddingBottom: i < steps.length - 1 ? '28px' : '0' }}>
              {/* connector */}
              {i < steps.length - 1 && (
                <div className="absolute top-12 bottom-0 w-px"
                  style={{
                    right: '23px',
                    background: 'linear-gradient(to bottom, var(--yellow-line) 0%, rgba(255,210,31,0.05) 100%)'
                  }}
                />
              )}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 z-10"
                style={{
                  background: i === 0 ? 'var(--yellow)' : 'var(--yellow-soft)',
                  border: '1px solid var(--yellow-line)',
                  color: i === 0 ? '#0a0800' : 'var(--yellow)',
                }}
              >
                {step.n}
              </div>
              <div className="flex-1 pt-2">
                <p className="text-sm font-black mb-1" style={{ color: 'var(--white)' }}>{step.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* J. Branch Section */}
      <section className="px-5 py-10" style={{ background: 'var(--panel)' }}>
        <SectionLabel text="OUR BRANCH" />
        <SectionTitle text="فرعنا" />
        <SectionSub text="قليوب — شارع العروبة" />
        <div
          className="rounded-2xl p-5 mb-4"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)' }}
            >
              📍
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: 'var(--white)' }}>قليوب — شارع العروبة</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>يومياً 12م – 10م</p>
            </div>
          </div>
          <a
            href="https://maps.google.com/?q=قليوب+شارع+العروبة"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-black active:scale-95 transition-transform"
            style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', color: 'var(--yellow)' }}
          >
            🗺️ افتح الخريطة
          </a>
        </div>
        <a
          href="tel:01037957593"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-black active:scale-95 transition-transform"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--white-2)' }}
        >
          📞 اتصل للاستفسار عن الفرع
        </a>
      </section>

      {/* K. Reviews Section */}
      <section className="py-10" style={{ background: 'var(--black)' }}>
        <div className="px-5">
          <SectionLabel text="CUSTOMER REVIEWS" />
          <SectionTitle text="عملاؤنا بيقولوا" />
          <SectionSub text="تقييمات حقيقية" />
        </div>

        {reviewsLoading && <div className="px-5"><ReviewSkeleton /></div>}

        {!reviewsLoading && reviewsError && (
          <div className="px-5 text-center py-6">
            <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>تعذر تحميل التقييمات</p>
            <button
              type="button"
              onClick={loadReviews}
              className="text-sm font-black px-4 py-2 rounded-xl active:scale-95 transition-transform"
              style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--yellow)' }}
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {!reviewsLoading && !reviewsError && reviews?.length === 0 && (
          <div className="px-5 text-center py-6">
            <span className="text-3xl block mb-3">⭐</span>
            <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>لا توجد تقييمات بعد</p>
          </div>
        )}

        {!reviewsLoading && !reviewsError && reviews?.length > 0 && (
          <>
            <div className="px-5 mb-4">
              <div
                className="rounded-2xl p-4 flex items-center gap-4"
                style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
              >
                <div className="text-center flex-shrink-0">
                  <p className="text-4xl font-black" style={{ color: 'var(--yellow)' }}>{avgRating}</p>
                  <Stars rating={Math.round(parseFloat(avgRating))} />
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{reviews.length} تقييم</p>
                </div>
                <div className="flex-1">
                  {[5, 4, 3, 2, 1].map(n => {
                    const count = reviews.filter(r => Number(r.rating) === n).length;
                    const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={n} className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] w-3" style={{ color: 'var(--muted)' }}>{n}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--panel-4)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--yellow)' }} />
                        </div>
                        <span className="text-[10px] w-4" style={{ color: 'var(--muted-2)' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              className="flex gap-3 overflow-x-auto pb-2 px-5"
              style={{ scrollbarWidth: 'none' }}
            >
              {reviews.map((r, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-64 rounded-2xl p-4"
                  style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0"
                      style={{ background: 'var(--yellow-soft)', color: 'var(--yellow)' }}
                    >
                      {(r.customer_name || r.name || 'ع').charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-black leading-none mb-0.5" style={{ color: 'var(--white)' }}>
                        {r.customer_name || r.name || 'عميل'}
                      </p>
                      <Stars rating={Number(r.rating) || 5} />
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--muted)' }}>
                      {r.comment}
                    </p>
                  )}
                  {r.created_at && (
                    <p className="text-[10px]" style={{ color: 'var(--muted-2)' }}>
                      {new Date(r.created_at).toLocaleDateString('ar-EG')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* L. Final CTA */}
      <section className="px-5 py-12 relative overflow-hidden reveal" style={{ background: 'var(--panel)' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: 'var(--yellow)' }} />
        <div className="relative text-center mb-7">
          <p className="text-[10px] font-black tracking-[0.18em] mb-3" style={{ color: 'var(--yellow)' }}>BOOK NOW</p>
          <h2 className="text-3xl font-black mb-2 leading-tight" style={{ color: 'var(--white)' }}>
            جاهز تحجز<br />دورك؟
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            ٣ خطوات سريعة — تأكيد فوري — بدون مفاجآت
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-7">
          {['✓ تأكيد فوري', '✓ كاش أو Instapay', '✓ متابعة لحظية'].map(b => (
            <span key={b} className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', color: 'var(--yellow)' }}>
              {b}
            </span>
          ))}
        </div>
        <button type="button" onClick={() => navigate('/book')}
          className="w-full btn-yellow py-5 rounded-2xl text-lg font-black active:scale-95 transition-transform relative">
          <svg className="inline ml-2 mb-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
          ابدأ الحجز الآن
        </button>
        <p className="text-center text-xs mt-3" style={{ color: 'var(--muted-2)' }}>⏱ أقل من دقيقتين</p>
      </section>

      {/* M. Footer */}
      <footer className="px-5 py-8" style={{ background: 'var(--ink)', borderTop: '1px solid var(--line)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
            style={{ background: 'var(--yellow)', color: '#0a0800' }}
          >
            DR
          </div>
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--white)' }}>DR.Care</p>
            <p className="text-[10px]" style={{ color: 'var(--muted)' }}>مغسلة عربيات مصرية · قليوب</p>
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          {['صُنع في مصر 🇪🇬', 'PWA Ready'].map(b => (
            <span
              key={b}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--muted)' }}
            >
              {b}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-[10px] font-black mb-2" style={{ color: 'var(--muted-2)' }}>الخدمات</p>
            {['غسيل خارجي', 'داخلي وخارجي', 'Deep Cleaning'].map(l => (
              <button key={l} type="button" onClick={() => navigate('/book')}
                className="block text-[11px] mb-1 font-bold active:opacity-70" style={{ color: 'var(--muted)' }}>
                {l}
              </button>
            ))}
          </div>
          <div>
            <p className="text-[10px] font-black mb-2" style={{ color: 'var(--muted-2)' }}>الباقات</p>
            {['جنوط وكاوتش', 'موتور السيارة', 'غسيل سجاد'].map(l => (
              <button key={l} type="button" onClick={() => navigate('/book')}
                className="block text-[11px] mb-1 font-bold active:opacity-70" style={{ color: 'var(--muted)' }}>
                {l}
              </button>
            ))}
          </div>
          <div>
            <p className="text-[10px] font-black mb-2" style={{ color: 'var(--muted-2)' }}>حسابي</p>
            {[
              { l: 'تسجيل الدخول', p: '/login' },
              { l: 'حجوزاتي', p: '/bookings' },
              { l: 'الملف الشخصي', p: '/profile' },
            ].map(({ l, p }) => (
              <button key={l} type="button" onClick={() => navigate(p)}
                className="block text-[11px] mb-1 font-bold active:opacity-70" style={{ color: 'var(--muted)' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <a
          href="https://www.facebook.com/Dr.Careforcars"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mb-5 active:opacity-70"
          style={{ color: '#1877F2' }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <span className="text-xs font-bold">@Dr.Careforcars</span>
        </a>

        <div className="h-px mb-4" style={{ background: 'var(--line)' }} />
        <p className="text-[10px] text-center" style={{ color: 'var(--muted-2)' }}>
          © 2026 DR.Care — جميع الحقوق محفوظة
        </p>
      </footer>

      {/* N. Scroll to top */}
      {scrollTop > 300 && (
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed z-50 flex items-center justify-center rounded-full active:scale-90 transition-transform"
          style={{
            bottom: '162px',
            right: '16px',
            width: '44px',
            height: '44px',
            background: 'var(--panel-3)',
            border: '1px solid var(--line-2)',
            color: 'var(--muted)',
          }}
          aria-label="العودة للأعلى"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 15l-6-6-6 6"/>
          </svg>
        </button>
      )}

      {/* Bottom nav padding */}
      <div style={{ height: '80px' }} />
    </div>
  );
}
