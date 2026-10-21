import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Loader2, LayoutDashboard, LogOut, User, KeyRound,
  Wallet, CalendarDays, RefreshCw, Users,
  Search, X, ChevronDown, Car, Check, Phone, MessageCircle,
  AlertTriangle, TrendingUp, Percent, Award, Building2, CreditCard,
  Trash2, Plus,
} from 'lucide-react';
import { api, secureFetch } from '../lib/api';
import { useToast } from '../hooks/useToast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconBadge from '../components/ui/IconBadge';
import Input from '../components/ui/Input';
import SegmentedControl from '../components/ui/SegmentedControl';

/* يطابق جدول الانتقالات في api/BookingStateMachine.php وadmin.js — حدّث هنا لو الـ backend اتغير */
const STATUS_LABELS = {
  new:        'جديد',
  confirmed:  'مؤكد',
  in_service: 'قيد التنفيذ',
  completed:  'تم التسليم',
  cancelled:  'ملغي',
};
const STATUS_TRANSITIONS = {
  new:        ['confirmed', 'cancelled'],
  confirmed:  ['in_service', 'cancelled'],
  in_service: ['completed', 'cancelled'],
  completed:  [],
  cancelled:  [],
};
const STATUS_COLORS = {
  new: '#ffd21f', confirmed: '#5ba4f5', in_service: '#f5a623', completed: '#6fcf47', cancelled: '#f0533e',
};

const PAYMENT_STATUS_LABELS = { pending: 'قيد الانتظار', paid: 'مدفوع', waived: 'معفى' };
const PAYMENT_STATUS_COLORS = { pending: '#f5a623', paid: '#6fcf47', waived: '#5ba4f5' };
const SOURCE_LABELS = { web: 'الموقع', mobile: 'التطبيق', pos: 'POS' };

function fmtDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

function dayBucketLabel(str) {
  const d = new Date(str);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (day.getTime() === today.getTime()) return 'اليوم';
  if (day.getTime() === yesterday.getTime()) return 'أمس';
  return day.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' });
}

function groupByDay(list) {
  const groups = [];
  const map = new Map();
  for (const b of list) {
    const key = dayBucketLabel(b.created_at);
    if (!map.has(key)) { map.set(key, { label: key, items: [] }); groups.push(map.get(key)); }
    map.get(key).items.push(b);
  }
  return groups;
}

function isOverdue(b) {
  return !!b.appointment && new Date(b.appointment) < new Date() && ['new', 'confirmed'].includes(b.status);
}

function waLink(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  return `https://wa.me/20${digits.replace(/^0/, '')}`;
}

/* يطابق SLOT_TIMES في admin.js — حدّث هنا لو الـ backend اتغير */
const SLOT_TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

function fmtTime12(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function slotDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (day.getTime() === today.getTime()) return 'اليوم';
  if (day.getTime() === tomorrow.getTime()) return 'بكرة';
  return day.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupSlotsByDate(slots) {
  const groups = [];
  const map = new Map();
  for (const s of slots) {
    if (!map.has(s.slot_date)) { map.set(s.slot_date, { date: s.slot_date, items: [] }); groups.push(map.get(s.slot_date)); }
    map.get(s.slot_date).items.push(s);
  }
  return groups;
}

/* ══════════ Login gate ══════════ */
function AdminGate({ checking, onUnlocked }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const login = async () => {
    if (!username.trim() || !password.trim() || submitting) return;
    setSubmitting(true); setError('');
    try {
      const res = await secureFetch('/api/admin-login.php', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        onUnlocked();
      } else {
        setError(d.message || 'بيانات تسجيل دخول غير صحيحة');
      }
    } catch {
      setError('مفيش اتصال بالسيرفر');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--black)' }}>
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--yellow)' }} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--black)' }}>
      <div className="w-20 h-20 flex items-center justify-center mb-5 relative fade-in"
        style={{ background: 'var(--yellow)', color: 'var(--on-yellow)', borderRadius: 12 }}>
        <LayoutDashboard size={34} strokeWidth={2.4} />
      </div>
      <h1 className="font-display text-[2rem] leading-none mb-2 relative fade-in fade-in-1" style={{ color: 'var(--white)' }}>لوحة الأدمن</h1>
      <p className="text-sm mb-7 relative fade-in fade-in-2" style={{ color: 'var(--muted)' }}>سجّل دخولك ببيانات الأدمن عشان تفتح اللوحة</p>

      <div className="w-full flex flex-col gap-3 relative fade-in fade-in-3">
        <Input type="text" dir="ltr" placeholder="اسم المستخدم" value={username}
          onChange={e => { setUsername(e.target.value); setError(''); }} icon={User} />
        <Input type="password" dir="ltr" placeholder="كلمة المرور" value={password}
          onChange={e => { setPassword(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') login(); }} icon={KeyRound} />
        {error && <p className="text-xs font-bold text-right" style={{ color: 'var(--error)' }}>{error}</p>}
        <Button variant="primary" size="lg" className="w-full mt-1" disabled={submitting || !username.trim() || !password.trim()} onClick={login}>
          {submitting ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> جاري التحقق...</span> : 'دخول'}
        </Button>
        <Button variant="ghost" size="md" className="w-full" onClick={() => navigate('/profile')}>
          رجوع
        </Button>
      </div>
    </div>
  );
}

/* ══════════ Bookings panel ══════════ */
function BookingSkeleton() {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)' }}>
      <div className="flex justify-between mb-3">
        <div>
          <div className="h-4 rounded w-28 mb-1.5 skeleton" />
          <div className="h-3 rounded w-20 skeleton" />
        </div>
        <div className="h-6 rounded-full w-16 skeleton" />
      </div>
      <div className="h-3 rounded w-36 skeleton" />
    </div>
  );
}

function DetailRow({ label, value, gold }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-xs py-1">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="font-bold text-right" style={{ color: gold ? 'var(--yellow)' : 'var(--white-2)' }}>{value}</span>
    </div>
  );
}

function BookingCard({ booking: b, onStatusChange, onNotesSave, onPaymentStatusChange }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(b.admin_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const notesDirty = notes !== (b.admin_notes || '');
  const overdue = isOverdue(b);

  const saveNotes = async () => {
    setSavingNotes(true);
    await onNotesSave(b.id, notes);
    setSavingNotes(false);
  };

  const markPaid = async () => {
    setSavingPayment(true);
    await onPaymentStatusChange(b.id, 'paid');
    setSavingPayment(false);
  };

  return (
    <Card className="overflow-hidden" style={overdue ? { border: '1px solid rgba(240,83,62,0.4)' } : undefined}>
      <div className="flex items-start gap-2 px-4 pt-4">
        <button type="button" onClick={() => setOpen(o => !o)}
          className="flex-1 min-w-0 flex items-start gap-3 text-right active:opacity-80" style={{ background: 'none', border: 'none' }}>
          <IconBadge icon={Car} size="sm" tone="panel" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black truncate" style={{ color: 'var(--white)' }}>#{b.id} — {b.name}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{b.phone}</p>
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{b.package_name || b.package_code}</span>
              <span className="text-xs font-black" style={{ color: 'var(--yellow)' }}>{b.total_price} ج</span>
            </div>
          </div>
        </button>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
            style={{ background: `${STATUS_COLORS[b.status]}22`, color: STATUS_COLORS[b.status] }}>
            {STATUS_LABELS[b.status] || b.status}
          </span>
          {overdue && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(240,83,62,0.15)', color: 'var(--error)' }}>
              <AlertTriangle size={10} /> متأخر
            </span>
          )}
        </div>
      </div>

      {/* Quick contact + expand toggle */}
      <div className="flex items-center gap-2 px-4 pb-3 pt-2">
        <a href={`tel:${b.phone}`} onClick={e => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-xl active:scale-95 transition-transform"
          style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--white-2)' }}>
          <Phone size={12} /> اتصال
        </a>
        <a href={waLink(b.phone)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-xl active:scale-95 transition-transform"
          style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--white-2)' }}>
          <MessageCircle size={12} /> واتساب
        </a>
        <button type="button" onClick={() => setOpen(o => !o)}
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
          style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)' }}>
          <ChevronDown size={14} style={{ color: 'var(--muted-2)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 fade-in">
          <div className="rounded-xl p-3 mb-3" style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)' }}>
            <DetailRow label="نوع العربية" value={b.car_type_name} />
            <DetailRow label="الفرع" value={b.branch} />
            <DetailRow label="الموعد" value={b.appointment ? fmtDateTime(b.appointment) : null} />
            <DetailRow label="رقم اللوحة" value={b.plate_number} />
            <DetailRow label="طريقة الدفع" value={b.payment_method} />
            {b.payment_status && (
              <div className="flex justify-between items-center text-xs py-1">
                <span style={{ color: 'var(--muted)' }}>حالة الدفع</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${PAYMENT_STATUS_COLORS[b.payment_status]}22`, color: PAYMENT_STATUS_COLORS[b.payment_status] }}>
                    {PAYMENT_STATUS_LABELS[b.payment_status] || b.payment_status}
                  </span>
                  {b.payment_status === 'pending' && (
                    <button type="button" onClick={markPaid} disabled={savingPayment}
                      className="text-[10px] font-black px-2 py-0.5 rounded-full active:scale-95 transition-transform"
                      style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', color: 'var(--yellow)' }}>
                      {savingPayment ? '...' : 'تحديد كمدفوع'}
                    </button>
                  )}
                </div>
              </div>
            )}
            {b.discount_amount > 0 && <DetailRow label="الخصم" value={`- ${b.discount_amount} ج`} />}
            <DetailRow label="المصدر" value={SOURCE_LABELS[b.source] || b.source} />
            {b.pos_staff_username && <DetailRow label="الكاشير" value={b.pos_staff_username} />}
            <DetailRow label="تاريخ الإنشاء" value={fmtDateTime(b.created_at)} />
          </div>

          {b.notes && (
            <div className="rounded-xl p-3 mb-3 text-xs" style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)' }}>
              <p className="font-black mb-1" style={{ color: 'var(--muted)' }}>ملاحظات العميل</p>
              <p style={{ color: 'var(--white-2)' }}>{b.notes}</p>
            </div>
          )}

          <div className="mb-3">
            <p className="text-xs font-black mb-1.5" style={{ color: 'var(--muted)' }}>ملاحظات الأدمن</p>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="اكتب ملاحظة داخلية..."
              className="textarea-premium rounded-xl px-3 py-2 text-xs resize-none w-full" />
            {notesDirty && (
              <Button variant="secondary" size="md" className="w-full mt-2" disabled={savingNotes} onClick={saveNotes}>
                {savingNotes ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> جاري الحفظ...</span>
                  : <span className="inline-flex items-center gap-2"><Check size={14} /> حفظ الملاحظة</span>}
              </Button>
            )}
          </div>

          {(STATUS_TRANSITIONS[b.status] || []).length > 0 && (
            <div className="flex gap-2 pt-2" style={{ borderTop: '1px dashed var(--line-2)' }}>
              {STATUS_TRANSITIONS[b.status].map(s => (
                <button key={s} type="button" onClick={() => onStatusChange(b.id, s)}
                  className="flex-1 text-[11px] font-black py-2.5 rounded-xl active:scale-95 transition-transform"
                  style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--white-2)' }}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'oldest', label: 'الأقدم' },
  { value: 'price',  label: 'الأعلى سعر' },
];

function BookingsPanel({ bookings, loading, onRefresh, onStatusChange, onNotesSave, onPaymentStatusChange }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  const counts = useMemo(() => {
    const c = { all: bookings.length };
    for (const s of Object.keys(STATUS_LABELS)) c[s] = 0;
    for (const b of bookings) c[b.status] = (c[b.status] || 0) + 1;
    return c;
  }, [bookings]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(b =>
        String(b.id).includes(q) ||
        (b.name || '').toLowerCase().includes(q) ||
        (b.phone || '').includes(q) ||
        (b.plate_number || '').toLowerCase().includes(q)
      );
    }
    list = [...list];
    if (sort === 'oldest') list.reverse();
    else if (sort === 'price') list.sort((a, b) => Number(b.total_price || 0) - Number(a.total_price || 0));
    return list;
  }, [bookings, filter, search, sort]);

  const chronological = sort === 'newest' || sort === 'oldest';
  const groups = useMemo(() => (chronological ? groupByDay(filtered) : [{ label: null, items: filtered }]), [filtered, chronological]);

  const filterOptions = [
    { value: 'all', label: 'الكل' },
    ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="text" placeholder="دور بالاسم، الموبايل، رقم اللوحة، أو #ID"
        value={search} onChange={e => setSearch(e.target.value)} icon={Search}
        trailing={search ? { icon: X, onClick: () => setSearch('') } : undefined}
      />

      <div className="flex gap-2 overflow-x-auto scroll-hide pb-1">
        {filterOptions.map(opt => {
          const active = filter === opt.value;
          return (
            <button key={opt.value} type="button" onClick={() => setFilter(opt.value)}
              className="flex-shrink-0 text-xs font-bold px-3.5 py-2 rounded-full active:scale-95 transition-transform"
              style={{
                background: active ? 'var(--yellow-soft)' : 'var(--panel-3)',
                border: `1px solid ${active ? 'var(--yellow-line)' : 'var(--line-2)'}`,
                color: active ? 'var(--yellow)' : 'var(--muted)',
              }}>
              {opt.label} {counts[opt.value] ? `(${counts[opt.value]})` : ''}
            </button>
          );
        })}
        <button type="button" onClick={onRefresh}
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--muted)' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scroll-hide">
        {SORT_OPTIONS.map(opt => {
          const active = sort === opt.value;
          return (
            <button key={opt.value} type="button" onClick={() => setSort(opt.value)}
              className="flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{
                background: active ? 'var(--panel-4)' : 'transparent',
                border: `1px solid ${active ? 'var(--line-2)' : 'transparent'}`,
                color: active ? 'var(--white-2)' : 'var(--muted-2)',
              }}>
              {opt.label}
            </button>
          );
        })}
      </div>

      {loading && bookings.length === 0 ? (
        <div className="flex flex-col gap-3">
          <BookingSkeleton /><BookingSkeleton /><BookingSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-xs font-bold py-10" style={{ color: 'var(--muted)' }}>
          {search ? 'مفيش نتايج تطابق البحث' : 'لا يوجد حجوزات'}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g, i) => (
            <div key={g.label || i} className="flex flex-col gap-3">
              {g.label && <p className="text-[11px] font-black" style={{ color: 'var(--muted-2)' }}>{g.label}</p>}
              {g.items.map(b => (
                <BookingCard key={b.id} booking={b} onStatusChange={onStatusChange} onNotesSave={onNotesSave} onPaymentStatusChange={onPaymentStatusChange} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════ Profits panel ══════════ */
function StatTile({ icon, label, value, tone }) {
  return (
    <Card className="p-4 flex flex-col gap-2">
      <IconBadge icon={icon} size="sm" tone={tone} />
      <p className="text-[11px] font-bold" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-lg font-black" style={{ color: 'var(--white)' }}>{value}</p>
    </Card>
  );
}

function BarRow({ label, value, max, suffix = '' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-bold truncate" style={{ color: 'var(--white-2)' }}>{label}</span>
        <span className="font-black" style={{ color: 'var(--yellow)' }}>{value}{suffix}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--panel-3)' }}>
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: 'var(--gradient-gold)' }} />
      </div>
    </div>
  );
}

const RANGE_OPTIONS = [
  { value: 'today', label: 'اليوم' },
  { value: 'week',  label: 'الأسبوع' },
  { value: 'month', label: 'الشهر' },
  { value: 'all',   label: 'الكل' },
];

function rangeStartDate(range) {
  const now = new Date();
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'week') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - 6);
    return d;
  }
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

function topEntries(map, n = 5) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function ProfitsPanel({ bookings }) {
  const [range, setRange] = useState('today');

  const stats = useMemo(() => {
    const start = rangeStartDate(range);
    const inRange = start ? bookings.filter(b => new Date(b.created_at) >= start) : bookings;
    const notCancelled = inRange.filter(b => b.status !== 'cancelled');
    const sumPrice = (list) => list.reduce((sum, b) => sum + Number(b.total_price || 0), 0);

    const revenue = sumPrice(notCancelled);
    const count = notCancelled.length;
    const avgOrder = count > 0 ? Math.round(revenue / count) : 0;
    const cancelledCount = inRange.length - count;
    const cancelRate = inRange.length > 0 ? Math.round((cancelledCount / inRange.length) * 100) : 0;

    const byBranch = new Map();
    const byPayment = new Map();
    const byPackage = new Map();
    for (const b of notCancelled) {
      if (b.branch) byBranch.set(b.branch, (byBranch.get(b.branch) || 0) + Number(b.total_price || 0));
      if (b.payment_method) byPayment.set(b.payment_method, (byPayment.get(b.payment_method) || 0) + Number(b.total_price || 0));
      const pkg = b.package_name || b.package_code;
      if (pkg) byPackage.set(pkg, (byPackage.get(pkg) || 0) + 1);
    }

    const uniqueCustomers = new Set(inRange.map(b => b.email || b.phone).filter(Boolean));

    return {
      revenue, count, avgOrder, cancelRate,
      uniqueCustomers: uniqueCustomers.size,
      byBranch: topEntries(byBranch),
      byPayment: topEntries(byPayment),
      topPackage: topEntries(byPackage, 1)[0] || null,
    };
  }, [bookings, range]);

  const trend = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const revenue = bookings
        .filter(b => b.status !== 'cancelled')
        .filter(b => { const t = new Date(b.created_at); return t >= d && t < next; })
        .reduce((sum, b) => sum + Number(b.total_price || 0), 0);
      days.push({ label: d.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'short' }), revenue });
    }
    return days;
  }, [bookings]);
  const trendMax = Math.max(1, ...trend.map(d => d.revenue));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto scroll-hide pb-1">
        {RANGE_OPTIONS.map(opt => {
          const active = range === opt.value;
          return (
            <button key={opt.value} type="button" onClick={() => setRange(opt.value)}
              className="flex-shrink-0 text-xs font-bold px-3.5 py-2 rounded-full active:scale-95 transition-transform"
              style={{
                background: active ? 'var(--yellow-soft)' : 'var(--panel-3)',
                border: `1px solid ${active ? 'var(--yellow-line)' : 'var(--line-2)'}`,
                color: active ? 'var(--yellow)' : 'var(--muted)',
              }}>
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile icon={Wallet} tone="yellow" label="الإيراد" value={`${stats.revenue} ج`} />
        <StatTile icon={CalendarDays} tone="panel" label="عدد الحجوزات" value={stats.count} />
        <StatTile icon={TrendingUp} tone="panel" label="متوسط الفاتورة" value={`${stats.avgOrder} ج`} />
        <StatTile icon={Percent} tone="panel" label="نسبة الإلغاء" value={`${stats.cancelRate}%`} />
        <StatTile icon={Users} tone="panel" label="عملاء فريدون" value={stats.uniqueCustomers} />
        <StatTile icon={Award} tone="panel" label="الباقة الأكثر طلباً" value={stats.topPackage ? stats.topPackage[0] : '—'} />
      </div>

      {stats.byBranch.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-black mb-3 inline-flex items-center gap-1.5" style={{ color: 'var(--white)' }}>
            <Building2 size={13} style={{ color: 'var(--yellow)' }} /> الإيراد بالفروع
          </p>
          {stats.byBranch.map(([branch, rev]) => (
            <BarRow key={branch} label={branch} value={rev} max={stats.byBranch[0][1]} suffix=" ج" />
          ))}
        </Card>
      )}

      {stats.byPayment.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-black mb-3 inline-flex items-center gap-1.5" style={{ color: 'var(--white)' }}>
            <CreditCard size={13} style={{ color: 'var(--yellow)' }} /> الإيراد بطريقة الدفع
          </p>
          {stats.byPayment.map(([method, rev]) => (
            <BarRow key={method} label={method} value={rev} max={stats.byPayment[0][1]} suffix=" ج" />
          ))}
        </Card>
      )}

      <Card className="p-4">
        <p className="text-xs font-black mb-3 inline-flex items-center gap-1.5" style={{ color: 'var(--white)' }}>
          <TrendingUp size={13} style={{ color: 'var(--yellow)' }} /> الإيراد آخر 7 أيام
        </p>
        {trend.map(d => <BarRow key={d.label} label={d.label} value={d.revenue} max={trendMax} suffix=" ج" />)}
      </Card>
    </div>
  );
}

/* ══════════ Appointments panel ══════════ */
function SlotRow({ slot, onDelete }) {
  const full = slot.booked_count >= slot.max_bookings;
  const pct = slot.max_bookings > 0 ? Math.round((slot.booked_count / slot.max_bookings) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-bold" style={{ color: 'var(--white-2)' }}>{fmtTime12(slot.slot_time)}</span>
          <span className="font-black" style={{ color: full ? 'var(--error)' : 'var(--success)' }}>{slot.booked_count}/{slot.max_bookings}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--panel-3)' }}>
          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: full ? 'var(--error)' : 'var(--gradient-gold)' }} />
        </div>
      </div>
      <button type="button" onClick={() => onDelete(slot.id)}
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
        style={{ background: 'rgba(240,83,62,0.1)', border: '1px solid rgba(240,83,62,0.25)', color: 'var(--error)' }}>
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function AppointmentsPanel({ slots, loading, onRefresh, onAddSlots, onDeleteSlot }) {
  const [date, setDate] = useState('');
  const [times, setTimes] = useState(new Set());
  const [maxBookings, setMaxBookings] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const toggleTime = (t) => setTimes(prev => {
    const next = new Set(prev);
    if (next.has(t)) next.delete(t); else next.add(t);
    return next;
  });

  const submit = async () => {
    if (!date || times.size === 0 || submitting) return;
    setSubmitting(true);
    await onAddSlots(date, [...times], maxBookings);
    setTimes(new Set());
    setSubmitting(false);
  };

  const groups = useMemo(() => groupSlotsByDate(slots), [slots]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <p className="text-xs font-black mb-3" style={{ color: 'var(--white)' }}>إضافة مواعيد جديدة</p>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mb-3" />
        <div className="flex flex-wrap gap-2 mb-3">
          {SLOT_TIMES.map(t => {
            const active = times.has(t);
            return (
              <button key={t} type="button" onClick={() => toggleTime(t)}
                className="text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                style={{
                  background: active ? 'var(--yellow-soft)' : 'var(--panel-3)',
                  border: `1px solid ${active ? 'var(--yellow-line)' : 'var(--line-2)'}`,
                  color: active ? 'var(--yellow)' : 'var(--muted)',
                }}>
                {fmtTime12(t)}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>أقصى عدد حجوزات لكل ميعاد</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMaxBookings(m => Math.max(1, m - 1))}
              className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--white-2)' }}>−</button>
            <span className="text-sm font-black w-5 text-center" style={{ color: 'var(--white)' }}>{maxBookings}</span>
            <button type="button" onClick={() => setMaxBookings(m => Math.min(20, m + 1))}
              className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--white-2)' }}>+</button>
          </div>
        </div>
        <Button variant="primary" size="lg" className="w-full" disabled={!date || times.size === 0 || submitting} onClick={submit}>
          {submitting
            ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> جاري الإضافة...</span>
            : <span className="inline-flex items-center gap-2"><Plus size={16} /> إضافة {times.size || ''} موعد</span>}
        </Button>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs font-black" style={{ color: 'var(--muted)' }}>كل المواعيد</p>
        <button type="button" onClick={onRefresh}
          className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--muted)' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && slots.length === 0 ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--yellow)' }} /></div>
      ) : groups.length === 0 ? (
        <p className="text-center text-xs font-bold py-10" style={{ color: 'var(--muted)' }}>لا يوجد مواعيد بعد</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(g => (
            <Card key={g.date} className="p-4">
              <p className="text-xs font-black mb-3" style={{ color: 'var(--white)' }}>{slotDateLabel(g.date)}</p>
              <div className="flex flex-col gap-2.5">
                {g.items.map((s, idx) => (
                  <div key={s.id} style={idx > 0 ? { borderTop: '1px dashed var(--line-2)', paddingTop: '0.65rem' } : undefined}>
                    <SlotRow slot={s} onDelete={onDeleteSlot} />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════ Main admin screen ══════════ */
export default function AdminScreen() {
  const { showToast } = useToast();

  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    api.get('admin-login.php?action=check')
      .then(r => r.json())
      .then(d => setUnlocked(!!d.authenticated))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const loadBookings = () => {
    setLoadingBookings(true);
    api.get('bookings.php')
      .then(r => r.json())
      .then(d => { if (d.ok) setBookings(d.bookings || []); })
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  };

  const loadSlots = () => {
    setLoadingSlots(true);
    api.get('slots.php?admin=1')
      .then(r => r.json())
      .then(d => setSlots(d.all_slots || []))
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  };

  useEffect(() => {
    if (unlocked) { loadBookings(); loadSlots(); }
  }, [unlocked]);

  const handleStatusChange = async (id, status) => {
    try {
      const res = await secureFetch('/api/bookings.php', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setBookings(bs => bs.map(b => (b.id === id ? { ...b, status } : b)));
        showToast(`تحديث الحجز #${id} إلى ${STATUS_LABELS[status]} ✓`, 'success');
      } else {
        showToast(d.message || 'فشل تحديث الحالة', 'error');
      }
    } catch {
      showToast('مفيش اتصال بالسيرفر', 'error');
    }
  };

  const handleNotesSave = async (id, admin_notes) => {
    try {
      const res = await secureFetch('/api/bookings.php', {
        method: 'PATCH',
        body: JSON.stringify({ id, admin_notes }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setBookings(bs => bs.map(b => (b.id === id ? { ...b, admin_notes } : b)));
        showToast('اتحفظت الملاحظة ✓', 'success');
      } else {
        showToast(d.message || 'فشل حفظ الملاحظة', 'error');
      }
    } catch {
      showToast('مفيش اتصال بالسيرفر', 'error');
    }
  };

  const handlePaymentStatusChange = async (id, payment_status) => {
    try {
      const res = await secureFetch('/api/bookings.php', {
        method: 'PATCH',
        body: JSON.stringify({ id, payment_status }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setBookings(bs => bs.map(b => (b.id === id ? { ...b, payment_status } : b)));
        showToast('اتحدّثت حالة الدفع ✓', 'success');
      } else {
        showToast(d.message || 'فشل تحديث حالة الدفع', 'error');
      }
    } catch {
      showToast('مفيش اتصال بالسيرفر', 'error');
    }
  };

  const handleAddSlots = async (date, times, max_bookings) => {
    try {
      const res = await secureFetch('/api/slots.php', {
        method: 'POST',
        body: JSON.stringify({ date, times, max_bookings }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        showToast(`تمت إضافة ${d.added} موعد ✓`, 'success');
        loadSlots();
      } else {
        showToast(d.message || 'فشل إضافة المواعيد', 'error');
      }
    } catch {
      showToast('مفيش اتصال بالسيرفر', 'error');
    }
  };

  const handleDeleteSlot = async (id) => {
    try {
      const res = await secureFetch(`/api/slots.php?id=${id}`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setSlots(s => s.filter(x => x.id !== id));
        showToast('اتحذف الميعاد ✓', 'success');
      } else {
        showToast(d.message || 'فشل حذف الميعاد', 'error');
      }
    } catch {
      showToast('مفيش اتصال بالسيرفر', 'error');
    }
  };

  const logout = async () => {
    try {
      await secureFetch('/api/admin-login.php', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
    } catch {}
    setUnlocked(false);
    setBookings([]);
    setSlots([]);
  };

  if (!unlocked) {
    return <AdminGate checking={checking} onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--black)' }}>
      <header
        className="sticky top-0 z-40 px-5 py-3.5 flex items-center gap-3"
        style={{ background: 'var(--black)', borderBottom: '2px solid var(--line-2)' }}
      >
        <IconBadge icon={ShieldCheck} size="sm" tone="yellow" />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black leading-none" style={{ color: 'var(--white)' }}>لوحة الأدمن</h1>
          <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>{bookings.length} حجز إجمالي</p>
        </div>
        <button type="button" onClick={logout} aria-label="خروج"
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--muted)' }}>
          <LogOut size={15} />
        </button>
      </header>

      <div className="px-5 pt-4 pb-2">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'bookings', label: 'الحجوزات' },
            { value: 'profits', label: 'الأرباح' },
            { value: 'appointments', label: 'المواعيد' },
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto scroll-hide px-5 pb-6">
        {tab === 'bookings' && (
          <BookingsPanel bookings={bookings} loading={loadingBookings} onRefresh={loadBookings} onStatusChange={handleStatusChange} onNotesSave={handleNotesSave} onPaymentStatusChange={handlePaymentStatusChange} />
        )}
        {tab === 'profits' && <ProfitsPanel bookings={bookings} />}
        {tab === 'appointments' && (
          <AppointmentsPanel slots={slots} loading={loadingSlots} onRefresh={loadSlots} onAddSlots={handleAddSlots} onDeleteSlot={handleDeleteSlot} />
        )}
      </div>
    </div>
  );
}
