import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Loader2, ReceiptText, LogOut, Car, CarFront, Bus, Truck,
  Wallet, Smartphone, User, Phone as PhoneIcon, Mail, Hash, Ticket, Percent,
  CheckCircle2, Plus, ChevronRight, BadgeDollarSign,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useToast } from '../hooks/useToast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconBadge from '../components/ui/IconBadge';
import Input from '../components/ui/Input';
import { getPackageVisual } from '../lib/packageVisuals';
import { FALLBACK_PACKAGES, FALLBACK_CAR_TYPES, FALLBACK_BRANCHES, FALLBACK_PAYMENT_METHODS, fetchConfig } from '../lib/config';

const CAR_TYPE_ICON = { sedan: Car, suv: CarFront, van: Bus, pickup: Truck };
const PAYMENT_ICON  = { 'كاش': Wallet, 'Instapay': Smartphone };

const TOKEN_KEY = 'dr_pos_token';

function posGet(action, params = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY) || '';
  const qs = new URLSearchParams({ action, ...params }).toString();
  return fetch(`/api/pos.php?${qs}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'X-POS-Token': token },
  });
}

/* ══════════ Token gate ══════════ */
function TokenGate({ onUnlocked }) {
  const navigate = useNavigate();
  const [token, setToken]     = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError]     = useState('');

  const unlock = async () => {
    if (!token.trim() || checking) return;
    setChecking(true); setError('');
    try {
      const res = await fetch('/api/pos.php?action=staff', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-POS-Token': token.trim() },
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        sessionStorage.setItem(TOKEN_KEY, token.trim());
        onUnlocked(d.staff || []);
      } else {
        setError(d.message || 'رمز الموظف غير صحيح');
      }
    } catch {
      setError('مفيش اتصال بالسيرفر');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--black)' }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: 'var(--yellow)' }} />
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 relative fade-in"
        style={{ background: 'var(--gradient-gold-soft)', border: '1px solid var(--yellow-line)', boxShadow: 'var(--shadow-gold-premium)' }}>
        <ShieldCheck size={32} style={{ color: 'var(--yellow)' }} strokeWidth={2.2} />
      </div>
      <h1 className="text-xl font-black mb-2 relative fade-in fade-in-1" style={{ color: 'var(--white)' }}>DR.Care POS</h1>
      <p className="text-sm mb-7 relative fade-in fade-in-2" style={{ color: 'var(--muted)' }}>أدخل رمز الموظف عشان تفتح نظام الفواتير</p>

      <div className="w-full relative fade-in fade-in-3">
        <Input
          type="password"
          dir="ltr"
          placeholder="• • • • • • • •"
          value={token}
          onChange={e => { setToken(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') unlock(); }}
          icon={ShieldCheck}
        />
        {error && <p className="text-xs font-bold mt-2 text-right" style={{ color: 'var(--error)' }}>{error}</p>}
        <Button variant="primary" size="lg" className="w-full mt-4" disabled={checking || !token.trim()} onClick={unlock}>
          {checking ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> جاري التحقق...</span> : 'دخول'}
        </Button>
        <Button variant="ghost" size="md" className="w-full mt-2" onClick={() => navigate('/profile')}>
          رجوع
        </Button>
      </div>
    </div>
  );
}

/* ══════════ Invoice receipt ══════════ */
function InvoiceView({ booking, onNew }) {
  const [qr, setQr] = useState(null);

  useEffect(() => {
    if (!booking?.claim_token) return;
    const url = `${location.origin}/app/claim?token=${booking.claim_token}`;
    QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#0a0800', light: '#ffd21f' } })
      .then(setQr)
      .catch(() => {});
  }, [booking]);

  const row = (label, value, gold) => (
    <div className="flex justify-between text-xs py-1.5">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="font-bold" style={{ color: gold ? 'var(--yellow)' : 'var(--white-2)' }}>{value}</span>
    </div>
  );

  return (
    <div className="p-5 flex flex-col gap-4 fade-in">
      <div className="flex flex-col items-center text-center pt-2">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', boxShadow: 'var(--shadow-yellow-glow)' }}>
          <CheckCircle2 size={26} style={{ color: 'var(--yellow)' }} />
        </div>
        <h2 className="text-lg font-black" style={{ color: 'var(--white)' }}>اتعملت الفاتورة ✓</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>رقم الحجز <span className="font-black" style={{ color: 'var(--yellow)' }}>#{booking.id}</span></p>
      </div>

      <Card className="p-4">
        {row('العميل', booking.name)}
        {row('الموبايل', booking.phone)}
        {booking.plate_number && row('اللوحة', booking.plate_number)}
        <div className="my-2" style={{ borderTop: '1px dashed var(--line-2)' }} />
        {row('الباقة', booking.package_name)}
        {row('العربية', booking.car_type_name)}
        {booking.car_extra > 0 && row('إضافة العربية', `${booking.car_extra} ج`)}
        {row('الدفع', booking.payment_method)}
        {booking.discount_amount > 0 && row('الخصم', `- ${booking.discount_amount} ج`)}
        <div className="my-2" style={{ borderTop: '1px dashed var(--line-2)' }} />
        <div className="flex justify-between items-center py-1">
          <span className="text-sm font-black" style={{ color: 'var(--white)' }}>الإجمالي</span>
          <span className="text-xl font-black" style={{ color: 'var(--yellow)' }}>{booking.total_price} جنيه</span>
        </div>
      </Card>

      {qr && (
        <Card className="p-4 flex flex-col items-center text-center">
          <img src={qr} alt="QR" className="rounded-xl" style={{ width: 150, height: 150 }} />
          <p className="text-xs font-bold mt-2" style={{ color: 'var(--muted)' }}>العميل يمسح الكود يتابع حجزه من التطبيق</p>
        </Card>
      )}

      <Button variant="primary" size="lg" className="w-full" onClick={onNew}>
        <span className="inline-flex items-center gap-2"><Plus size={17} /> فاتورة جديدة</span>
      </Button>
    </div>
  );
}

/* ══════════ Main POS screen ══════════ */
export default function PosScreen() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [unlocked, setUnlocked] = useState(!!sessionStorage.getItem(TOKEN_KEY));
  const [staff, setStaff]       = useState([]);
  const [config, setConfig]     = useState({ packages: FALLBACK_PACKAGES, carTypes: FALLBACK_CAR_TYPES, branches: FALLBACK_BRANCHES, paymentMethods: FALLBACK_PAYMENT_METHODS });
  const [today, setToday]       = useState(null);
  const [invoice, setInvoice]   = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    packageCode: '', carType: 'sedan', branch: FALLBACK_BRANCHES[0], paymentMethod: 'كاش',
    name: '', phone: '', plateNumber: '', email: '', notes: '', staffId: '',
    couponCode: '', manualDiscount: '', manualDiscountType: 'fixed',
  });
  const [coupon, setCoupon] = useState(null); // {code, discount}
  const [couponChecking, setCouponChecking] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const loadToday = () => {
    posGet('today').then(r => r.json()).then(d => {
      if (d.ok) setToday({ count: (d.bookings || []).length, revenue: d.revenue || 0 });
    }).catch(() => {});
  };

  useEffect(() => {
    fetchConfig().then(c => {
      setConfig(c);
      setForm(f => ({ ...f, branch: c.branches[0] || f.branch, paymentMethod: c.paymentMethods[0] || f.paymentMethod }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    posGet('staff').then(r => r.json()).then(d => {
      if (d.ok) setStaff(d.staff || []);
      else if (!d.ok) { sessionStorage.removeItem(TOKEN_KEY); setUnlocked(false); }
    }).catch(() => {});
    loadToday();
  }, [unlocked]);

  const pkg = config.packages.find(p => p.code === form.packageCode);
  const car = config.carTypes.find(c => c.code === form.carType);

  const totals = useMemo(() => {
    const pkgPrice  = Number(pkg?.price || 0);
    const carExtra  = pkg ? Number(car?.extra || 0) : 0;
    const base      = pkgPrice + carExtra;
    let discount    = coupon ? Number(coupon.discount || 0) : 0;
    const md        = Number(form.manualDiscount || 0);
    if (md > 0) discount += form.manualDiscountType === 'percent' ? Math.round(base * Math.min(md, 100)) / 100 : md;
    discount = Math.min(discount, base);
    return { base, discount, total: Math.max(0, base - discount) };
  }, [pkg, car, coupon, form.manualDiscount, form.manualDiscountType]);

  const checkCoupon = async () => {
    const code = form.couponCode.trim().toUpperCase();
    if (!code || couponChecking) return;
    setCouponChecking(true);
    try {
      const res = await posGet('coupon', { code, total: totals.base });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setCoupon({ code, discount: d.discount });
        showToast(`كوبون ${code} اتفعّل — خصم ${d.discount} ج ✓`, 'success');
      } else {
        setCoupon(null);
        showToast(d.message || 'الكود غير صالح', 'error');
      }
    } catch {
      showToast('مفيش اتصال بالسيرفر', 'error');
    } finally {
      setCouponChecking(false);
    }
  };

  const submit = async () => {
    if (submitting) return;
    if (!form.packageCode)  { showToast('اختار الباقة الأول', 'error'); return; }
    if (!form.name.trim())  { showToast('اكتب اسم العميل', 'error'); return; }
    if (!/^01[0125][0-9]{8}$/.test(form.phone.trim())) { showToast('رقم الموبايل غير صحيح', 'error'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/pos.php', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          token: sessionStorage.getItem(TOKEN_KEY) || '',
          name: form.name.trim(), phone: form.phone.trim(),
          email: form.email.trim() || null,
          packageCode: form.packageCode, carType: form.carType,
          branch: form.branch, paymentMethod: form.paymentMethod,
          plateNumber: form.plateNumber.trim() || null,
          notes: form.notes.trim() || null,
          staffId: form.staffId ? Number(form.staffId) : null,
          coupon_code: coupon?.code || '',
          manual_discount: Number(form.manualDiscount || 0),
          manual_discount_type: form.manualDiscountType,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setInvoice(d.booking);
        loadToday();
      } else {
        showToast(d.message || 'فشل إنشاء الفاتورة', 'error');
        if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); setUnlocked(false); }
      }
    } catch {
      showToast('مفيش اتصال بالسيرفر', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForNew = () => {
    setInvoice(null);
    setCoupon(null);
    setForm(f => ({
      ...f,
      packageCode: '', carType: 'sedan',
      name: '', phone: '', plateNumber: '', email: '', notes: '',
      couponCode: '', manualDiscount: '', manualDiscountType: 'fixed',
    }));
  };

  const lockPos = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setUnlocked(false);
    setInvoice(null);
  };

  if (!unlocked) {
    return <TokenGate onUnlocked={(s) => { setStaff(s); setUnlocked(true); }} />;
  }

  const chipStyle = (active, error) => ({
    background: active ? 'var(--yellow-soft)' : 'var(--panel-3)',
    border: `1px solid ${active ? 'var(--yellow-line)' : (error ? 'var(--error)' : 'var(--line-2)')}`,
    color: active ? 'var(--yellow)' : 'var(--muted)',
  });

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--black)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 px-5 py-3.5 flex items-center gap-3"
        style={{ background: 'rgba(2,2,2,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)' }}
      >
        <IconBadge icon={ReceiptText} size="sm" tone="yellow" />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black leading-none" style={{ color: 'var(--white)' }}>DR.Care POS</h1>
          {today && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
              اليوم: {today.count} فاتورة · <span style={{ color: 'var(--yellow)' }}>{today.revenue} ج</span>
            </p>
          )}
        </div>
        <button type="button" onClick={lockPos} aria-label="قفل النظام"
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--muted)' }}>
          <LogOut size={15} />
        </button>
      </header>

      {invoice ? (
        <div className="flex-1 overflow-y-auto scroll-hide">
          <InvoiceView booking={invoice} onNew={resetForNew} />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto scroll-hide">
            <div className="p-5 flex flex-col gap-5 pb-3">

              {/* Cashier */}
              {staff.length > 0 && (
                <div className="rounded-2xl p-4" style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)' }}>
                  <p className="text-xs font-black mb-2.5" style={{ color: 'var(--white)' }}>الكاشير</p>
                  <div className="flex gap-2 overflow-x-auto scroll-hide">
                    <button type="button" onClick={() => setForm(f => ({ ...f, staffId: '' }))}
                      className="flex-shrink-0 text-xs font-bold px-3.5 py-2 rounded-full active:scale-95 transition-transform"
                      style={chipStyle(!form.staffId)}>بدون</button>
                    {staff.map(s => (
                      <button key={s.id} type="button" onClick={() => setForm(f => ({ ...f, staffId: String(s.id) }))}
                        className="flex-shrink-0 text-xs font-bold px-3.5 py-2 rounded-full active:scale-95 transition-transform"
                        style={chipStyle(String(s.id) === form.staffId)}>{s.name}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Packages */}
              <div className="rounded-2xl p-4" style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)' }}>
                <p className="text-xs font-black mb-2.5" style={{ color: 'var(--white)' }}>الباقة</p>
                <div className="grid grid-cols-2 gap-2">
                  {config.packages.map(p => {
                    const v = getPackageVisual(p.code);
                    const VIcon = v?.icon || Car;
                    const active = form.packageCode === p.code;
                    return (
                      <button key={p.code} type="button"
                        onClick={() => setForm(f => ({ ...f, packageCode: p.code }))}
                        className="rounded-xl p-3 text-center active:scale-95 transition-transform flex flex-col items-center gap-1.5"
                        style={chipStyle(active)}>
                        <VIcon size={19} strokeWidth={2.2} style={{ color: active ? 'var(--yellow)' : (v?.color || 'var(--muted)') }} />
                        <span className="text-[11px] font-black leading-tight" style={{ color: active ? 'var(--yellow)' : 'var(--white-2)' }}>{p.name}</span>
                        <span className="text-[11px] font-black" style={{ color: 'var(--yellow)' }}>{p.price > 0 ? `${p.price} ج` : 'حسب الشغل'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Car type */}
              <div className="rounded-2xl p-4" style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)' }}>
                <p className="text-xs font-black mb-2.5" style={{ color: 'var(--white)' }}>نوع العربية</p>
                <div className="grid grid-cols-4 gap-2">
                  {config.carTypes.map(c => {
                    const CIcon = CAR_TYPE_ICON[c.code] || Car;
                    const active = form.carType === c.code;
                    return (
                      <button key={c.code} type="button" onClick={() => setForm(f => ({ ...f, carType: c.code }))}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-bold active:scale-95 transition-transform"
                        style={chipStyle(active)}>
                        <CIcon size={17} strokeWidth={2.2} />
                        {c.name}
                        <span style={{ color: active ? 'var(--yellow)' : 'var(--muted-2)' }}>{c.extra > 0 ? `+${c.extra}` : '—'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer info */}
              <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)' }}>
                <p className="text-xs font-black" style={{ color: 'var(--white)' }}>بيانات العميل</p>
                <Input type="text" placeholder="اسم العميل" value={form.name} onChange={set('name')} icon={User} />
                <Input type="tel" dir="ltr" inputMode="numeric" placeholder="01XXXXXXXXX" value={form.phone} onChange={set('phone')} icon={PhoneIcon} />
                <Input type="text" placeholder="رقم اللوحة (اختياري)" value={form.plateNumber} onChange={set('plateNumber')} icon={Hash} />
                <Input type="email" dir="ltr" placeholder="البريد (اختياري)" value={form.email} onChange={set('email')} icon={Mail} />
              </div>

              {/* Payment */}
              <div className="rounded-2xl p-4" style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)' }}>
                <p className="text-xs font-black mb-2.5" style={{ color: 'var(--white)' }}>طريقة الدفع</p>
                <div className="flex gap-2">
                  {config.paymentMethods.map(m => {
                    const PIcon = PAYMENT_ICON[m] || Wallet;
                    const active = form.paymentMethod === m;
                    return (
                      <button key={m} type="button" onClick={() => setForm(f => ({ ...f, paymentMethod: m }))}
                        className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                        style={chipStyle(active)}>
                        <PIcon size={17} strokeWidth={2.2} />
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Discounts */}
              <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)' }}>
                <p className="text-xs font-black" style={{ color: 'var(--white)' }}>الخصومات</p>
                <div className="flex gap-2">
                  <Input type="text" dir="ltr" placeholder="SUMMER25" value={form.couponCode}
                    onChange={e => { set('couponCode')(e); if (coupon) setCoupon(null); }}
                    icon={Ticket} className="flex-1" />
                  <Button variant="secondary" size="md" className="flex-shrink-0" disabled={couponChecking || !form.couponCode.trim()} onClick={checkCoupon}>
                    {couponChecking ? '...' : coupon ? '✓' : 'تحقق'}
                  </Button>
                </div>
                {coupon && (
                  <p className="text-xs font-bold" style={{ color: 'var(--success)' }}>
                    كوبون {coupon.code} — خصم {coupon.discount} ج
                  </p>
                )}
                <div className="flex gap-2">
                  <Input type="number" dir="ltr" inputMode="numeric" placeholder="خصم يدوي" value={form.manualDiscount} onChange={set('manualDiscount')} icon={BadgeDollarSign} className="flex-1" />
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, manualDiscountType: f.manualDiscountType === 'fixed' ? 'percent' : 'fixed' }))}
                    className="flex-shrink-0 px-4 rounded-full text-xs font-black active:scale-95 transition-transform inline-flex items-center gap-1"
                    style={chipStyle(true)}>
                    {form.manualDiscountType === 'fixed' ? 'ج' : <Percent size={13} />}
                  </button>
                </div>
              </div>

              {/* Notes */}
              <textarea
                rows={2}
                placeholder="ملاحظات (اختياري)..."
                value={form.notes}
                onChange={set('notes')}
                className="textarea-premium rounded-2xl px-4 py-3 text-sm resize-none w-full"
              />
            </div>
          </div>

          {/* Sticky total + submit */}
          <div className="px-5 pt-3 flex items-center gap-3"
            style={{
              background: 'rgba(2,2,2,0.95)', backdropFilter: 'blur(16px)',
              borderTop: '1px solid var(--line)',
              paddingBottom: 'calc(0.9rem + env(safe-area-inset-bottom, 0px))',
            }}>
            <div className="flex-shrink-0">
              <p className="text-[10px] font-bold" style={{ color: 'var(--muted)' }}>الإجمالي</p>
              <p className="text-lg font-black leading-none mt-0.5" style={{ color: 'var(--yellow)' }}>
                {pkg ? (pkg.price > 0 ? `${totals.total} ج` : 'حسب الشغل') : '—'}
              </p>
              {totals.discount > 0 && (
                <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--success)' }}>خصم {totals.discount} ج</p>
              )}
            </div>
            <Button variant="primary" size="lg" className="flex-1" disabled={submitting} onClick={submit}>
              {submitting
                ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> جاري الإنشاء...</span>
                : <span className="inline-flex items-center gap-2"><ReceiptText size={17} /> إنشاء الفاتورة <ChevronRight size={15} /></span>}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
