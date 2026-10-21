import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ChevronDown, RefreshCw, CalendarClock, Ban } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { secureFetch, api } from '../lib/api';
import Button from '../components/ui/Button';
import EmptyState from '../components/brand/EmptyState';
import WashLine from '../components/brand/WashLine';
import Plate from '../components/brand/Plate';
import Ticket, { TicketField } from '../components/brand/Ticket';
import { Mixed } from '../lib/bidi';

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
const ACTIVE_STATUSES = ['new', 'confirmed', 'in_service'];

/* Flat status chips: colour + label. Ink text on every fill so contrast never depends on hue. */
const STATUS_MAP = {
  new:        { label: 'في الانتظار',    color: 'var(--white-2)' },
  confirmed:  { label: 'مؤكد',           color: 'var(--yellow)' },
  in_service: { label: 'بنغسلها دلوقتي', color: 'var(--water)' },
  completed:  { label: 'اكتملت',         color: 'var(--success)' },
  cancelled:  { label: 'ملغي',           color: 'var(--error)' },
};

const STAGE = { new: 0, confirmed: 1, in_service: 2, completed: 3 };
const STAGE_NOTE = {
  new:        'الحجز وصلنا وهنراجعه',
  confirmed:  'الميعاد اتأكد — مستنيينك',
  in_service: 'فريقنا شغال على عربيتك دلوقتي',
  completed:  'عربيتك جاهزة — بالهنا!',
};
const CAR_BY_NAME = { 'سيدان': 'sedan', 'SUV': 'suv', 'فان': 'van', 'نقل خفيف': 'pickup' };

const fmtShort = b => new Date(b.appointment || b.created_at).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' });
const fmtFull = b => b.appointment
  ? new Date(b.appointment).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  : new Date(b.created_at).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });

function StatusChip({ status }) {
  const s = STATUS_MAP[status] || { label: status, color: 'var(--muted)' };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-[3px] flex-shrink-0 leading-none" style={{ background: s.color, color: 'var(--on-yellow)', borderRadius: 4 }}>
      {s.label}
    </span>
  );
}

function StarRow({ value, onSelect, size = 24 }) {
  return (
    <div className="flex items-center gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n} type="button" disabled={!onSelect}
          onClick={onSelect ? () => onSelect(n) : undefined}
          aria-label={`${n} من 5`}
          className={onSelect ? 'active:scale-90 transition-transform' : ''}
          style={{ background: 'none', border: 'none', padding: 2, cursor: onSelect ? 'pointer' : 'default' }}
        >
          <Star size={size} fill={n <= value ? 'var(--yellow)' : 'none'} stroke={n <= value ? 'var(--yellow)' : 'var(--steel)'} strokeWidth={2} />
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
      <div className="mt-4 pt-4 flex items-center justify-between gap-3" style={{ borderTop: '2px dashed var(--line-2)' }}>
        <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>تقييمك للخدمة</span>
        <StarRow value={Number(booking.review_rating)} size={18} />
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
        showToast(data.message || 'شكراً على تقييمك!', 'success');
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
    <div className="mt-4 pt-4" style={{ borderTop: '2px dashed var(--line-2)' }}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-lg leading-none" style={{ color: 'var(--white)' }}>قيّم الغسلة</span>
        <StarRow value={rating} onSelect={setRating} />
      </div>
      {rating > 0 && (
        <div className="mt-3 fade-in">
          <textarea
            rows={2} maxLength={500} placeholder="اكتب رأيك (اختياري)..."
            value={comment} onChange={e => setComment(e.target.value)}
            className="textarea-premium px-4 py-3 text-sm resize-none w-full"
          />
          <Button size="md" className="w-full mt-2" disabled={submitting} onClick={submit}>
            {submitting ? 'جاري الإرسال...' : 'ابعت التقييم'}
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
        showToast(d.message || 'اتعدّل الموعد', 'success');
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

  const chip = active => ({
    borderRadius: 6, border: `2px solid ${active ? 'var(--yellow)' : 'var(--line-2)'}`,
    background: active ? 'var(--yellow)' : 'var(--panel-3)', color: active ? 'var(--on-yellow)' : 'var(--white-2)',
  });

  return (
    <div className="mt-3 p-3 fade-in" style={{ background: 'var(--panel-3)', border: '2px solid var(--line-2)', borderRadius: 8 }}>
      {loading ? (
        <div className="flex gap-2">{[1, 2, 3].map(i => <div key={i} className="h-9 w-20 skeleton" style={{ borderRadius: 6 }} />)}</div>
      ) : availDates.length === 0 ? (
        <p className="text-xs font-bold text-center py-2" style={{ color: 'var(--muted)' }}>مفيش مواعيد متاحة دلوقتي</p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto scroll-hide pb-1">
            {availDates.map(d => (
              <button key={d} type="button" onClick={() => { setDate(d); setTime(''); }}
                className="flex-shrink-0 text-[12px] font-bold px-3 py-2 active:translate-y-0.5 transition-transform" style={chip(date === d)}>
                {fmtSlotDate(d)}
              </button>
            ))}
          </div>
          {date && (
            <div className="flex flex-wrap gap-2 mt-2.5 fade-in">
              {availTimes.map(s => (
                <button key={s.time} type="button" onClick={() => setTime(s.time)}
                  className="text-[12px] font-bold px-3 py-2 active:translate-y-0.5 transition-transform num" style={chip(time === s.time)}>
                  {fmtSlotTime(s.time)}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>إلغاء</Button>
            <Button size="md" className="flex-[2]" disabled={!date || !time || submitting} onClick={confirm}>
              {submitting ? '...' : 'أكّد الميعاد الجديد'}
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
    <div className="mt-4 pt-4" style={{ borderTop: '2px dashed var(--line-2)' }}>
      {mode === 'confirm-cancel' ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold" style={{ color: 'var(--error)' }}>متأكد إنك عايز تلغي؟</span>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="secondary" size="md" onClick={() => setMode(null)} style={{ padding: '0.55rem 0.9rem', fontSize: '1rem' }}>رجوع</Button>
            <Button variant="danger" size="md" onClick={cancel} disabled={cancelling} style={{ padding: '0.55rem 0.9rem', fontSize: '1rem' }}>{cancelling ? '...' : 'ألغي'}</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="md" onClick={() => setMode('reschedule')}><CalendarClock size={16} strokeWidth={2.4} /> غيّر الميعاد</Button>
          <Button variant="danger" size="md" onClick={() => setMode('confirm-cancel')}><Ban size={16} strokeWidth={2.4} /> إلغاء الحجز</Button>
        </div>
      )}
    </div>
  );
}

/* One booking: a compact dark row that opens into its paper ticket (+ the wash line while it's active) */
function BookingCard({ booking, index, onReviewed, onCancelled, onRescheduled, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const active = ACTIVE_STATUSES.includes(booking.status);
  const s = STATUS_MAP[booking.status] || { color: 'var(--muted)' };
  const car = CAR_BY_NAME[booking.car_type_name] || 'sedan';
  const price = Number(booking.total_price) || 0;

  return (
    <article
      className={`overflow-hidden fade-in fade-in-${Math.min(index + 1, 7)}`}
      style={{ background: 'var(--panel-2)', border: `2px solid ${active ? 'var(--yellow)' : 'var(--line-2)'}`, borderRadius: 10, boxShadow: active ? '0 4px 0 rgba(0,0,0,0.45)' : 'none', opacity: booking.status === 'cancelled' ? 0.78 : 1 }}
    >
      <button
        type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-stretch text-right active:opacity-80"
      >
        <span className="flex-shrink-0" style={{ width: 7, background: s.color }} aria-hidden="true" />
        <span className="flex-1 min-w-0 flex items-center gap-3 p-3.5">
          <span className="flex-1 min-w-0">
            <span className="block font-display text-[1.2rem] leading-tight truncate"><Mixed>{booking.package_name || booking.servicePackage}</Mixed></span>
            <span className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusChip status={booking.status} />
              <span className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>{fmtShort(booking)}</span>
              {booking.review_rating && (
                <span className="inline-flex items-center gap-0.5 text-[12px] font-bold num" style={{ color: 'var(--yellow)' }}>
                  <Star size={11} fill="var(--yellow)" stroke="var(--yellow)" /> {booking.review_rating}
                </span>
              )}
            </span>
          </span>
          {price > 0 && <span className="font-display text-[1.45rem] leading-none flex-shrink-0 num" style={{ color: 'var(--yellow)' }}>{price}<small className="text-xs mr-0.5" style={{ color: 'var(--muted)', fontFamily: 'var(--font-ui)', fontWeight: 700 }}>ج</small></span>}
          <ChevronDown size={18} className="flex-shrink-0" style={{ color: 'var(--muted-2)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </span>
      </button>

      {open && (
        <div className="px-3.5 pb-4 fade-in">
          {booking.status !== 'cancelled' && (
            <div className="mb-3 px-1">
              <WashLine stage={STAGE[booking.status] ?? 0} washing={booking.status === 'in_service'} car={car} />
              <p className="text-center text-[12.5px] font-semibold -mt-1" style={{ color: 'var(--white-2)' }}>{STAGE_NOTE[booking.status]}</p>
            </div>
          )}

          <Ticket
            seed={booking.id}
            stub={
              <div className="flex items-center justify-between gap-3">
                {booking.plate_number ? <Plate value={booking.plate_number} size="sm" /> : <span className="ticket__k">من غير لوحة</span>}
                <span className="font-display text-[1.35rem] leading-none" dir="ltr">#{booking.id}</span>
              </div>
            }
          >
            <p className="ticket__k" style={{ letterSpacing: '0.12em' }}>DR.CARE · تذكرة غسيل</p>
            <div className="ticket__grid grid grid-cols-2 gap-x-4 gap-y-3 mt-3">
              <TicketField label="الموعد">{fmtFull(booking)}</TicketField>
              <TicketField label="العربية">{booking.car_type_name || '—'}</TicketField>
              {booking.branch && <TicketField label="الفرع">{booking.branch}</TicketField>}
              {price > 0 && <TicketField label="الإجمالي">{price} ج</TicketField>}
            </div>
          </Ticket>

          {booking.status === 'completed' && <ReviewBlock booking={booking} onReviewed={onReviewed} />}
          <ManageBookingActions booking={booking} onCancelled={onCancelled} onRescheduled={onRescheduled} />
        </div>
      )}
    </article>
  );
}

function Skeleton() {
  return <div className="h-[84px] skeleton" style={{ borderRadius: 10 }} />;
}

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
  const markCancelled = (bookingId) => setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, status: 'cancelled' } : b)));
  const markRescheduled = (bookingId, appointment) => setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, appointment } : b)));

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
      <div className="h-full flex flex-col items-center justify-center px-8 text-center main-content" style={{ background: 'var(--black)' }}>
        <EmptyState title="حجوزاتك هنا" text="سجّل دخولك عشان تشوف تذاكرك وتتابع عربيتك" action="تسجيل الدخول" onAction={() => navigate('/login')} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content" style={{ background: 'var(--black)' }}>
      <header className="sticky top-0 z-40" style={{ background: 'var(--black)', borderBottom: '2px solid var(--line-2)', paddingTop: 'var(--safe-top)' }}>
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <h1 className="font-display text-[2rem] leading-none">حجوزاتي</h1>
          <div className="flex items-center gap-3">
            {!loading && <span className="text-xs font-semibold num" style={{ color: 'var(--muted)' }}>{visible.length} من {bookings.length}</span>}
            <button type="button" onClick={load} aria-label="تحديث"
              className="w-9 h-9 flex items-center justify-center active:translate-y-0.5 transition-transform flex-shrink-0"
              style={{ background: 'var(--panel-3)', borderRadius: 7, color: 'var(--white-2)' }}>
              <RefreshCw size={16} strokeWidth={2.4} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        {!loading && bookings.length > 0 && (
          <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scroll-hide" role="tablist">
            {FILTERS.map(f => {
              const count  = bookings.filter(f.test).length;
              const on = filter === f.key;
              if (f.key !== 'all' && count === 0) return null;
              return (
                <button
                  key={f.key} type="button" role="tab" aria-selected={on} onClick={() => setFilter(f.key)}
                  className="flex-shrink-0 text-[13px] font-bold px-3.5 py-1.5 active:translate-y-0.5 transition-transform"
                  style={{ borderRadius: 6, background: on ? 'var(--yellow)' : 'var(--panel-2)', color: on ? 'var(--on-yellow)' : 'var(--muted)', border: `2px solid ${on ? 'var(--yellow)' : 'var(--line-2)'}` }}
                >
                  {f.label} <span className="num" style={{ opacity: 0.7 }}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          [1, 2, 3].map(i => <Skeleton key={i} />)
        ) : bookings.length === 0 ? (
          <EmptyState title="مفيش حجوزات لسه" text="أول غسلة بتبدأ بضغطة" action="احجز دلوقتي" onAction={() => navigate('/book')} />
        ) : visible.length === 0 ? (
          <p className="text-center text-sm py-12" style={{ color: 'var(--muted)' }}>مفيش حجوزات في التصنيف ده</p>
        ) : (
          visible.map((b, i) => (
            <BookingCard
              key={b.id || i} booking={b} index={i}
              onReviewed={markReviewed} onCancelled={markCancelled} onRescheduled={markRescheduled}
              defaultOpen={b.status === 'in_service'}
            />
          ))
        )}
      </div>
    </div>
  );
}
