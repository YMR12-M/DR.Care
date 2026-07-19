import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QrCode, CheckCircle2, ClipboardList, Home, LogIn, Link2, XCircle, Loader2, Car } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';
import Button from '../components/ui/Button';
import IconBadge from '../components/ui/IconBadge';

const STATUS_LABELS = {
  new: 'في الانتظار', confirmed: 'مؤكد', in_service: 'جاري التنفيذ',
  completed: 'مكتمل', cancelled: 'ملغي',
};

export default function ClaimBookingScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [state, setState]       = useState({ loading: true, error: null, data: null });
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed]   = useState(false);

  useEffect(() => {
    if (!token || token.length !== 32) {
      setState({ loading: false, error: 'رمز غير صالح — امسح الـ QR من الفاتورة تاني', data: null });
      return;
    }
    fetch(`/api/claim-booking.php?token=${encodeURIComponent(token)}`, { credentials: 'same-origin' })
      .then(r => r.json())
      .then(d => {
        if (d.ok) setState({ loading: false, error: null, data: d });
        else setState({ loading: false, error: d.message || 'الرمز غير صالح', data: null });
      })
      .catch(() => setState({ loading: false, error: 'مفيش اتصال بالإنترنت — حاول تاني', data: null }));
  }, [token, user]);

  const claim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res  = await api.post('claim-booking.php', { token });
      const d    = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setClaimed(true);
        showToast(d.message || 'تم ربط الحجز بحسابك ✓', 'success');
      } else {
        showToast(d.message || 'حصل خطأ — حاول تاني', 'error');
      }
    } catch {
      showToast('مفيش اتصال بالإنترنت', 'error');
    } finally {
      setClaiming(false);
    }
  };

  /* ── Loading ── */
  if (state.loading || authLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8" style={{ background: 'var(--black)' }}>
        <Loader2 size={30} className="animate-spin" style={{ color: 'var(--yellow)' }} />
      </div>
    );
  }

  /* ── Invalid token ── */
  if (state.error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--black)' }}>
        <IconBadge icon={XCircle} size="lg" tone="panel" className="mb-4" />
        <h1 className="text-lg font-black mb-2" style={{ color: 'var(--white)' }}>الرمز مش شغال</h1>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--muted)' }}>{state.error}</p>
        <Button variant="secondary" size="lg" onClick={() => navigate('/')} className="w-full">
          <span className="inline-flex items-center gap-2"><Home size={17}/> الرئيسية</span>
        </Button>
      </div>
    );
  }

  const { booking, already_claimed, claimed_by_me } = state.data;
  const done = claimed || claimed_by_me;

  return (
    <div className="relative h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--black)' }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: 'var(--yellow)' }}/>

      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 relative fade-in"
        style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', boxShadow: 'var(--shadow-yellow-glow)' }}>
        {done
          ? <CheckCircle2 size={38} style={{ color: 'var(--yellow)' }} strokeWidth={2} />
          : <QrCode size={38} style={{ color: 'var(--yellow)' }} strokeWidth={2} />}
      </div>

      <h1 className="text-xl font-black mb-2 relative fade-in fade-in-1" style={{ color: 'var(--white)' }}>
        {done ? 'الحجز مربوط بحسابك ✓' : 'متابعة حجزك'}
      </h1>
      <p className="text-sm mb-6 leading-relaxed relative fade-in fade-in-2" style={{ color: 'var(--muted)' }}>
        {done
          ? 'تقدر تتابع حالة الحجز من قسم حجوزاتي'
          : already_claimed
            ? 'الحجز ده مربوط بحساب آخر'
            : user
              ? 'اربط الحجز ده بحسابك عشان تتابعه أونلاين'
              : 'سجّل دخولك بنفس رقم الموبايل عشان تربط الحجز بحسابك'}
      </p>

      {/* Booking summary */}
      <div className="rounded-2xl p-5 w-full mb-6 text-right relative fade-in fade-in-3"
        style={{ background: 'var(--panel-2)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--line-2)' }}>
        <div className="flex items-start gap-3">
          <IconBadge icon={Car} size="sm" tone="panel" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black" style={{ color: 'var(--white)' }}>{booking.package_name}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {[booking.car_type_name, booking.branch].filter(Boolean).join(' · ')}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-2)' }}>
              الحالة: {STATUS_LABELS[booking.status] || booking.status} · موبايل الحجز: <span dir="ltr">{booking.masked_phone}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {done ? (
        <Button variant="primary" size="lg" onClick={() => navigate('/bookings')} className="w-full mb-3 relative fade-in fade-in-4">
          <span className="inline-flex items-center gap-2"><ClipboardList size={17}/> حجوزاتي</span>
        </Button>
      ) : already_claimed ? null : user ? (
        <Button variant="primary" size="lg" onClick={claim} disabled={claiming} className="w-full mb-3 relative fade-in fade-in-4">
          <span className="inline-flex items-center gap-2">
            {claiming ? <Loader2 size={17} className="animate-spin"/> : <Link2 size={17}/>}
            {claiming ? 'جاري الربط...' : 'اربط الحجز بحسابي'}
          </span>
        </Button>
      ) : (
        <Button variant="primary" size="lg" onClick={() => navigate('/login')} className="w-full mb-3 relative fade-in fade-in-4">
          <span className="inline-flex items-center gap-2"><LogIn size={17}/> تسجيل الدخول</span>
        </Button>
      )}

      <Button variant="secondary" size="lg" onClick={() => navigate('/')} className="w-full relative fade-in fade-in-5">
        <span className="inline-flex items-center gap-2"><Home size={17}/> الرئيسية</span>
      </Button>
    </div>
  );
}
