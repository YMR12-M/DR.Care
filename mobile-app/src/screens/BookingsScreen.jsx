import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, CheckCircle2, XCircle, Loader2, Car } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { secureFetch } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconBadge from '../components/ui/IconBadge';

const STATUS_MAP = {
  new:        { label: 'في الانتظار',   bg: 'rgba(255,210,31,0.12)', color: '#ffd21f', Icon: Clock },
  confirmed:  { label: 'مؤكد',          bg: 'rgba(91,164,245,0.12)', color: '#5ba4f5', Icon: CheckCircle2 },
  in_service: { label: 'جاري التنفيذ', bg: 'rgba(170,59,255,0.12)', color: '#aa3bff', Icon: Loader2 },
  completed:  { label: 'مكتمل',         bg: 'rgba(111,207,71,0.12)', color: '#6fcf47', Icon: CheckCircle2 },
  cancelled:  { label: 'ملغي',          bg: 'rgba(240,83,62,0.12)',  color: '#f0533e', Icon: XCircle },
};

function BookingCard({ booking, index }) {
  const s = STATUS_MAP[booking.status] || { label: booking.status, bg: 'var(--faint)', color: 'var(--muted)', Icon: Clock };
  const date = booking.appointment
    ? new Date(booking.appointment).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : new Date(booking.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });

  return (
    <Card className={`p-5 fade-in fade-in-${Math.min(index + 1, 7)}`}>
      <div className="flex items-start gap-3 mb-3">
        <IconBadge icon={Car} size="sm" tone="panel" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: 'var(--white)' }}>
            {booking.package_name || booking.servicePackage}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {booking.car_type_name}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: s.bg, color: s.color }}>
          <s.Icon size={11} className={booking.status === 'in_service' ? 'animate-spin' : ''} />
          {s.label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted-2)' }}>
        <span className="flex items-center gap-1">
          <Clock size={13} />
          {date}
        </span>
        {booking.total_price && (
          <span className="font-bold" style={{ color: 'var(--yellow)' }}>{booking.total_price} جنيه</span>
        )}
      </div>
    </Card>
  );
}

function Skeleton() {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--panel-2)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--line-2)' }}>
      <div className="flex justify-between mb-3">
        <div>
          <div className="h-4 rounded w-32 mb-1.5 skeleton" />
          <div className="h-3 rounded w-20 skeleton" />
        </div>
        <div className="h-6 rounded-full w-20 skeleton" />
      </div>
      <div className="h-3 rounded w-40 skeleton" />
    </div>
  );
}

export default function BookingsScreen() {
  const navigate           = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user)       { setLoading(false); return; }
    secureFetch('../api/customer-bookings.php')
      .then(r => r.json())
      .then(d => setBookings(d.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (!authLoading && !user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--black)' }}>
        <IconBadge icon={ClipboardList} size="lg" tone="yellow" className="mb-4" />
        <h2 className="text-lg font-black mb-2" style={{ color: 'var(--white)' }}>حجوزاتك هنا</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>سجل دخولك عشان تشوف حجوزاتك</p>
        <Button variant="primary" size="lg" onClick={() => navigate('/login')} style={{ padding: '0.75rem 2rem' }}>
          تسجيل الدخول
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content" style={{ background: 'var(--black)' }}>
      <header
        className="sticky top-0 z-40 px-5 py-4"
        style={{ background: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)' }}
      >
        <h1 className="text-lg font-black" style={{ color: 'var(--white)' }}>حجوزاتي</h1>
        {!loading && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{bookings.length} حجز</p>
        )}
      </header>

      <div className="p-5 flex flex-col gap-4">
        {loading ? (
          [1,2,3].map(i => <Skeleton key={i}/>)
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <IconBadge icon={Car} size="lg" tone="panel" className="mb-4" />
            <p className="text-base font-black mb-1" style={{ color: 'var(--white)' }}>مفيش حجوزات لحد دلوقتي</p>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>ابدأ حجزك الأول الآن</p>
            <Button variant="primary" size="lg" onClick={() => navigate('/book')} style={{ padding: '0.75rem 2rem' }}>
              احجز دلوقتي
            </Button>
          </div>
        ) : (
          bookings.map((b, i) => <BookingCard key={b.id || i} booking={b} index={i} />)
        )}
      </div>
    </div>
  );
}
