import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Check, Paperclip, Loader2, Clock, CalendarDays, Wallet, Smartphone, CreditCard,
  User, Phone as PhoneIcon, Mail, Ticket as TicketIcon, AlertTriangle, ArrowLeft, ArrowRight, Zap,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api, secureFetch } from '../lib/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import CarArt from '../components/brand/CarArt';
import WashLine from '../components/brand/WashLine';
import Plate, { PlateInput } from '../components/brand/Plate';
import Ticket, { TicketField } from '../components/brand/Ticket';
import { Mixed } from '../lib/bidi';
import { getPackageVisual, sortForMenu } from '../lib/packageVisuals';
import {
  FALLBACK_PACKAGES, FALLBACK_CAR_TYPES, FALLBACK_BRANCHES, FALLBACK_PAYMENT_METHODS,
  fetchConfig,
} from '../lib/config';

const PAYMENT_ICON = { 'كاش': Wallet, 'Instapay': Smartphone };

const DUR_MAP = {
  'inside-out': '~ 45 دقيقة',
  'outside':    '~ 20 دقيقة',
  'deep':       '~ 90 دقيقة',
  'cover':      '~ 15 دقيقة',
  'rims':       '~ 20 دقيقة',
  'engine':     '~ 30 دقيقة',
  'chemical':   'حسب الشغل',
  'carpet':     'حسب المساحة',
  'blanket':    '~ 30 دقيقة',
};

const STEPS = ['الغسلة', 'الميعاد', 'بياناتك'];
const STEP_TITLES = ['اختار عربيتك وغسلتك', 'اختار ميعادك', 'كمّل بياناتك'];

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

function apptLabel(date, time) {
  if (!date) return null;
  const { day, num, month } = formatDateAr(date);
  return `${day} ${num} ${month}${time ? ` · ${formatTimeAr(time)}` : ''}`;
}

/* ─── Small UI pieces ──────────────────────────────────── */
function FieldHint({ valid, error, msg }) {
  if (!msg && !error) return null;
  return (
    <p className="text-xs mt-1.5 font-bold inline-flex items-center gap-1" style={{ color: valid ? 'var(--success)' : 'var(--error)' }}>
      {valid && <Check size={13} strokeWidth={3.4} />}
      {valid ? msg : error}
    </p>
  );
}

const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[12px] font-bold mb-1.5" style={{ color: 'var(--muted)' }}>{children}</label>
);

const Panel = ({ title, children, className = '' }) => (
  <section className={`p-4 ${className}`} style={{ background: 'var(--panel-2)', border: '2px solid var(--line-2)', borderRadius: 10 }}>
    {title && <h3 className="font-display text-[1.25rem] leading-none mb-3.5">{title}</h3>}
    {children}
  </section>
);

/* The wash line as the stepper + the step's name */
function StepHeader({ step, onBack }) {
  return (
    <div className="flex-shrink-0 px-4 pt-3 pb-3" style={{ borderBottom: '2px solid var(--line-2)' }}>
      <WashLine stage={step} labels={STEPS} compact finish={false} car="sedan" />
      <div className="flex items-center justify-between mt-1">
        <h1 className="font-display text-[1.6rem] leading-none">{STEP_TITLES[step]}</h1>
        {step > 0 ? (
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[13px] font-bold active:opacity-60" style={{ color: 'var(--yellow)' }}>
            <ArrowRight size={15} strokeWidth={3} /> رجوع
          </button>
        ) : (
          <span className="led num" style={{ fontSize: 22 }}>1/3</span>
        )}
      </div>
    </div>
  );
}

/* Total on an LED board + the one primary action of the step */
function ActionBar({ total, priced = true, label, onClick, disabled, loading }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3" style={{ background: 'var(--black)', borderTop: '2px solid var(--line-2)' }}>
      <div className="led-board flex items-baseline gap-1.5 px-3 py-1.5 flex-shrink-0" style={{ borderRadius: 6, minWidth: 100 }} aria-label="الإجمالي التقريبي">
        <span className="led num relative z-[1]" style={{ fontSize: 34 }}>{priced ? total : '—'}</span>
        {priced && <span className="font-display relative z-[1]" style={{ fontSize: 20, color: 'var(--yellow)' }}>ج</span>}
      </div>
      <Button size="lg" onClick={onClick} disabled={disabled} className="flex-1">
        {loading ? <><Loader2 size={20} className="animate-spin" /> جاري الحجز...</> : <>{label} <ArrowLeft size={20} strokeWidth={3} /></>}
      </Button>
    </div>
  );
}

/* ─── Step 1: الغسلة ─────────────────────────────────── */
function Step1({ packages, carTypes, form, setForm, onNext }) {
  const [pkgError, setPkgError] = useState('');
  const selected = form.servicePackage;
  const selectedCar = form.carType;
  const pkg = packages.find(p => p.code === selected);
  const car = carTypes.find(c => c.code === selectedCar);
  const price = (pkg?.price || pkg?.base_price || 0) + (car?.extra || 0);
  const items = sortForMenu(packages);

  const handleNext = () => {
    if (!selected) { setPkgError('اختار الغسلة الأول'); return; }
    if (!selectedCar) { setPkgError('اختار نوع العربية'); return; }
    setPkgError('');
    onNext();
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto scroll-hide">
        <div className="flex flex-col gap-6 p-4 pb-6">

          <section className="fade-in">
            <h2 className="text-[12px] font-bold mb-2.5" style={{ color: 'var(--muted)' }}>نوع العربية</h2>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="نوع العربية">
              {carTypes.map(c => {
                const on = selectedCar === c.code;
                return (
                  <button
                    key={c.code} type="button" role="radio" aria-checked={on}
                    onClick={() => setForm(f => ({ ...f, carType: c.code }))}
                    className="flex flex-col items-center gap-1.5 pt-3 pb-2.5 active:translate-y-0.5 transition-transform"
                    style={{ background: on ? 'var(--yellow)' : 'var(--panel-2)', color: on ? 'var(--on-yellow)' : 'var(--white-2)', borderRadius: 9, border: `2px solid ${on ? 'var(--yellow)' : 'var(--line-2)'}` }}
                  >
                    <CarArt type={c.code} style={{ width: '84%', height: 'auto', color: on ? 'var(--on-yellow)' : 'var(--white-2)' }} />
                    <span className="text-[12px] font-bold leading-none">{c.name}</span>
                    <span className="text-[10px] font-semibold leading-none" style={{ opacity: on ? 0.75 : 1, color: on ? 'inherit' : 'var(--muted-2)' }}>
                      {c.extra > 0 ? `+${c.extra} ج` : 'أساسي'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="fade-in fade-in-1">
            <h2 className="text-[12px] font-bold mb-2.5" style={{ color: 'var(--muted)' }}>الغسلة</h2>
            <div className="board px-2 py-1.5" role="radiogroup" aria-label="الغسلة">
              {items.map((p, i) => {
                const v = getPackageVisual(p.code);
                const on = selected === p.code;
                const pr = p.price || p.base_price || 0;
                return (
                  <button
                    key={p.code} type="button" role="radio" aria-checked={on}
                    onClick={() => { setForm(f => ({ ...f, servicePackage: p.code })); setPkgError(''); }}
                    className="block w-full text-right px-2.5 py-3 my-0.5 transition-colors duration-75"
                    style={{ background: on ? 'var(--yellow)' : 'transparent', color: on ? 'var(--on-yellow)' : 'var(--white)', borderRadius: 6 }}
                  >
                    <span className="flex items-baseline gap-2.5">
                      <span className="font-display text-base self-center flex items-center justify-center flex-shrink-0 pt-1" style={{ width: 26, height: 26, borderRadius: 5, background: on ? 'var(--on-yellow)' : 'var(--yellow)', color: on ? 'var(--yellow)' : 'var(--on-yellow)' }}>
                        {on ? <Check size={15} strokeWidth={4} style={{ marginTop: -3 }} /> : i + 1}
                      </span>
                      <span className="text-[0.92rem] font-semibold min-w-0"><Mixed>{p.name}</Mixed></span>
                      <span className="leader" style={on ? { borderColor: 'rgba(17,18,20,0.35)' } : undefined} />
                      {pr > 0
                        ? <span className="font-display text-[1.5rem] leading-none flex-shrink-0 num" style={{ color: on ? 'var(--on-yellow)' : 'var(--yellow)' }}>{pr}</span>
                        : <span className="text-[12px] font-bold flex-shrink-0" style={{ color: on ? 'var(--on-yellow)' : 'var(--yellow)' }}>حسب الشغل</span>}
                    </span>
                    {v.desc && <span className="block text-[11.5px] mt-1 pr-[36px]" style={{ color: on ? 'rgba(17,18,20,0.72)' : 'var(--muted)' }}>{v.desc}</span>}
                  </button>
                );
              })}
            </div>
            {pkgError && <p className="text-sm mt-2.5 font-bold" style={{ color: 'var(--error)' }} role="alert">{pkgError}</p>}
          </section>
        </div>
      </div>
      <ActionBar total={price} priced={price > 0 || !selected} label="التالي" onClick={handleNext} />
    </>
  );
}

/* ─── Step 2: الميعاد ───────────────────────────────── */
function Step2({ form, setForm, onNext, price }) {
  /* api/slots.php returns every future slot grouped by date in one call
     ({ "2026-07-09": [{id,time,available}, ...] }) — the same shape script.js uses. The day
     chips are derived from what the admin actually opened, never a hard-coded week. */
  const [allSlots, setAllSlots] = useState({});
  const [loading, setLoading]   = useState(true);
  const availDates = Object.keys(allSlots).sort().filter(date =>
    (allSlots[date] || []).some(s => s.available > 0)
  );

  useEffect(() => {
    fetch('/api/slots.php', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(d => setAllSlots(d.slots || {}))
      .catch(() => setAllSlots({}))
      .finally(() => setLoading(false));
  }, []);

  const dur = DUR_MAP[form.servicePackage] || null;
  const availSlots = (allSlots[form.apptDate] || []).filter(s => s.available > 0);

  return (
    <>
      <div className="flex-1 overflow-y-auto scroll-hide">
        <div className="flex flex-col gap-6 p-4 pb-6">

          <section className="fade-in">
            <h2 className="text-[12px] font-bold mb-2.5" style={{ color: 'var(--muted)' }}>اليوم</h2>
            {loading ? (
              <div className="flex gap-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-[92px] w-[74px] skeleton flex-shrink-0" style={{ borderRadius: 9 }} />)}</div>
            ) : availDates.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1 scroll-fade-x scroll-hide" role="radiogroup" aria-label="اليوم">
                {availDates.map(d => {
                  const { day, num, month } = formatDateAr(d);
                  const sel = form.apptDate === d;
                  return (
                    <button
                      key={d} type="button" role="radio" aria-checked={sel}
                      onClick={() => setForm(f => ({ ...f, apptDate: d, apptTime: '' }))}
                      className="flex-shrink-0 flex flex-col items-center overflow-hidden active:translate-y-0.5 transition-transform"
                      style={{ minWidth: 74, borderRadius: 9, border: `2px solid ${sel ? 'var(--yellow)' : 'var(--line-2)'}`, background: sel ? 'var(--yellow)' : 'var(--panel-2)', color: sel ? 'var(--on-yellow)' : 'var(--white)' }}
                    >
                      <span className="w-full text-center text-[11px] font-bold py-1" style={{ background: sel ? 'var(--on-yellow)' : 'var(--panel-3)', color: sel ? 'var(--yellow)' : 'var(--muted)' }}>{day}</span>
                      <span className="font-display text-[2.1rem] leading-none pt-2.5 pb-0.5 num">{num}</span>
                      <span className="text-[11px] font-semibold pb-2" style={{ opacity: 0.8 }}>{month}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>مفيش مواعيد محددة دلوقتي — اختار يوم يدوياً</p>
                <Input type="date" value={form.apptDate} onChange={e => setForm(f => ({ ...f, apptDate: e.target.value, apptTime: '' }))} icon={CalendarDays} />
              </div>
            )}
          </section>

          {form.apptDate && (
            <section className="fade-in">
              <h2 className="text-[12px] font-bold mb-2.5" style={{ color: 'var(--muted)' }}>الساعة</h2>
              {loading ? (
                <div className="grid grid-cols-3 gap-2">{[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-12 skeleton" style={{ borderRadius: 8 }} />)}</div>
              ) : availSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="الساعة">
                  {availSlots.map(s => {
                    const sel = form.apptTime === s.time;
                    return (
                      <button
                        key={s.time} type="button" role="radio" aria-checked={sel}
                        onClick={() => setForm(f => ({ ...f, apptTime: s.time }))}
                        className="py-3 text-[0.95rem] font-bold active:translate-y-0.5 transition-transform num"
                        style={{ borderRadius: 8, border: `2px solid ${sel ? 'var(--yellow)' : 'var(--line-2)'}`, background: sel ? 'var(--yellow)' : 'var(--panel-2)', color: sel ? 'var(--on-yellow)' : 'var(--white-2)' }}
                      >
                        {formatTimeAr(s.time)}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>أدخل الوقت يدوياً</p>
                  <Input type="time" value={form.apptTime} onChange={e => setForm(f => ({ ...f, apptTime: e.target.value }))} icon={Clock} />
                </div>
              )}
            </section>
          )}

          {dur && (
            <div className="flex items-center gap-2.5 px-4 py-3 fade-in" style={{ background: 'var(--panel-2)', border: '2px dashed var(--line-2)', borderRadius: 10 }}>
              <Clock size={17} style={{ color: 'var(--yellow)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--white-2)' }}>المدة المتوقعة: <span className="font-bold" style={{ color: 'var(--yellow)' }}>{dur}</span></span>
            </div>
          )}

          <p className="text-xs text-center" style={{ color: 'var(--muted-2)' }}>
            تقدر تكمّل من غير ميعاد — هنتفق معاك بعدين
          </p>
        </div>
      </div>
      <ActionBar total={price} priced={price > 0} label="التالي" onClick={onNext} />
    </>
  );
}

/* ─── Step 3: بياناتك ────────────────────────────────── */
function Step3({ packages, carTypes, paymentMethods, form, setForm, onSubmit, submitting, statusMsg }) {
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
        setCouponMsg({ ok: true, text: `تم تطبيق الكود — خصم ${d.discount} جنيه` });
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
  const when = apptLabel(form.apptDate, form.apptTime);

  return (
    <>
      <div className="flex-1 overflow-y-auto scroll-hide">
        <div className="flex flex-col gap-4 p-4 pb-6">

          {user && (
            <button
              type="button" onClick={autoFill}
              className="flex items-center justify-between px-4 py-3 active:translate-y-0.5 transition-transform fade-in"
              style={{ background: 'var(--panel-2)', border: '2px dashed var(--yellow-line)', borderRadius: 10 }}
            >
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: 'var(--yellow)' }}>املا بياناتك من حسابك</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>الاسم والموبايل والبريد بضغطة</p>
              </div>
              <Zap size={20} style={{ color: 'var(--yellow)' }} strokeWidth={2.6} />
            </button>
          )}

          <Panel title="بياناتك" className="fade-in fade-in-1">
            <div className="flex flex-col gap-4">
              <div>
                <Label htmlFor="bk-name">الاسم الكامل</Label>
                <Input id="bk-name" type="text" placeholder="أحمد محمد" value={form.name || ''} onChange={set('name')} onBlur={blur('name')} icon={User} error={!!(errors.name && touched.name)} autoComplete="name" />
                <FieldHint valid={touched.name && !errors.name} error={touched.name ? errors.name : ''} msg="تمام" />
              </div>
              <div>
                <Label htmlFor="bk-phone">رقم الموبايل</Label>
                <Input id="bk-phone" type="tel" dir="ltr" placeholder="01XXXXXXXXX" value={form.phone || ''} onChange={set('phone')} onBlur={blur('phone')} icon={PhoneIcon} error={!!(errors.phone && touched.phone)} autoComplete="tel" inputMode="numeric" />
                <FieldHint valid={touched.phone && !errors.phone} error={touched.phone ? errors.phone : ''} msg="الرقم صح" />
              </div>
              <div>
                <Label htmlFor="bk-email">البريد الإلكتروني</Label>
                <Input id="bk-email" type="email" dir="ltr" placeholder="your@gmail.com" value={form.email || ''} onChange={set('email')} onBlur={blur('email')} icon={Mail} error={!!(errors.email && touched.email)} autoComplete="email" />
                <FieldHint valid={touched.email && !errors.email} error={touched.email ? errors.email : ''} msg="البريد صح" />
              </div>
            </div>
          </Panel>

          <Panel title="العربية" className="fade-in fade-in-2">
            <Label>رقم اللوحة <span style={{ color: 'var(--muted-2)' }}>(اختياري)</span></Label>
            <div className="flex justify-center py-1.5">
              <PlateInput value={form.plateNumber || ''} onChange={v => setForm(f => ({ ...f, plateNumber: v }))} />
            </div>
            <div className="mt-4">
              <Label htmlFor="bk-notes">ملاحظات <span style={{ color: 'var(--muted-2)' }}>(اختياري)</span></Label>
              <textarea
                id="bk-notes" rows={3} placeholder="مثلاً: ركّزوا على الفرش والجنوط"
                value={form.notes || ''} onChange={set('notes')}
                className="textarea-premium px-4 py-3 text-[0.95rem] resize-none"
              />
            </div>
          </Panel>

          <Panel title="الدفع" className="fade-in fade-in-3">
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="طريقة الدفع">
              {paymentMethods.map(m => {
                const PIcon = PAYMENT_ICON[m] || CreditCard;
                const on = form.paymentMethod === m;
                return (
                  <button
                    key={m} type="button" role="radio" aria-checked={on}
                    onClick={() => { setForm(f => ({ ...f, paymentMethod: m })); setErrors(e => ({ ...e, paymentMethod: '' })); }}
                    className="flex items-center justify-center gap-2 py-3.5 font-display text-[1.25rem] active:translate-y-0.5 transition-transform"
                    style={{
                      borderRadius: 8,
                      background: on ? 'var(--yellow)' : 'var(--panel-3)',
                      color: on ? 'var(--on-yellow)' : 'var(--white-2)',
                      border: `2px solid ${on ? 'var(--yellow)' : (errors.paymentMethod ? 'var(--error)' : 'var(--line-2)')}`,
                    }}
                  >
                    <PIcon size={19} strokeWidth={2.5} /> {m}
                  </button>
                );
              })}
            </div>
            {errors.paymentMethod && <p className="text-xs mt-2 font-bold" style={{ color: 'var(--error)' }} role="alert">{errors.paymentMethod}</p>}

            {form.paymentMethod === 'Instapay' && (
              <div className="mt-4">
                <div className="overflow-hidden mb-3" style={{ border: '2px solid var(--error)', borderRadius: 8 }}>
                  <div className="hazard hazard--sm" />
                  <div className="flex items-start gap-2.5 p-3">
                    <AlertTriangle size={18} strokeWidth={2.6} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
                    <p className="text-[13px] font-bold leading-relaxed" style={{ color: 'var(--white)' }}>
                      لو مرفعتش صورة إيصال التحويل، <span style={{ color: 'var(--error)', textDecoration: 'underline' }}>الدفع مش هيتحسب</span> والحجز هيتعامل على إنه غير مدفوع.
                    </p>
                  </div>
                </div>
                <p className="text-[12px] font-bold mb-2" style={{ color: 'var(--muted)' }}>صورة إيصال التحويل</p>
                <label
                  className="flex flex-col items-center justify-center py-5 cursor-pointer active:translate-y-0.5 transition-transform"
                  style={{ background: 'var(--panel-3)', border: '2px dashed var(--steel)', borderRadius: 8 }}
                >
                  {imgPreview ? (
                    <img src={imgPreview} alt="معاينة الإيصال" className="max-h-32 rounded object-contain" />
                  ) : (
                    <>
                      <Paperclip size={22} className="mb-1" style={{ color: 'var(--yellow)' }} />
                      <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>دوس واختار الصورة</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImg} />
                </label>
              </div>
            )}
          </Panel>

          <Panel title="كود خصم" className="fade-in fade-in-4">
            <div className="flex gap-2">
              <Input type="text" dir="ltr" placeholder="DRCARE10" value={form.couponCode || ''} onChange={set('couponCode')} icon={TicketIcon} className="flex-1" aria-label="كود الخصم" />
              <Button size="md" onClick={checkCoupon} className="flex-shrink-0">تطبيق</Button>
            </div>
            {couponMsg && <p className="text-xs mt-2 font-bold" style={{ color: couponMsg.ok ? 'var(--success)' : 'var(--error)' }}>{couponMsg.text}</p>}
          </Panel>

          {/* The booking, as the ticket you're about to get */}
          <Ticket className="fade-in fade-in-5" stub={
            <div className="flex items-center justify-between gap-3">
              {form.plateNumber ? <Plate value={form.plateNumber} size="sm" /> : <span className="ticket__k">مسودة — مش مؤكد لسه</span>}
              <div className="text-left">
                <div className="ticket__k">الإجمالي</div>
                <div className="font-display text-[2rem] leading-none num">{base > 0 ? <>{total} <span className="text-lg">ج</span></> : <span className="text-lg">حسب الشغل</span>}</div>
              </div>
            </div>
          }>
            <p className="ticket__k" style={{ letterSpacing: '0.12em' }}>DR.CARE · ملخص الحجز</p>
            <div className="ticket__grid grid grid-cols-2 gap-x-4 gap-y-3 mt-3">
              {pkg && <TicketField label="الغسلة"><Mixed>{pkg.name}</Mixed></TicketField>}
              {car && <TicketField label="العربية">{car.name}</TicketField>}
              {when && <TicketField label="الميعاد">{when}</TicketField>}
              {dur && <TicketField label="المدة">{dur}</TicketField>}
              {appliedCoupon && <TicketField label="خصم الكود">- {appliedCoupon.discount} ج</TicketField>}
            </div>
          </Ticket>

          {statusMsg && (
            <div
              role="alert"
              className="p-3 text-sm font-bold text-center"
              style={{ borderRadius: 8, border: `2px solid ${statusMsg.ok ? 'var(--success)' : 'var(--error)'}`, color: statusMsg.ok ? 'var(--success)' : 'var(--error)' }}
            >
              {statusMsg.text}
            </div>
          )}
        </div>
      </div>
      <ActionBar total={total} priced={base > 0} label="تأكيد الحجز" onClick={handleSubmit} disabled={submitting} loading={submitting} />
    </>
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

  const pkg = config.packages.find(p => p.code === form.servicePackage);
  const car = config.carTypes.find(c => c.code === form.carType);
  const price = (pkg?.price || pkg?.base_price || 0) + (car?.extra || 0);

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
      const res = await secureFetch('/api/bookings.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.ok && d.booking?.id) {
        navigate('/booking-success', {
          state: {
            booking: {
              ...d.booking,
              packageName: pkg?.name || null,
              carName: car?.name || null,
              when: apptLabel(form.apptDate, form.apptTime),
              plate: form.plateNumber.trim() || null,
            },
          },
        });
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
    <div className="h-full flex flex-col" style={{ background: 'var(--black)', paddingBottom: 'calc(64px + var(--safe-bottom))', paddingTop: 'var(--safe-top)' }}>
      <StepHeader step={step} onBack={() => setStep(s => Math.max(0, s - 1))} />

      {step === 0 && (
        <Step1 packages={config.packages} carTypes={config.carTypes} form={form} setForm={setForm} onNext={() => setStep(1)} />
      )}
      {step === 1 && (
        <Step2 form={form} setForm={setForm} price={price} onNext={() => setStep(2)} />
      )}
      {step === 2 && (
        <Step3
          packages={config.packages} carTypes={config.carTypes} paymentMethods={config.paymentMethods}
          form={form} setForm={setForm} onSubmit={submit} submitting={submitting} statusMsg={statusMsg}
        />
      )}
    </div>
  );
}
