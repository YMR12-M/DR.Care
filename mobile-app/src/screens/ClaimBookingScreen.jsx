import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Home, LogIn, Link2, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';
import Button from '../components/ui/Button';
import NeonEmblem from '../components/brand/NeonEmblem';
import Ticket, { TicketField } from '../components/brand/Ticket';
import { Mixed } from '../lib/bidi';

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
        showToast(d.message || 'تم ربط الحجز بحسابك', 'success');
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
        <NeonEmblem size={70} animate />
      </div>
    );
  }

  /* ── Invalid token ── */
  if (state.error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--black)' }}>
        <NeonEmblem size={100} className="mb-5" style={{ opacity: 0.5 }} />
        <h1 className="font-display text-[2rem] leading-none mb-3">الرمز مش شغال</h1>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--muted)' }}>{state.error}</p>
        <Button variant="secondary" size="lg" onClick={() => navigate('/')} className="w-full">
          <Home size={19} /> الرئيسية
        </Button>
      </div>
    );
  }

  const { booking, already_claimed, claimed_by_me } = state.data;
  const done = claimed || claimed_by_me;

  return (
    <div className="h-full overflow-y-auto scroll-hide flex flex-col items-center px-5 pt-10 pb-10 text-center" style={{ background: 'var(--black)' }}>
      <NeonEmblem size={86} animate />

      <h1 className="font-display text-[2.2rem] leading-none mt-5 mb-2.5 fade-in fade-in-1">
        {done ? 'الحجز مربوط بحسابك' : 'متابعة حجزك'}
      </h1>
      <p className="text-sm mb-6 leading-relaxed max-w-[19rem] fade-in fade-in-2" style={{ color: 'var(--muted)' }}>
        {done
          ? 'تقدر تتابع حالة الحجز من قسم حجوزاتي'
          : already_claimed
            ? 'الحجز ده مربوط بحساب آخر'
            : user
              ? 'اربط الحجز ده بحسابك عشان تتابعه أونلاين'
              : 'سجّل دخولك بنفس رقم الموبايل عشان تربط الحجز بحسابك'}
      </p>

      <Ticket className="w-full text-right mb-7 fade-in fade-in-3" seed={booking.id || booking.package_name}
        stub={<div className="flex items-center justify-between gap-3"><span className="ticket__k">موبايل الحجز</span><span className="font-display text-[1.3rem] leading-none num" dir="ltr">{booking.masked_phone}</span></div>}>
        <p className="ticket__k" style={{ letterSpacing: '0.12em' }}>DR.CARE · تذكرة غسيل</p>
        <div className="ticket__grid grid grid-cols-2 gap-x-4 gap-y-3 mt-3">
          <TicketField label="الغسلة"><Mixed>{booking.package_name}</Mixed></TicketField>
          {booking.car_type_name && <TicketField label="العربية">{booking.car_type_name}</TicketField>}
          {booking.branch && <TicketField label="الفرع">{booking.branch}</TicketField>}
          <TicketField label="الحالة">{STATUS_LABELS[booking.status] || booking.status}</TicketField>
        </div>
      </Ticket>

      {done ? (
        <Button size="lg" onClick={() => navigate('/bookings')} className="w-full mb-3 fade-in fade-in-4"><ClipboardList size={19} /> حجوزاتي</Button>
      ) : already_claimed ? null : user ? (
        <Button size="lg" onClick={claim} disabled={claiming} className="w-full mb-3 fade-in fade-in-4">
          {claiming ? <Loader2 size={19} className="animate-spin" /> : <Link2 size={19} />}
          {claiming ? 'جاري الربط...' : 'اربط الحجز بحسابي'}
        </Button>
      ) : (
        <Button size="lg" onClick={() => navigate('/login')} className="w-full mb-3 fade-in fade-in-4"><LogIn size={19} /> تسجيل الدخول</Button>
      )}

      <Button variant="secondary" size="lg" onClick={() => navigate('/')} className="w-full fade-in fade-in-5"><Home size={19} /> الرئيسية</Button>
    </div>
  );
}
