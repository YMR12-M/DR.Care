import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api, secureFetch } from '../lib/api';

const CAR_TYPES = [
  { code: 'sedan', name: 'سيدان', extra: 0 },
  { code: 'suv', name: 'SUV', extra: 60 },
  { code: 'truck', name: 'بيك أب / ميني باص', extra: 80 },
];

const PAYMENT_METHODS = [
  { code: 'Cash', name: 'كاش', icon: '💵' },
  { code: 'Instapay', name: 'إنستاباي', icon: '📱' },
  { code: 'Vodafone Cash', name: 'فودافون كاش', icon: '📲' },
];

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function Input({ ...props }) {
  return (
    <input
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      {...props}
    />
  );
}

export default function BookingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [packages, setPackages] = useState([]);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    notes: '',
    plateNumber: '',
    servicePackage: location.state?.service || '',
    carType: 'sedan',
    branch: 'main',
    paymentMethod: 'Cash',
    apptDate: '',
    apptTime: '',
    couponCode: '',
  });
  const [errors, setErrors] = useState({});
  const [couponMsg, setCouponMsg] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.get('packages.php')
      .then(r => r.json())
      .then(d => { if (d.packages) setPackages(d.packages); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.apptDate) { setSlots([]); return; }
    fetch(`../api/slots.php?date=${form.apptDate}`)
      .then(r => r.json())
      .then(d => setSlots(d.slots || []))
      .catch(() => setSlots([]));
  }, [form.apptDate]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name || form.name.length < 2) e.name = 'اكتب اسمك الكامل';
    if (!/^01[0125][0-9]{8}$/.test(form.phone)) e.phone = 'رقم موبايل مصري غير صحيح';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'بريد إلكتروني غير صحيح';
    if (!form.servicePackage) e.servicePackage = 'اختار الخدمة';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const checkCoupon = async () => {
    if (!form.couponCode.trim()) return;
    const res = await api.post('coupons.php', { action: 'validate', code: form.couponCode.trim().toUpperCase(), subtotal: getPrice() });
    const d = await res.json();
    if (d.valid) {
      setAppliedCoupon(d);
      setCouponMsg({ type: 'ok', text: `✓ خصم ${d.discount} جنيه` });
    } else {
      setAppliedCoupon(null);
      setCouponMsg({ type: 'err', text: d.message || 'كود غير صالح' });
    }
  };

  const getPrice = () => {
    const pkg = packages.find(p => p.code === form.servicePackage);
    const car = CAR_TYPES.find(c => c.code === form.carType);
    const base = pkg?.base_price || pkg?.price || 0;
    return base + (car?.extra || 0);
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim() || null,
        plateNumber: form.plateNumber.trim() || null,
        servicePackage: form.servicePackage,
        carType: form.carType,
        branch: form.branch,
        paymentMethod: form.paymentMethod,
        appointment: form.apptDate && form.apptTime ? `${form.apptDate}T${form.apptTime}` : null,
        couponCode: appliedCoupon?.code || null,
      };
      const res = await secureFetch('../api/bookings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.success || d.booking_id) {
        navigate('/booking-success', { state: { booking: d } });
      } else {
        setStatus({ type: 'err', text: d.message || 'حصل خطأ، حاول تاني' });
      }
    } catch {
      setStatus({ type: 'err', text: 'مفيش اتصال بالإنترنت' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPrice = getPrice() - (appliedCoupon?.discount || 0);

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center" type="button">
          <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-800">حجز موعد</h1>
          <p className="text-xs text-slate-400">اختار الخدمة المناسبة</p>
        </div>
      </header>

      <div className="p-4 flex flex-col gap-4">
        {/* Service Package */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-3">اختار الخدمة</h2>
          {packages.length === 0 ? (
            <div className="grid grid-cols-2 gap-2 animate-pulse">
              {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl"/>)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {packages.map(pkg => (
                <button
                  key={pkg.code}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, servicePackage: pkg.code }))}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    form.servicePackage === pkg.code
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-100 bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="text-sm font-bold leading-none">{pkg.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{pkg.base_price || pkg.price} جنيه</p>
                </button>
              ))}
            </div>
          )}
          {errors.servicePackage && <p className="text-xs text-red-500 mt-2">{errors.servicePackage}</p>}
        </div>

        {/* Car Type */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-3">نوع العربية</h2>
          <div className="flex gap-2">
            {CAR_TYPES.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => setForm(f => ({ ...f, carType: c.code }))}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  form.carType === c.code
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                {c.name}
                {c.extra > 0 && <span className="block text-[10px] opacity-60">+{c.extra} جنيه</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-3">الميعاد (اختياري)</h2>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input type="date" value={form.apptDate} onChange={set('apptDate')} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="flex-1">
              {slots.length > 0 ? (
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.apptTime}
                  onChange={set('apptTime')}
                >
                  <option value="">اختار وقت</option>
                  {slots.filter(s => s.available).map(s => (
                    <option key={s.time} value={s.time}>{s.time}</option>
                  ))}
                </select>
              ) : (
                <Input type="time" value={form.apptTime} onChange={set('apptTime')} />
              )}
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-3">بياناتك</h2>
          <div className="flex flex-col gap-3">
            <Field label="الاسم الكامل" error={errors.name}>
              <Input placeholder="مثال: أحمد محمد" value={form.name} onChange={set('name')} />
            </Field>
            <Field label="رقم الموبايل" error={errors.phone}>
              <Input type="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={set('phone')} dir="ltr" />
            </Field>
            <Field label="البريد الإلكتروني" error={errors.email}>
              <Input type="email" placeholder="your@gmail.com" value={form.email} onChange={set('email')} dir="ltr" />
            </Field>
            <Field label="رقم اللوحة (اختياري)">
              <Input placeholder="مثال: أ ب ج ١٢٣٤" value={form.plateNumber} onChange={set('plateNumber')} />
            </Field>
            <Field label="ملاحظات (اختياري)">
              <textarea
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                placeholder="أي تعليمات خاصة..."
                value={form.notes}
                onChange={set('notes')}
              />
            </Field>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-3">طريقة الدفع</h2>
          <div className="flex gap-2">
            {PAYMENT_METHODS.map(m => (
              <button
                key={m.code}
                type="button"
                onClick={() => setForm(f => ({ ...f, paymentMethod: m.code }))}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-semibold transition-all ${
                  form.paymentMethod === m.code
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <span className="text-xl">{m.icon}</span>
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Coupon */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-3">كود خصم</h2>
          <div className="flex gap-2">
            <Input
              placeholder="أدخل كود الخصم"
              value={form.couponCode}
              onChange={set('couponCode')}
              dir="ltr"
            />
            <button
              type="button"
              onClick={checkCoupon}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shrink-0 active:scale-95 transition-transform"
            >
              تطبيق
            </button>
          </div>
          {couponMsg && (
            <p className={`text-xs mt-2 font-medium ${couponMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
              {couponMsg.text}
            </p>
          )}
        </div>

        {/* Summary */}
        {form.servicePackage && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">الإجمالي</span>
              <span className="font-black text-blue-700 text-lg">{totalPrice} جنيه</span>
            </div>
            {appliedCoupon && (
              <p className="text-xs text-green-600 mt-1">تم توفير {appliedCoupon.discount} جنيه</p>
            )}
          </div>
        )}

        {/* Status */}
        {status && (
          <div className={`rounded-xl p-3 text-sm font-medium text-center ${
            status.type === 'err' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
          }`}>
            {status.text}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold text-base shadow-md active:scale-95 transition-transform disabled:opacity-60 disabled:scale-100"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              جاري الحجز...
            </span>
          ) : 'تأكيد الحجز →'}
        </button>
      </div>
    </div>
  );
}
