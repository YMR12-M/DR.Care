import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api, secureFetch } from '../lib/api';

/* ─── Fallback / constants ──────────────────────────────── */
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

const PAYMENT_METHODS = [
  { code: 'Cash',          name: 'كاش',          icon: '💵' },
  { code: 'Instapay',      name: 'Instapay',      icon: '📱' },
  { code: 'Vodafone Cash', name: 'فودافون كاش',  icon: '📲' },
];

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
function DarkInput({ error, label, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>{label}</label>
      )}
      <input
        className="w-full rounded-xl px-4 py-3.5 text-sm placeholder-[#6e6860] focus:outline-none"
        style={{
          background: 'var(--panel-3)',
          border: `1px solid ${error ? 'var(--error)' : 'var(--line-2)'}`,
          color: 'var(--white)',
        }}
        {...props}
      />
      {error && <p className="text-xs mt-1 font-bold" style={{ color: 'var(--error)' }}>{error}</p>}
    </div>
  );
}

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
              {done ? '✓' : i + 1}
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
function Step1({ packages, form, setForm, onNext }) {
  const [pkgError, setPkgError] = useState('');
  const selected = form.servicePackage;
  const selectedCar = form.carType;
  const rec = RECOMMEND[selectedCar];
  const pkg = packages.find(p => p.code === selected);
  const car = CAR_TYPES.find(c => c.code === selectedCar);
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
      <div>
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
                border: `1px solid ${selected === p.code ? 'var(--yellow-line)' : 'var(--line)'}`,
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
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-2)' }}>⏱ {DUR_MAP[p.code]}</p>
              )}
            </button>
          ))}
        </div>
        {pkgError && <p className="text-xs mt-2 font-bold" style={{ color: 'var(--error)' }}>{pkgError}</p>}
      </div>

      {/* Car types */}
      <div>
        <p className="text-xs font-black mb-3" style={{ color: 'var(--muted)' }}>نوع العربية</p>
        <div className="grid grid-cols-2 gap-2.5">
          {CAR_TYPES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => setForm(f => ({ ...f, carType: c.code }))}
              className="flex items-center gap-3 rounded-2xl p-4 active:scale-95 transition-transform"
              style={{
                background: selectedCar === c.code ? 'var(--yellow-soft)' : 'var(--panel-2)',
                border: `1px solid ${selectedCar === c.code ? 'var(--yellow-line)' : 'var(--line)'}`,
              }}
            >
              <span className="text-2xl">{c.icon}</span>
              <div className="text-right">
                <p className="text-sm font-black" style={{ color: selectedCar === c.code ? 'var(--yellow)' : 'var(--white)' }}>
                  {c.name}
                </p>
                {c.extra > 0 && (
                  <p className="text-[10px]" style={{ color: 'var(--muted-2)' }}>+{c.extra} ج</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Smart recommendation */}
      {selectedCar && rec && (
        <div
          className="rounded-2xl p-4 flex items-center justify-between gap-3"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--yellow-line)' }}
        >
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--yellow)' }}>💡 اقتراح ذكي</p>
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
          className="rounded-2xl p-4 flex items-center justify-between"
          style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)' }}
        >
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--muted)' }}>السعر المتوقع</p>
            {DUR_MAP[selected] && (
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-2)' }}>⏱ {DUR_MAP[selected]}</p>
            )}
          </div>
          <p className="text-2xl font-black" style={{ color: 'var(--yellow)' }}>
            {price > 0 ? `${price} ج` : 'حسب الشغل'}
          </p>
        </div>
      )}

      {/* Next button */}
      <button
        type="button"
        onClick={handleNext}
        className="w-full btn-yellow py-4 rounded-2xl text-base font-black active:scale-95 transition-transform"
      >
        التالي ←
      </button>
    </div>
  );
}

/* ─── Step 2: الميعاد ───────────────────────────────── */
function Step2({ form, setForm, onNext, onBack }) {
  const [slots, setSlots]     = useState([]);
  const [loading, setLoading] = useState(false);
  const dateScrollRef = useRef(null);
  const availDates = getNextDays(10);

  useEffect(() => {
    if (!form.apptDate) { setSlots([]); return; }
    setLoading(true);
    fetch(`../api/slots.php?date=${form.apptDate}`, { credentials: 'same-origin' })
      .then(r => r.json())
      .then(d => setSlots(d.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [form.apptDate]);

  const pkg = form.servicePackage;
  const dur = DUR_MAP[pkg] || null;

  const handleNext = () => {
    onNext();
  };

  const availSlots = slots.filter(s => s.available !== false);

  return (
    <div className="flex flex-col gap-5 p-4 pb-24">

      {/* Date chips */}
      <div>
        <p className="text-xs font-black mb-3" style={{ color: 'var(--muted)' }}>اختار اليوم</p>
        <div
          ref={dateScrollRef}
          className="flex gap-2 overflow-x-auto pb-2"
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
                  border: `1px solid ${sel ? 'var(--yellow)' : 'var(--line)'}`,
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
        <div>
          <p className="text-xs font-black mb-3" style={{ color: 'var(--muted)' }}>اختار الوقت</p>
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-10 w-24 rounded-xl animate-pulse" style={{ background: 'var(--panel-3)' }} />
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
                      border: `1px solid ${sel ? 'var(--yellow)' : 'var(--line)'}`,
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
          className="rounded-xl px-4 py-3 flex items-center gap-2"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
        >
          <span style={{ color: 'var(--yellow)' }}>⏱</span>
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
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-4 rounded-2xl text-base font-black active:scale-95 transition-transform"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--white-2)' }}
        >
          → رجوع
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 btn-yellow py-4 rounded-2xl text-base font-black active:scale-95 transition-transform"
        >
          التالي ←
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3: بياناتك ────────────────────────────────── */
function Step3({ packages, form, setForm, onBack, onSubmit, submitting, statusMsg }) {
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
    const car = CAR_TYPES.find(c => c.code === form.carType);
    const subtotal = (pkg?.price || pkg?.base_price || 0) + (car?.extra || 0);
    try {
      const res = await api.post('coupons.php', {
        action: 'validate', code: form.couponCode.trim().toUpperCase(), subtotal,
      });
      const d = await res.json();
      if (d.valid) {
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
  const car = CAR_TYPES.find(c => c.code === form.carType);
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
          className="flex items-center justify-between rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--yellow-line)' }}
        >
          <div className="text-right">
            <p className="text-sm font-black" style={{ color: 'var(--yellow)' }}>ملأ بياناتك من آخر حجز</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>اضغط لملء الاسم والموبايل والبريد</p>
          </div>
          <span className="text-xl">⚡</span>
        </button>
      )}

      {/* Personal info */}
      <div
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
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
        className="rounded-2xl p-4"
        style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
      >
        <p className="text-sm font-black mb-3" style={{ color: 'var(--white)' }}>طريقة الدفع</p>
        <div className="flex gap-2">
          {PAYMENT_METHODS.map(m => (
            <button
              key={m.code}
              type="button"
              onClick={() => setForm(f => ({ ...f, paymentMethod: m.code }))}
              className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold active:scale-95 transition-transform"
              style={{
                background: form.paymentMethod === m.code ? 'var(--yellow-soft)' : 'var(--panel-3)',
                border: `1px solid ${form.paymentMethod === m.code ? 'var(--yellow-line)' : 'var(--line-2)'}`,
                color: form.paymentMethod === m.code ? 'var(--yellow)' : 'var(--muted)',
              }}
            >
              <span className="text-lg">{m.icon}</span>
              {m.name}
            </button>
          ))}
        </div>

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
                  <span className="text-2xl mb-1">📎</span>
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
        className="rounded-2xl p-4"
        style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
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
          <button
            type="button"
            onClick={checkCoupon}
            className="btn-yellow px-4 rounded-xl text-sm font-black flex-shrink-0 active:scale-95 transition-transform"
          >
            تطبيق
          </button>
        </div>
        {couponMsg && (
          <p className="text-xs mt-2 font-bold" style={{ color: couponMsg.ok ? 'var(--success)' : 'var(--error)' }}>
            {couponMsg.text}
          </p>
        )}
      </div>

      {/* Summary box */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)' }}
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
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--muted)' }}>نوع العربية</span>
              <span className="font-bold" style={{ color: 'var(--white)' }}>{car.icon} {car.name}</span>
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
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-4 rounded-2xl text-base font-black active:scale-95 transition-transform"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--white-2)' }}
        >
          → رجوع
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 btn-yellow py-4 rounded-2xl text-base font-black disabled:opacity-50 active:scale-95 transition-transform"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              جاري الحجز...
            </span>
          ) : 'تأكيد الحجز ←'}
        </button>
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
  const [packages, setPackages] = useState(FALLBACK_PACKAGES);
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
    paymentMethod:  'Cash',
    apptDate:       '',
    apptTime:       '',
    couponCode:     '',
    paymentImg:     null,
  });

  useEffect(() => {
    api.get('packages.php')
      .then(r => r.json())
      .then(d => { if (d?.packages?.length) setPackages(d.packages); })
      .catch(() => {});
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
        branch:         'main',
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
          borderBottom: '1px solid var(--line)',
        }}
      >
        <button
          type="button"
          onClick={() => (step > 0 ? setStep(s => s - 1) : navigate(-1))}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)' }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: 'var(--muted)' }}>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div>
          <h1 className="text-base font-black" style={{ color: 'var(--white)' }}>حجز موعد</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>خطوة {step + 1} من 3</p>
        </div>
      </header>

      {/* Step indicator */}
      <div className="flex-shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <StepBar current={step} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {step === 0 && (
          <Step1
            packages={packages}
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
            packages={packages}
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
