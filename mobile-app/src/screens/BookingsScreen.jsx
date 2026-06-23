import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { secureFetch } from '../lib/api';

const STATUS_MAP = {
  pending:    { label: 'في الانتظار', color: 'bg-amber-100 text-amber-700' },
  confirmed:  { label: 'مؤكد', color: 'bg-blue-100 text-blue-700' },
  in_progress:{ label: 'جاري التنفيذ', color: 'bg-purple-100 text-purple-700' },
  completed:  { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
  cancelled:  { label: 'ملغي', color: 'bg-red-100 text-red-600' },
};

function BookingCard({ booking }) {
  const s = STATUS_MAP[booking.status] || { label: booking.status, color: 'bg-slate-100 text-slate-600' };
  const date = booking.appointment
    ? new Date(booking.appointment).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : new Date(booking.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-slate-800">{booking.package_name || booking.servicePackage}</p>
          <p className="text-xs text-slate-500 mt-0.5">{booking.car_type || booking.carType}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          {date}
        </span>
        {booking.total_price && (
          <span className="font-medium text-slate-700">{booking.total_price} جنيه</span>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse">
      <div className="flex justify-between mb-3">
        <div>
          <div className="h-4 bg-slate-200 rounded w-32 mb-1.5"/>
          <div className="h-3 bg-slate-100 rounded w-20"/>
        </div>
        <div className="h-6 bg-slate-100 rounded-full w-20"/>
      </div>
      <div className="h-3 bg-slate-100 rounded w-40"/>
    </div>
  );
}

export default function BookingsScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    secureFetch('../api/bookings.php?action=list')
      .then(r => r.json())
      .then(d => setBookings(d.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (!authLoading && !user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <div className="text-6xl mb-4">📋</div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">حجوزاتك هنا</h2>
        <p className="text-sm text-slate-500 mb-6">سجل دخولك عشان تشوف حجوزاتك القديمة والجديدة</p>
        <button
          onClick={() => navigate('/login')}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
        >
          تسجيل الدخول
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-4">
        <h1 className="text-base font-bold text-slate-800">حجوزاتي</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {!loading && `${bookings.length} حجز`}
        </p>
      </header>

      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          [1,2,3].map(i => <Skeleton key={i}/>)
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🚗</div>
            <p className="text-base font-bold text-slate-700 mb-1">مفيش حجوزات لحد دلوقتي</p>
            <p className="text-sm text-slate-400 mb-6">ابدأ حجزك الأول الآن</p>
            <button
              onClick={() => navigate('/book')}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
            >
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
