import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Check, ChevronRight, ChevronLeft, Lightbulb, Zap, Paperclip, Loader2, Clock, Car, CarFront, Bus, Truck,
  Wallet, Smartphone, CreditCard,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api, secureFetch } from '../lib/api';
import Button from '../components/ui/Button';
import {
  FALLBACK_PACKAGES, FALLBACK_CAR_TYPES, FALLBACK_BRANCHES, FALLBACK_PAYMENT_METHODS,
  fetchConfig,
} from '../lib/config';

const CAR_TYPE_ICON = { sedan: Car, suv: CarFront, van: Bus, pickup: Truck };
const PAYMENT_ICON = { 'كاش': Wallet, 'Instapay': Smartphone };

const DUR_MAP = {
  'inside-out': '~ ٤٥ دقيقة',
  'outside':    '~ ٢٠ دقيقة',
  'deep':       '~ ٩٠ دقيقة',
  'cover':      '~ ١٥ دقيقة',
  'rims':       '~ ٢٠ دقيقة',
  'engine':     '~ ٣٠ دقيقة',
  'chemical':   'حسب الشغل',
  'carpet':     'حسب المساحة',
  'blanket':    '~ ٣٠ دقيقة',
};

const RECOMMEND = {
  sedan:  { pkg: 'inside-out', msg: 'الغسيل الداخلي والخارجي مثالي لعربيتك' },
  suv:    { pkg: 'inside-out', msg: 'الغسيل الشامل مع تركيز على الجنوط' },
  van:    { pkg: 'deep',       msg: 'Deep Cleaning الأنسب للمساحات الداخلية' },
  pickup: { pkg: 'outside',    msg: 'الغسيل الخارجي يكفي' },
};

/* ─── Arabic date / time formatting ───────────────────── */
const AR_DAYS   = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function formatDateAr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return { day: AR_DAYS[d.getDay()], num: d.getDate(), month: AR_MONTHS[d.getMonth()] };
}

function formatTimeAr(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h < 12 ? 'ص' : 'م';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getNextDays(n = 7) {
  const days = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

/* ─── Small UI pieces ──────────────────────────────────── */
function FieldHint({ valid, error, msg }) {
  if (!msg && !error) return null;
  return (
    <p className="text-xs mt-1 font-bold" style={{ color: valid ? 'var(--success)' : 'var(--error)' }}>
      {valid ? `✓ ${msg || ''}` : error}
    </p>
  );
}

/* ─── Step Indicator ──────────────────────────────────── */
function StepBar({ current }) {
  const steps = ['الخدمة', 'الميعاد', 'بياناتك'];
  return (
    <div className="flex items-center justify-between px-6 py-4">
      {steps.map((label, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
            {/* connector line */}
            {i < steps.length - 1 && (
              <div
                className="absolute top-4 right-0 left-1/2 h-px"
                style={{ background: done ? 'var(--yellow)' : 'var(--line)', zIndex: 0 }}
              />
            )}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black z-10 transition-all duration-300"
              style={{
                background: done ? 'var(--yellow)' : active ? 'var(--yellow-soft)' : 'var(--panel-3)',
                border: `2px solid ${active ? 'var(--yellow)' : done ? 'var(--yellow)' : 'var(--line-2)'}`,
                color: done ? '#0a0800' : active ? 'var(--yellow)' : 'var(--muted-2)',
              }}
            >
              {done ? <Check size={14} strokeWidth={3} /> : i + 1}
            </div>
            <span className="text-[10px] font-bold" style={{ color: active ? 'var(--yellow)' : 'var(--muted-2)' }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Step 1: الخدمة ─────────────────────────────────── */
function Step1({ packages, carTypes, form, setForm, onNext }) {
  const [pkgError, setPkgError] = useState('');
  const selected = form.servicePackage;
  const selectedCar = form.carType;
  const rec = RECOMMEND[selectedCar];
  const pkg = packages.find(p => p.code === selected);
  const car = carTypes.find(c => c.code === selectedCar);
  const price = (pkg?.price || pkg?.base_price || 0) + (car?.extra || 0);

  const handleNext = () => {
    if (!selected) { setPkgError('اختار الباقة أولاً'); return; }
    if (!selectedCar) { setPkgError('اختار نوع العربية'); return; }
    setPkgError('');
    onNext();
  };

  return (
    <div className="flex flex-col gap-5 p-4 pb-24">
      {/* Packages */}
      <div className="fade-in fade-in-1">
        <p className="text-xs font-black mb-3" style={{ color: 'var(--muted)' }}>اختار الباقة</p>
        <div className="grid grid-cols-2 gap-2.5">
          {packages.map(p => (
            <button
              key={p.code}
              type="button"
              onClick={() => {
                setForm(f => ({ ...f, servicePackage: p.code }));
                setPkgError('');
              }}
              className="rounded-2xl p-4 text-right active:scale-95 transition-transform"
              style={{
                background: selected === p.code ? 'var(--yellow-soft)' : 'var(--panel-2)',
                border: selected === p.code ? '1px solid var(--yellow-line)' : 'none',
                boxShadow: selected === p.code ? 'var(--shadow-yellow-glow)' : 'var(--shadow-card)',
              }}
            >
              <p
                className="text-sm font-black mb-0.5"
                style={{ color: selected === p.code ? 'var(--yellow)' : 'var(--white)' }}
              >
                {p.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {p.price > 0 ? `${p.price} ج` : 'حسب الشغل'}
              </p>
              {DUR_MAP[p.code] && (
                <p className="inline-flex items-center gap-1 text-[10px] mt-0.5" style={{ color: 'var(--muted-2)' }}>
                  <Clock size={10} /> {DUR_MAP[p.code]}
                </p>
              )}
            </button>
          ))}
        </div>
        {pkgError && <p className="text-xs mt-2 font-bold" style={{ color: 'var(--error)' }}>{pkgError}</p>}
      </div>

      {/* Car types */}
      <div className="fade-in fade-in-2">
        <p className="text-xs font-black mb-3" style={{ color: 'var(--muted)' }}>نوع العربية</p>
        <div className="grid grid-cols-2 gap-2.5">
          {carTypes.map(c => {
            const CarIcon = CAR_TYPE_ICON[c.code] || Car;
            return (
            <button
              key={c.code}
              type="button"
              onClick={() => setForm(f => ({ ...f, carType: c.code }))}
              className="flex items-center gap-3 rounded-2xl p-4 active:scale-95 transition-transform"
              style={{
                background: selectedCar === c.code ? 'var(--yellow-soft)' : 'var(--panel-2)',
                border: selectedCar === c.code ? '1px solid var(--yellow-line)' : 'none',
                boxShadow: selectedCar === c.code ? 'var(--shadow-yellow-glow)' : 'var(--shadow-card)',
              }}
            >
              <CarIcon size={22} strokeWidth={2.2} style={{ color: selectedCar === c.code ? 'var(--yellow)' : 'var(--muted)' }} />
              <div className="text-right">
                <p className="text-sm font-black" style={{ color: selectedCar === c.code ? 'var(--yellow)' : 'var(--white)' }}>
                  {c.name}
                </p>
                {c.extra > 0 && (
                  <p className="text-[10px]" style={{ color: 'var(--muted-2)' }}>+{c.extra} ج</p>
                )}
              </div>
            </button>
          );})}
        </div>
      </div>

      {/* Smart recommendation */}
      {selectedCar && rec && (
        <div
          className="rounded-2xl p-4 flex items-center justify-between gap-3 fade-in"
          style={{ background: 'var(--panel-2)', boxShadow: 'var(--shadow-yellow-glow)', border: '1px solid var(--yellow-line)' }}
        >
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--yellow)' }}>
              <Lightbulb size={13} fill="var(--yellow)" fillOpacity={0.25} /> اقتراح ذكي
            </p>
            <p className="text-sm font-black mt-0.5" style={{ color: 'var(--white)' }}>{rec.msg}</p>
          </div>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, servicePackage: rec.pkg }))}
            className="text-xs font-black px-3 py-2 rounded-xl flex-shrink-0 active:scale-90 transition-transform"
            style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', color: 'var(--yellow)' }}
          >
            اختار
          </button>
        </div>
      )}

      {/* Price estimate */}
      {selected && (
        <div
          className="rounded-2xl p-4 flex items-center justify-between fade-in"
          style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', boxShadow: 'var(--shadow-yellow-glow)' }}
        >
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--muted)' }}>السعر المتوقع</p>
            {DUR_MAP[selected] && (
              <p className="inline-flex items-center gap-1 text-[10px] mt-0.5" style={{ color: 'var(--muted-2)' }}>
                <Clock size={10} /> {DUR_MAP[selected]}
              </p>
            )}
          </div>
          <p className="text-2xl font-black" style={{ color: 'var(--yellow)' }}>
            {price > 0 ? `${price} ج` : 'حسب الشغل'}
          </p>
        </div>
      )}

      {/* Next button */}
      <Button variant="primary" size="lg" onClick={handleNext} className="w-full">
        <span className="inline-flex items-center gap-1.5">التالي <ChevronRight size={16} className="rotate-180" /></span>
      </Button>
    </div>
  );
}

/* ─── Step 2: الميعاد ───────────────────────────────── */
function Step2({ form, setForm, onNext, onBack }) {
  /* api/slots.php يرجع كل المواعيد المستقبلية مُجمَّعة حسب التاريخ في نداء واحد
     (مثل { "2026-07-09": [{id,time,available}, ...] }) — نفس الشكل المستخدم فعلياً
     في script.js (الموقع الرئيسي)، وليس مصفوفة مفلترة بتاريخ واحد. */
  const [allSlots, setAllSlots] = useState({});
  const [loading, setLoading]   = useState(true);
  const dateScrollRef = useRef(null);
  const availDates = getNextDays(10);

  useEffect(() => {
    fetch('../api/slots.php', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(d => setAllSlots(d.slots || {}))
      .catch(() => setAllSlots({}))
      .finally(() => setLoading(false));
  }, []);

  const pkg = form.servicePackage;
  const dur = DUR_MAP[pkg] || null;

  const handleNext = () => {
    onNext();
  };

  const availSlots = (allSlots[form.apptDate] || []).filter(s => s.available > 0);

  return (
    <div className="flex flex-col gap-5 p-4 pb-24">

      {/* Date chips */}
      <div className="fade-in fade-in-1">
        <p className="text-xs font-black mb-3" style={{ color: 'var(--muted)' }}>اختار اليوم</p>
        <div
          ref={dateScrollRef}
          className="flex gap-2 overflow-x-auto pb-2 scroll-fade-x"
          style={{ scrollbarWidth: 'none' }}
        >
          {availDates.map(d => {
            const { day, num, month } = formatDateAr(d);
            const sel = form.apptDate === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setForm(f => ({ ...f, apptDate: d, apptTime: '' }))}
                className="flex-shrink-0 flex flex-col items-center rounded-2xl px-4 py-3 active:scale-95 transition-transform"
                style={{
                  background: sel ? 'var(--yellow-soft)' : 'var(--panel-2)',
                  border: sel ? '1px solid var(--yellow)' : 'none',
                  boxShadow: sel ? 'var(--shadow-yellow-glow)' : 'var(--shadow-card)',
                  minWidth: '72px',
                }}
              >
                <span className="text-[10px] font-bold" style={{ color: sel ? 'var(--yellow)' : 'var(--muted)' }}>{day}</span>
                <span className="text-xl font-black" style={{ color: sel ? 'var(--yellow)' : 'var(--white)' }}>{num}</span>
                <span className="text-[10px]" style={{ color: 'var(--muted-2)' }}>{month}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {form.apptDate && (
        <div className="fade-in">
          <p className="text-xs font-black mb-3" style={{ color: 'var(--muted)' }}>اختار الوقت</p>
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-10 w-24 rounded-xl skeleton" />
              ))}
            </div>
          ) : availSlots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availSlots.map(s => {
                const sel = form.apptTime === s.time;
                return (
                  <button
                    key={s.time}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, apptTime: s.time }))}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                    style={{
                      background: sel ? 'var(--yellow-soft)' : 'var(--panel-2)',
                      border: sel ? '1px solid var(--yellow)' : 'none',
                      boxShadow: sel ? 'var(--shadow-yellow-glow)' : 'var(--shadow-card)',
                      color: sel ? 'var(--yellow)' : 'var(--muted)',
                    }}
                  >
                    {formatTimeAr(s.time)}
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>أدخل الوقت يدوياً</p>
              <input
                type="time"
                value={form.apptTime}
                onChange={e => setForm(f => ({ ...f, apptTime: e.target.value }))}
                className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none"
                style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--white)' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Duration hint */}
      {dur && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-2 fade-in"
          style={{ background: 'var(--panel-2)', boxShadow: 'var(--shadow-card)' }}
        >
          <Clock size={15} style={{ color: 'var(--yellow)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>
            المدة المتوقعة: {dur}
          </span>
        </div>
      )}

      {/* Note: date/time optional */}
      <p className="text-xs text-center" style={{ color: 'var(--muted-2)' }}>
        يمكنك المتابعة بدون تحديد موعد — سيتم التنسيق معك
      </p>

      <div className="flex gap-3">
        <Button variant="secondary" size="lg" onClick={onBack} className="flex-1">
          <span className="inline-flex items-center gap-1.5"><ChevronRight size={16} /> رجوع</span>
        </Button>
        <Button variant="primary" size="lg" onClick={handleNext} className="flex-1">
          <span className="inline-flex items-center gap-1.5">التالي <ChevronRight size={16} className="rotate-180" /></span>
        </Button>
      </div>
    </div>
  );
}

/* ─── Step 3: بياناتك ────────────────────────────────── */
function Step3({ packages, carTypes, paymentMethods, form, setForm, onBack, onSubmit, submitting, statusMsg }) {
  const { user } = useAuth();
  const [errors, setErrors]         = useState({});
  const [touched, setTouched]       = useState({});
  const [couponMsg, setCouponMsg]   = useState(null);
  const [appliedCoupon, setApplied] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const autoFill = () => {
    if (!user) return;
    setForm(f => ({
      ...f,
      name:  user.name  || f.name,
      email: user.email || f.email,
      phone: user.phone || f.phone,
    }));
  };

  const validateField = (field, value) => {
    if (field === 'name')  return value.trim().length >= 2 ? '' : 'اكتب اسمك الكامل (حرفين على الأقل)';
    if (field === 'phone') return /^01[0125][0-9]{8}$/.test(value) ? '' : 'رقم موبايل مصري غير صحيح';
    if (field === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'بريد إلكتروني غير صحيح';
    return '';
  };

  const blur = field => () => {
    setTouched(t => ({ ...t, [field]: true }));
    const err = validateField(field, form[field] || '');
    setErrors(e => ({ ...e, [field]: err }));
  };

  const checkCoupon = async () => {
    if (!form.couponCode?.trim()) return;
    const pkg = packages.find(p => p.code === form.servicePackage);
    const car = carTypes.find(c => c.code === form.carType);
    const subtotal = (pkg?.price || pkg?.base_price || 0) + (car?.extra || 0);
    try {
      const res = await api.post('coupons.php', {
        action: 'validate', code: form.couponCode.trim().toUpperCase(), subtotal,
      });
      const d = await res.json();
      if (d.ok) {
        setApplied(d);
        setCouponMsg({ ok: true, text: `✓ خصم ${d.discount} جنيه` });
      } else {
        setApplied(null);
        setCouponMsg({ ok: false, text: d.message || 'كود غير صالح' });
      }
    } catch {
      setCouponMsg({ ok: false, text: 'تعذر التحقق من الكود' });
    }
  };

  const handleSubmit = () => {
    const newErrors = {};
    ['name','phone','email'].forEach(f => {
      const err = validateField(f, form[f] || '');
      if (err) newErrors[f] = err;
    });
    if (!form.paymentMethod) newErrors.paymentMethod = 'اختار طريقة الدفع';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({ name: true, phone: true, email: true });
      return;
    }
    onSubmit(appliedCoupon);
  };

  const handleImg = e => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({ ...f, paymentImg: file }));
    const reader = new FileReader();
    reader.onload = ev => setImgPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const pkg = packages.find(p => p.code === form.servicePackage);
  const car = carTypes.find(c => c.code === form.carType);
  const base = (pkg?.price || pkg?.base_price || 0) + (car?.extra || 0);
  const total = base - (appliedCoupon?.discount || 0);
  const dur = DUR_MAP[form.servicePackage] || null;

  return (
    <div className="flex flex-col gap-4 p-4 pb-28">

      {/* Auto-fill from profile */}
      {user && (
        <button
          type="button"
          onClick={autoFill}
          className="flex items-center justify-between rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform fade-in"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--yellow-line)', boxShadow: 'var(--shadow-yellow-glow)' }}
        >
          <div className="text-right">
            <p className="text-sm font-black" style={{ color: 'var(--yellow)' }}>ملأ بياناتك من آخر حجز</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>اضغط لملء الاسم والموبايل والبريد</p>
          </div>
          <Zap size={20} style={{ color: 'var(--yellow)' }} fill="var(--yellow)" fillOpacity={0.25} />
        </button>
      )}

      {/* Personal info */}
      <div
        className="rounded-2xl p-4 flex flex-col gap-3 fade-in fade-in-1"
        style={{ background: 'var(--panel-2)', boxShadow: 'var(--shadow-card)' }}
      >
        <p className="text-sm font-black" style={{ color: 'var(--white)' }}>بياناتك الشخصية</p>

        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>الاسم الكامل</label>
          <input
            type="text"
            placeholder="أحمد محمد"
            value={form.name || ''}
            onChange={set('name')}
            onBlur={blur('name')}
            className="w-full rounded-xl px-4 py-3.5 text-sm placeholder-[#6e6860] focus:outline-none"
            style={{
              background: 'var(--panel-3)',
              border: `1px solid ${errors.name && touched.name ? 'var(--error)' : 'var(--line-2)'}`,
              color: 'var(--white)',
            }}
          />
          <FieldHint
            valid={touched.name && !errors.name}
            error={touched.name ? errors.name : ''}
            msg="اسمك تمام"
          />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>رقم الموبايل</label>
          <input
            type="tel"
            dir="ltr"
            placeholder="01XXXXXXXXX"
            value={form.phone || ''}
            onChange={set('phone')}
            onBlur={blur('phone')}
            className="w-full rounded-xl px-4 py-3.5 text-sm placeholder-[#6e6860] focus:outline-none"
            style={{
              background: 'var(--panel-3)',
              border: `1px solid ${errors.phone && touched.phone ? 'var(--error)' : 'var(--line-2)'}`,
              color: 'var(--white)',
            }}
          />
          <FieldHint valid={touched.phone && !errors.phone} error={touched.phone ? errors.phone : ''} msg="رقم صح" />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>البريد الإلكتروني</label>
          <input
            type="email"
            dir="ltr"
            placeholder="your@gmail.com"
            value={form.email || ''}
            onChange={set('email')}
            onBlur={blur('email')}
            className="w-full rounded-xl px-4 py-3.5 text-sm placeholder-[#6e6860] focus:outline-none"
            style={{
              background: 'var(--panel-3)',
              border: `1px solid ${errors.email && touched.email ? 'var(--error)' : 'var(--line-2)'}`,
              color: 'var(--white)',
            }}
          />
          <FieldHint valid={touched.email && !errors.email} error={touched.email ? errors.email : ''} msg="بريد صح" />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>رقم اللوحة (اختياري)</label>
          <input
            type="text"
            placeholder="أ ب ج ١٢٣٤"
            value={form.plateNumber || ''}
            onChange={set('plateNumber')}
            className="w-full rounded-xl px-4 py-3.5 text-sm placeholder-[#6e6860] focus:outline-none"
            style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--white)' }}
          />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>ملاحظات (اختياري)</label>
          <textarea
            rows={3}
            placeholder="أي تعليمات خاصة..."
            value={form.notes || ''}
            onChange={set('notes')}
            className="w-full rounded-xl px-4 py-3 text-sm placeholder-[#6e6860] focus:outline-none resize-none"
            style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--white)' }}
          />
        </div>
      </div>

      {/* Payment method */}
      <div
        className="rounded-2xl p-4 fade-in fade-in-2"
        style={{ background: 'var(--panel-2)', boxShadow: 'var(--shadow-card)' }}
      >
        <p className="text-sm font-black mb-3" style={{ color: 'var(--white)' }}>طريقة الدفع</p>
        <div className="flex gap-2">
          {paymentMethods.map(m => {
            const PIcon = PAYMENT_ICON[m] || CreditCard;
            return (
            <button
              key={m}
              type="button"
              onClick={() => { setForm(f => ({ ...f, paymentMethod: m })); setErrors(e => ({ ...e, paymentMethod: '' })); }}
              className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold active:scale-95 transition-transform"
              style={{
                background: form.paymentMethod === m ? 'var(--yellow-soft)' : 'var(--panel-3)',
                border: `1px solid ${form.paymentMethod === m ? 'var(--yellow-line)' : (errors.paymentMethod ? 'var(--error)' : 'var(--line-2)')}`,
                color: form.paymentMethod === m ? 'var(--yellow)' : 'var(--muted)',
              }}
            >
              <PIcon size={18} strokeWidth={2.2} />
              {m}
            </button>
          );})}
        </div>
        {errors.paymentMethod && <p className="text-xs mt-2 font-bold" style={{ color: 'var(--error)' }}>{errors.paymentMethod}</p>}

        {form.paymentMethod === 'Instapay' && (
          <div className="mt-4">
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--muted)' }}>
              ارفع صورة إيصال الدفع (اختياري)
            </p>
            <label
              className="flex flex-col items-center justify-center rounded-xl py-5 cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: 'var(--panel-3)', border: '2px dashed var(--line-2)' }}
            >
              {imgPreview ? (
                <img src={imgPreview} alt="preview" className="max-h-32 rounded-lg object-contain" />
              ) : (
                <>
                  <Paperclip size={22} className="mb-1" style={{ color: 'var(--muted)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>اضغط لاختيار الصورة</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleImg} />
            </label>
          </div>
        )}
      </div>

      {/* Coupon */}
      <div
        className="rounded-2xl p-4 fade-in fade-in-3"
        style={{ background: 'var(--panel-2)', boxShadow: 'var(--shadow-card)' }}
      >
        <p className="text-sm font-black mb-3" style={{ color: 'var(--white)' }}>كود خصم</p>
        <div className="flex gap-2">
          <input
            type="text"
            dir="ltr"
            placeholder="DRCARE10"
            value={form.couponCode || ''}
            onChange={set('couponCode')}
            className="flex-1 rounded-xl px-4 py-3 text-sm placeholder-[#6e6860] focus:outline-none"
            style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--white)' }}
          />
          <Button variant="primary" size="md" onClick={checkCoupon} className="flex-shrink-0" style={{ padding: '0.75rem 1.1rem' }}>
            تطبيق
          </Button>
        </div>
        {couponMsg && (
          <p className="text-xs mt-2 font-bold" style={{ color: couponMsg.ok ? 'var(--success)' : 'var(--error)' }}>
            {couponMsg.text}
          </p>
        )}
      </div>

      {/* Summary box */}
      <div
        className="rounded-2xl p-4 fade-in fade-in-4"
        style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', boxShadow: 'var(--shadow-yellow-glow)' }}
      >
        <p className="text-xs font-black mb-3" style={{ color: 'var(--yellow)' }}>ملخص الحجز</p>
        <div className="flex flex-col gap-2">
          {pkg && (
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--muted)' }}>الباقة</span>
              <span className="font-bold" style={{ color: 'var(--white)' }}>{pkg.name}</span>
            </div>
          )}
          {car && (
            <div className="flex justify-between items-center text-sm">
              <span style={{ color: 'var(--muted)' }}>نوع العربية</span>
              <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: 'var(--white)' }}>
                {(() => { const CarIcon = CAR_TYPE_ICON[car.code] || Car; return <CarIcon size={14} />; })()} {car.name}
              </span>
            </div>
          )}
          {form.apptDate && (
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--muted)' }}>الميعاد</span>
              <span className="font-bold" style={{ color: 'var(--white)' }}>
                {form.apptDate}{form.apptTime ? ` - ${formatTimeAr(form.apptTime)}` : ''}
              </span>
            </div>
          )}
          {dur && (
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--muted)' }}>المدة المتوقعة</span>
              <span className="font-bold" style={{ color: 'var(--white)' }}>{dur}</span>
            </div>
          )}
          {appliedCoupon && (
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--muted)' }}>خصم الكود</span>
              <span className="font-bold" style={{ color: 'var(--success)' }}>- {appliedCoupon.discount} ج</span>
            </div>
          )}
          <div className="h-px my-1" style={{ background: 'var(--yellow-line)' }} />
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>الإجمالي</span>
            <span className="text-2xl font-black" style={{ color: 'var(--yellow)' }}>
              {base > 0 ? `${total} ج` : 'حسب الشغل'}
            </span>
          </div>
        </div>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div
          className="rounded-xl p-3 text-sm font-bold text-center"
          style={{
            background: statusMsg.ok ? 'rgba(111,207,71,0.1)' : 'rgba(240,83,62,0.1)',
            color: statusMsg.ok ? 'var(--success)' : 'var(--error)',
          }}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <Button variant="secondary" size="lg" onClick={onBack} className="flex-1">
          <span className="inline-flex items-center gap-1.5"><ChevronRight size={16} /> رجوع</span>
        </Button>
        <Button variant="primary" size="lg" onClick={handleSubmit} disabled={submitting} className="flex-1">
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              جاري الحجز...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">تأكيد الحجز <ChevronRight size={16} className="rotate-180" /></span>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ─── Main BookingScreen ──────────────────────────────── */
export default function BookingScreen() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();

  const [step, setStep]       = useState(0);
  const [config, setConfig]   = useState({
    packages: FALLBACK_PACKAGES, carTypes: FALLBACK_CAR_TYPES,
    branches: FALLBACK_BRANCHES, paymentMethods: FALLBACK_PAYMENT_METHODS,
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg]   = useState(null);

  const [form, setForm] = useState({
    name:           user?.name    || '',
    email:          user?.email   || '',
    phone:          user?.phone   || '',
    notes:          '',
    plateNumber:    '',
    servicePackage: location.state?.service  || '',
    carType:        location.state?.carType  || 'sedan',
    paymentMethod:  '',
    apptDate:       '',
    apptTime:       '',
    couponCode:     '',
    paymentImg:     null,
  });

  useEffect(() => {
    fetchConfig().then(setConfig).catch(() => {});
  }, []);

  const submit = async (appliedCoupon) => {
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const payload = {
        name:           form.name.trim(),
        email:          form.email.trim(),
        phone:          form.phone.trim(),
        notes:          form.notes.trim() || null,
        plateNumber:    form.plateNumber.trim() || null,
        servicePackage: form.servicePackage,
        carType:        form.carType,
        branch:         config.branches[0],
        paymentMethod:  form.paymentMethod,
        appointment:    form.apptDate && form.apptTime
          ? `${form.apptDate}T${form.apptTime}`
          : form.apptDate || null,
        couponCode:     appliedCoupon?.code || null,
      };
      const res = await secureFetch('../api/bookings.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.ok && d.booking?.id) {
        navigate('/booking-success', { state: { booking: d.booking } });
      } else {
        setStatusMsg({ ok: false, text: d.message || 'حصل خطأ، حاول تاني' });
      }
    } catch {
      setStatusMsg({ ok: false, text: 'مفيش اتصال بالإنترنت' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--black)' }}>

      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
        style={{
          background: 'rgba(2,2,2,0.92)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <button
          type="button"
          onClick={() => (step > 0 ? setStep(s => s - 1) : navigate(-1))}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
          style={{ background: 'var(--panel-3)', boxShadow: 'var(--shadow-card)' }}
        >
          <ChevronLeft size={18} style={{ color: 'var(--muted)' }} />
        </button>
        <div>
          <h1 className="text-base font-black" style={{ color: 'var(--white)' }}>حجز موعد</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>خطوة {step + 1} من 3</p>
        </div>
      </header>

      {/* Step indicator */}
      <div className="flex-shrink-0" style={{ boxShadow: 'var(--shadow-card)' }}>
        <StepBar current={step} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {step === 0 && (
          <Step1
            packages={config.packages}
            carTypes={config.carTypes}
            form={form}
            setForm={setForm}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <Step2
            form={form}
            setForm={setForm}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <Step3
            packages={config.packages}
            carTypes={config.carTypes}
            paymentMethods={config.paymentMethods}
            form={form}
            setForm={setForm}
            onBack={() => setStep(1)}
            onSubmit={submit}
            submitting={submitting}
            statusMsg={statusMsg}
          />
        )}
      </div>
    </div>
  );
}
