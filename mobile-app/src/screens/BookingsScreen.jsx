import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, CheckCircle2, XCircle, Loader2, Car, Star, MapPin, ChevronDown, RefreshCw, CalendarClock, Ban } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { secureFetch, api } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconBadge from '../components/ui/IconBadge';

const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const AR_DAYS   = ['أحد','اتنين','تلات','أربع','خميس','جمعة','سبت'];

function fmtSlotDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${AR_DAYS[d.getDay()]} ${d.getDate()} ${AR_MONTHS[d.getMonth()]}`;
}

function fmtSlotTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h < 12 ? 'ص' : 'م';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const CANCELLABLE_STATUSES = ['new', 'confirmed'];

const STATUS_MAP = {
  new:        { label: 'في الانتظار',   bg: 'rgba(255,210,31,0.12)', color: '#ffd21f', Icon: Clock },
  confirmed:  { label: 'مؤكد',          bg: 'rgba(91,164,245,0.12)', color: '#5ba4f5', Icon: CheckCircle2 },
  in_service: { label: 'جاري التنفيذ', bg: 'rgba(170,59,255,0.12)', color: '#aa3bff', Icon: Loader2 },
  completed:  { label: 'مكتمل',         bg: 'rgba(111,207,71,0.12)', color: '#6fcf47', Icon: CheckCircle2 },
  cancelled:  { label: 'ملغي',          bg: 'rgba(240,83,62,0.12)',  color: '#f0533e', Icon: XCircle },
};

const TRACK_STAGES = [
  { key: 'new',        label: 'استلمنا الحجز',    desc: 'الحجز وصلنا وهنراجعه' },
  { key: 'confirmed',  label: 'تم تأكيد الموعد',  desc: 'الموعد اتأكد — مستنيينك' },
  { key: 'in_service', label: 'العربية في الخدمة', desc: 'فريقنا شغال على عربيتك دلوقتي' },
  { key: 'completed',  label: 'اكتملت الخدمة',    desc: 'عربيتك جاهزة — بالهنا!' },
];

function TrackTimeline({ status }) {
  const currentIdx = TRACK_STAGES.findIndex(s => s.key === status);
  return (
    <div className="mt-3 flex flex-col">
      {TRACK_STAGES.map((stage, i) => {
        const done    = i < currentIdx;
        const current = i === currentIdx;
        const color   = done || current ? 'var(--yellow)' : 'var(--muted-2)';
        return (
          <div key={stage.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: done || current ? 'var(--yellow-soft)' : 'var(--panel-3)',
                  border: `1.5px solid ${done || current ? 'var(--yellow)' : 'var(--line-2)'}`,
                  boxShadow: current ? '0 0 10px rgba(255,210,31,0.35)' : 'none',
                }}
              >
                {done
                  ? <CheckCircle2 size={12} strokeWidth={2.6} style={{ color }} />
                  : current
                    ? <Loader2 size={11} strokeWidth={2.6} className={status !== 'completed' ? 'animate-spin' : ''} style={{ color }} />
                    : <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--muted-2)' }} />}
              </span>
              {i < TRACK_STAGES.length - 1 && (
                <span className="w-px flex-1 my-0.5" style={{ background: done ? 'var(--yellow)' : 'var(--line-2)', minHeight: 18 }} />
              )}
            </div>
            <div className="pb-3">
              <p className="text-xs font-black" style={{ color: done || current ? 'var(--white)' : 'var(--muted-2)' }}>{stage.label}</p>
              {current && <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{stage.desc}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StarRow({ value, onSelect, size = 22 }) {
  return (
    <div className="flex items-center gap-1.5" dir="ltr">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={!onSelect}
          onClick={onSelect ? () => onSelect(n) : undefined}
          aria-label={`${n} من 5`}
          className={onSelect ? 'active:scale-90 transition-transform' : ''}
          style={{ background: 'none', border: 'none', padding: 2, cursor: onSelect ? 'pointer' : 'default' }}
        >
          <Star
            size={size}
            fill={n <= value ? 'var(--yellow)' : 'none'}
            stroke={n <= value ? 'var(--yellow)' : 'var(--muted-2)'}
            strokeWidth={1.8}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewBlock({ booking, onReviewed }) {
  const { showToast } = useToast();
  const [rating, setRating]       = useState(0);
  const [comment, setComment]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* Already rated — show the stars they gave */
  if (booking.review_rating) {
    return (
      <div className="mt-4 pt-4 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--line-2)' }}>
        <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>تقييمك للخدمة</span>
        <StarRow value={Number(booking.review_rating)} size={17} />
      </div>
    );
  }

  const submit = async () => {
    if (!rating || submitting) return;
    setSubmitting(true);
    try {
      const res  = await api.post('reviews.php', { booking_id: Number(booking.id), rating, comment: comment.trim() });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        showToast(data.message || 'شكراً على تقييمك! ⭐', 'success');
        onReviewed(booking.id, rating, comment.trim());
      } else {
        showToast(data.message || 'حصل خطأ — حاول تاني', 'error');
      }
    } catch {
      showToast('مفيش اتصال بالإنترنت', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--line-2)' }}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold" style={{ color: 'var(--white-2)' }}>قيّم الخدمة</span>
        <StarRow value={rating} onSelect={setRating} />
      </div>
      {rating > 0 && (
        <div className="mt-3 fade-in">
          <textarea
            rows={2}
            maxLength={500}
            placeholder="اكتب رأيك (اختياري)..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="textarea-premium rounded-2xl px-4 py-3 text-sm resize-none w-full"
          />
          <Button
            variant="primary"
            size="md"
            className="w-full mt-2"
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
          </Button>
        </div>
      )}
    </div>
  );
}

function ReschedulePicker({ booking, onDone, onClose }) {
  const { showToast } = useToast();
  const [allSlots, setAllSlots] = useState({});
  const [loading, setLoading]   = useState(true);
  const [date, setDate]         = useState('');
  const [time, setTime]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/slots.php', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(d => setAllSlots(d.slots || {}))
      .catch(() => setAllSlots({}))
      .finally(() => setLoading(false));
  }, []);

  const availDates = Object.keys(allSlots).sort().filter(d => (allSlots[d] || []).some(s => s.available > 0));
  const availTimes = (allSlots[date] || []).filter(s => s.available > 0);

  const confirm = async () => {
    if (!date || !time || submitting) return;
    setSubmitting(true);
    try {
      const res = await secureFetch('/api/customer-bookings.php', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id, action: 'reschedule', appointment: `${date}T${time}` }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        showToast(d.message || 'اتعدّل الموعد ✓', 'success');
        onDone(booking.id, `${date} ${time}:00`);
      } else {
        showToast(d.message || 'فشل تعديل الموعد', 'error');
      }
    } catch {
      showToast('مفيش اتصال بالإنترنت', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl p-3 fade-in" style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)' }}>
      {loading ? (
        <div className="flex gap-2">{[1, 2, 3].map(i => <div key={i} className="h-9 w-20 rounded-lg skeleton" />)}</div>
      ) : availDates.length === 0 ? (
        <p className="text-xs font-bold text-center py-2" style={{ color: 'var(--muted)' }}>مفيش مواعيد متاحة دلوقتي</p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto scroll-hide pb-1">
            {availDates.map(d => {
              const active = date === d;
              return (
                <button key={d} type="button" onClick={() => { setDate(d); setTime(''); }}
                  className="flex-shrink-0 text-[11px] font-bold px-3 py-2 rounded-lg active:scale-95 transition-transform"
                  style={{ background: active ? 'var(--yellow-soft)' : 'var(--panel-4)', border: `1px solid ${active ? 'var(--yellow-line)' : 'var(--line-2)'}`, color: active ? 'var(--yellow)' : 'var(--muted)' }}>
                  {fmtSlotDate(d)}
                </button>
              );
            })}
          </div>
          {date && (
            <div className="flex flex-wrap gap-2 mt-2.5 fade-in">
              {availTimes.map(s => {
                const active = time === s.time;
                return (
                  <button key={s.time} type="button" onClick={() => setTime(s.time)}
                    className="text-[11px] font-bold px-3 py-2 rounded-lg active:scale-95 transition-transform"
                    style={{ background: active ? 'var(--yellow-soft)' : 'var(--panel-4)', border: `1px solid ${active ? 'var(--yellow-line)' : 'var(--line-2)'}`, color: active ? 'var(--yellow)' : 'var(--muted)' }}>
                    {fmtSlotTime(s.time)}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={onClose}
              className="flex-1 text-xs font-bold py-2 rounded-xl active:scale-95 transition-transform"
              style={{ background: 'var(--panel-4)', border: '1px solid var(--line-2)', color: 'var(--muted)' }}>
              إلغاء
            </button>
            <Button variant="primary" size="md" className="flex-1" disabled={!date || !time || submitting} onClick={confirm} style={{ padding: '0.5rem' }}>
              {submitting ? '...' : 'تأكيد الموعد الجديد'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ManageBookingActions({ booking, onCancelled, onRescheduled }) {
  const { showToast } = useToast();
  const [mode, setMode] = useState(null); // null | 'confirm-cancel' | 'reschedule'
  const [cancelling, setCancelling] = useState(false);

  if (!CANCELLABLE_STATUSES.includes(booking.status)) return null;

  const cancel = async () => {
    setCancelling(true);
    try {
      const res = await secureFetch('/api/customer-bookings.php', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id, action: 'cancel' }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        showToast(d.message || 'اتلغى الحجز', 'success');
        onCancelled(booking.id);
      } else {
        showToast(d.message || 'فشل إلغاء الحجز', 'error');
      }
    } catch {
      showToast('مفيش اتصال بالإنترنت', 'error');
    } finally {
      setCancelling(false);
      setMode(null);
    }
  };

  if (mode === 'reschedule') {
    return <ReschedulePicker booking={booking} onDone={onRescheduled} onClose={() => setMode(null)} />;
  }

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--line-2)' }}>
      {mode === 'confirm-cancel' ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold" style={{ color: 'var(--error)' }}>متأكد من إلغاء الحجز؟</span>
          <div className="flex gap-2 flex-shrink-0">
            <button type="button" onClick={() => setMode(null)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
              style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--muted)' }}>
              رجوع
            </button>
            <button type="button" onClick={cancel} disabled={cancelling}
              className="text-xs font-black px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
              style={{ background: 'rgba(240,83,62,0.12)', border: '1px solid var(--error)', color: 'var(--error)' }}>
              {cancelling ? '...' : 'اتأكد وألغي'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('reschedule')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-transform"
            style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--white-2)' }}>
            <CalendarClock size={13} /> تعديل الموعد
          </button>
          <button type="button" onClick={() => setMode('confirm-cancel')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-transform"
            style={{ background: 'rgba(240,83,62,0.08)', border: '1px solid rgba(240,83,62,0.25)', color: 'var(--error)' }}>
            <Ban size={13} /> إلغاء الحجز
          </button>
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking, index, onReviewed, onCancelled, onRescheduled, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const s = STATUS_MAP[booking.status] || { label: booking.status, bg: 'var(--faint)', color: 'var(--muted)', Icon: Clock };
  const shortDate = booking.appointment
    ? new Date(booking.appointment).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
    : new Date(booking.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  const fullDate = booking.appointment
    ? new Date(booking.appointment).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : new Date(booking.created_at).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Card className={`fade-in fade-in-${Math.min(index + 1, 7)}`}>
      {/* Compact row — always visible, tap to expand */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-right active:opacity-80"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <IconBadge icon={Car} size="sm" tone="panel" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate" style={{ color: 'var(--white)' }}>
            {booking.package_name || booking.servicePackage}
          </p>
          <p className="text-[11px] mt-0.5 flex items-center gap-2" style={{ color: 'var(--muted-2)' }}>
            <span className="inline-flex items-center gap-1"><Clock size={11} /> {shortDate}</span>
            {booking.total_price && <span className="font-bold" style={{ color: 'var(--yellow)' }}>{booking.total_price} ج</span>}
            {booking.review_rating && (
              <span className="inline-flex items-center gap-0.5" style={{ color: 'var(--yellow)' }}>
                <Star size={10} fill="var(--yellow)" stroke="var(--yellow)" /> {booking.review_rating}
              </span>
            )}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: s.bg, color: s.color }}>
          <s.Icon size={10} className={booking.status === 'in_service' ? 'animate-spin' : ''} />
          {s.label}
        </span>
        <ChevronDown size={15} className="flex-shrink-0" style={{ color: 'var(--muted-2)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }} />
      </button>

      {/* Expanded details */}
      {open && (
        <div className="px-4 pb-4 fade-in">
          <div className="rounded-xl p-3 text-xs flex flex-col gap-1.5" style={{ background: 'var(--panel-3)', border: '1px solid var(--line)' }}>
            <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>نوع العربية</span><span className="font-bold" style={{ color: 'var(--white-2)' }}>{booking.car_type_name || '—'}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>الموعد</span><span className="font-bold" style={{ color: 'var(--white-2)' }}>{fullDate}</span></div>
            {booking.branch && <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>الفرع</span><span className="font-bold" style={{ color: 'var(--white-2)' }}>{booking.branch}</span></div>}
            {booking.total_price && <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>الإجمالي</span><span className="font-black" style={{ color: 'var(--yellow)' }}>{booking.total_price} جنيه</span></div>}
          </div>

          {booking.status !== 'completed' && booking.status !== 'cancelled' && (
            <>
              <p className="inline-flex items-center gap-2 text-xs font-black mt-4" style={{ color: 'var(--yellow)' }}>
                <MapPin size={14} strokeWidth={2.4} /> تتبع الحجز
              </p>
              <TrackTimeline status={booking.status} />
            </>
          )}
          {booking.status === 'completed' && (
            <ReviewBlock booking={booking} onReviewed={onReviewed} />
          )}
          <ManageBookingActions booking={booking} onCancelled={onCancelled} onRescheduled={onRescheduled} />
        </div>
      )}
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

const ACTIVE_STATUSES = ['new', 'confirmed', 'in_service'];

const FILTERS = [
  { key: 'all',       label: 'الكل',    test: () => true },
  { key: 'active',    label: 'نشطة',    test: b => ACTIVE_STATUSES.includes(b.status) },
  { key: 'completed', label: 'مكتملة',  test: b => b.status === 'completed' },
  { key: 'cancelled', label: 'ملغية',   test: b => b.status === 'cancelled' },
];

export default function BookingsScreen() {
  const navigate           = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');

  const visible = bookings.filter(FILTERS.find(f => f.key === filter).test);

  const markReviewed = (bookingId, rating, comment) => {
    setBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, review_rating: rating, review_comment: comment || null } : b
    ));
  };

  const markCancelled = (bookingId) => {
    setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, status: 'cancelled' } : b)));
  };

  const markRescheduled = (bookingId, appointment) => {
    setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, appointment } : b)));
  };

  const load = () => {
    setLoading(true);
    secureFetch('/api/customer-bookings.php')
      .then(r => r.json())
      .then(d => setBookings(d.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user)       { setLoading(false); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        className="sticky top-0 z-40"
        style={{ background: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-lg font-black" style={{ color: 'var(--white)' }}>حجوزاتي</h1>
          <div className="flex items-center gap-2">
            {!loading && (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{visible.length} من {bookings.length} حجز</p>
            )}
            <button type="button" onClick={load}
              className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
              style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--muted)' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        {/* Filter chips */}
        {!loading && bookings.length > 0 && (
          <div className="flex gap-2 px-5 pb-3 overflow-x-auto scroll-hide">
            {FILTERS.map(f => {
              const count  = bookings.filter(f.test).length;
              const active = filter === f.key;
              if (f.key !== 'all' && count === 0) return null;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className="flex-shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full active:scale-95 transition-transform"
                  style={{
                    background: active ? 'var(--yellow-soft)' : 'var(--panel-3)',
                    border: `1px solid ${active ? 'var(--yellow-line)' : 'var(--line-2)'}`,
                    color: active ? 'var(--yellow)' : 'var(--muted)',
                  }}
                >
                  {f.label} <span style={{ opacity: 0.75 }}>({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="p-5 flex flex-col gap-3">
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
        ) : visible.length === 0 ? (
          <p className="text-center text-sm py-12" style={{ color: 'var(--muted)' }}>مفيش حجوزات في التصنيف ده</p>
        ) : (
          visible.map((b, i) => (
            <BookingCard
              key={b.id || i}
              booking={b}
              index={i}
              onReviewed={markReviewed}
              onCancelled={markCancelled}
              onRescheduled={markRescheduled}
              defaultOpen={b.status === 'in_service'}
            />
          ))
        )}
      </div>
    </div>
  );
}
