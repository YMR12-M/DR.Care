import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { secureFetch } from '../lib/api';

const STATUS_MAP = {
  pending:     { label: 'في الانتظار',   bg: 'rgba(255,210,31,0.12)', color: '#ffd21f' },
  confirmed:   { label: 'مؤكد',          bg: 'rgba(91,164,245,0.12)', color: '#5ba4f5' },
  in_progress: { label: 'جاري التنفيذ', bg: 'rgba(170,59,255,0.12)', color: '#aa3bff' },
  completed:   { label: 'مكتمل',         bg: 'rgba(111,207,71,0.12)', color: '#6fcf47' },
  cancelled:   { label: 'ملغي',          bg: 'rgba(240,83,62,0.12)',  color: '#f0533e' },
};

function BookingCard({ booking }) {
  const s = STATUS_MAP[booking.status] || { label: booking.status, bg: 'var(--faint)', color: 'var(--muted)' };
  const date = booking.appointment
    ? new Date(booking.appointment).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : new Date(booking.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-black" style={{ color: 'var(--white)' }}>
            {booking.package_name || booking.servicePackage}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {booking.car_type || booking.carType}
          </p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>
          {s.label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted-2)' }}>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          {date}
        </span>
        {booking.total_price && (
          <span className="font-bold" style={{ color: 'var(--yellow)' }}>{booking.total_price} جنيه</span>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
      <div className="flex justify-between mb-3">
        <div>
          <div className="h-4 rounded w-32 mb-1.5" style={{ background: 'var(--panel-3)' }}/>
          <div className="h-3 rounded w-20" style={{ background: 'var(--panel-4)' }}/>
        </div>
        <div className="h-6 rounded-full w-20" style={{ background: 'var(--panel-3)' }}/>
      </div>
      <div className="h-3 rounded w-40" style={{ background: 'var(--panel-4)' }}/>
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
    secureFetch('../api/bookings.php?action=list')
      .then(r => r.json())
      .then(d => setBookings(d.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (!authLoading && !user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--black)' }}>
        <div className="text-6xl mb-4">📋</div>
        <h2 className="text-lg font-black mb-2" style={{ color: 'var(--white)' }}>حجوزاتك هنا</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>سجل دخولك عشان تشوف حجوزاتك</p>
        <button onClick={() => navigate('/login')} className="btn-yellow px-8 py-3 rounded-2xl text-sm">
          تسجيل الدخول
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content" style={{ background: 'var(--black)' }}>
      <header
        className="sticky top-0 z-40 px-4 py-4"
        style={{ background: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)' }}
      >
        <h1 className="text-base font-black" style={{ color: 'var(--white)' }}>حجوزاتي</h1>
        {!loading && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{bookings.length} حجز</p>
        )}
      </header>

      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          [1,2,3].map(i => <Skeleton key={i}/>)
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🚗</div>
            <p className="text-base font-black mb-1" style={{ color: 'var(--white)' }}>مفيش حجوزات لحد دلوقتي</p>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>ابدأ حجزك الأول الآن</p>
            <button onClick={() => navigate('/book')} className="btn-yellow px-8 py-3 rounded-2xl text-sm">
              احجز دلوقتي
            </button>
          </div>
        ) : (
          bookings.map((b, i) => <BookingCard key={b.id || i} booking={b}/>)
        )}
      </div>
    </div>
  );
}
