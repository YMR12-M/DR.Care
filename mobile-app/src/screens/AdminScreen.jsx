import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Loader2, LayoutDashboard, LogOut, User, KeyRound,
  Wallet, CalendarDays, Sparkles, RefreshCw, Users, Receipt,
  Search, X, ChevronDown, Car, Check,
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
  return new Date(str).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

function dayBucketLabel(str) {
  const d = new Date(str);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (day.getTime() === today.getTime()) return 'اليوم';
  if (day.getTime() === yesterday.getTime()) return 'أمس';
  return day.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
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
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: 'var(--yellow)' }} />
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 relative fade-in"
        style={{ background: 'var(--gradient-gold-soft)', border: '1px solid var(--yellow-line)', boxShadow: 'var(--shadow-gold-premium)' }}>
        <LayoutDashboard size={32} style={{ color: 'var(--yellow)' }} strokeWidth={2.2} />
      </div>
      <h1 className="text-xl font-black mb-2 relative fade-in fade-in-1" style={{ color: 'var(--white)' }}>لوحة الأدمن</h1>
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

function BookingCard({ booking: b, onStatusChange, onNotesSave }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(b.admin_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const notesDirty = notes !== (b.admin_notes || '');

  const saveNotes = async () => {
    setSavingNotes(true);
    await onNotesSave(b.id, notes);
    setSavingNotes(false);
  };

  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 p-4 text-right active:opacity-80" style={{ background: 'none', border: 'none' }}>
        <IconBadge icon={Car} size="sm" tone="panel" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate" style={{ color: 'var(--white)' }}>#{b.id} — {b.name}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{b.phone}</p>
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{b.package_name || b.package_code}</span>
            <span className="text-xs font-black" style={{ color: 'var(--yellow)' }}>{b.total_price} ج</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
            style={{ background: `${STATUS_COLORS[b.status]}22`, color: STATUS_COLORS[b.status] }}>
            {STATUS_LABELS[b.status] || b.status}
          </span>
          <ChevronDown size={14} style={{ color: 'var(--muted-2)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 fade-in">
          <div className="rounded-xl p-3 mb-3" style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)' }}>
            <DetailRow label="نوع العربية" value={b.car_type_name} />
            <DetailRow label="الفرع" value={b.branch} />
            <DetailRow label="الموعد" value={b.appointment ? fmtDateTime(b.appointment) : null} />
            <DetailRow label="رقم اللوحة" value={b.plate_number} />
            <DetailRow label="طريقة الدفع" value={b.payment_method} />
            {b.payment_status && (
              <div className="flex justify-between text-xs py-1">
                <span style={{ color: 'var(--muted)' }}>حالة الدفع</span>
                <span className="font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${PAYMENT_STATUS_COLORS[b.payment_status]}22`, color: PAYMENT_STATUS_COLORS[b.payment_status] }}>
                  {PAYMENT_STATUS_LABELS[b.payment_status] || b.payment_status}
                </span>
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

function BookingsPanel({ bookings, loading, onRefresh, onStatusChange, onNotesSave }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

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
    return list;
  }, [bookings, filter, search]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

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
          {groups.map(g => (
            <div key={g.label} className="flex flex-col gap-3">
              <p className="text-[11px] font-black" style={{ color: 'var(--muted-2)' }}>{g.label}</p>
              {g.items.map(b => (
                <BookingCard key={b.id} booking={b} onStatusChange={onStatusChange} onNotesSave={onNotesSave} />
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

function ProfitsPanel({ bookings }) {
  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const notCancelled = bookings.filter(b => b.status !== 'cancelled');
    const sumPrice = (list) => list.reduce((sum, b) => sum + Number(b.total_price || 0), 0);

    const todayBookings = notCancelled.filter(b => new Date(b.created_at) >= startOfDay);
    const monthBookings = notCancelled.filter(b => new Date(b.created_at) >= startOfMonth);

    const uniqueCustomers = new Set(
      bookings.map(b => b.email || b.phone).filter(Boolean)
    );

    return {
      todayRevenue: sumPrice(todayBookings),
      todayCount: todayBookings.length,
      monthRevenue: sumPrice(monthBookings),
      monthCount: monthBookings.length,
      totalRevenue: sumPrice(notCancelled),
      totalCount: bookings.length,
      uniqueCustomers: uniqueCustomers.size,
    };
  }, [bookings]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatTile icon={Wallet} tone="yellow" label="إيراد اليوم" value={`${stats.todayRevenue} ج`} />
      <StatTile icon={CalendarDays} tone="panel" label="حجوزات اليوم" value={stats.todayCount} />
      <StatTile icon={Wallet} tone="yellow" label="إيراد الشهر" value={`${stats.monthRevenue} ج`} />
      <StatTile icon={CalendarDays} tone="panel" label="حجوزات الشهر" value={stats.monthCount} />
      <StatTile icon={Receipt} tone="panel" label="الإيراد الكلي" value={`${stats.totalRevenue} ج`} />
      <StatTile icon={Users} tone="panel" label="عملاء فريدون" value={stats.uniqueCustomers} />
    </div>
  );
}

/* ══════════ Featured cars panel (placeholder) ══════════ */
function FeaturedCarsPanel() {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      <IconBadge icon={Sparkles} size="lg" tone="yellow" className="mb-4" />
      <h2 className="text-base font-black mb-1.5" style={{ color: 'var(--white)' }}>عربيات مميزة</h2>
      <p className="text-xs font-bold" style={{ color: 'var(--muted)' }}>قريباً — هيتم تحديد وظيفة القسم ده بعدين</p>
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

  useEffect(() => {
    if (unlocked) loadBookings();
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

  const logout = async () => {
    try {
      await secureFetch('/api/admin-login.php', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
    } catch {}
    setUnlocked(false);
    setBookings([]);
  };

  if (!unlocked) {
    return <AdminGate checking={checking} onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--black)' }}>
      <header
        className="sticky top-0 z-40 px-5 py-3.5 flex items-center gap-3"
        style={{ background: 'rgba(2,2,2,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)' }}
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
            { value: 'featured', label: 'عربيات مميزة' },
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto scroll-hide px-5 pb-6">
        {tab === 'bookings' && (
          <BookingsPanel bookings={bookings} loading={loadingBookings} onRefresh={loadBookings} onStatusChange={handleStatusChange} onNotesSave={handleNotesSave} />
        )}
        {tab === 'profits' && <ProfitsPanel bookings={bookings} />}
        {tab === 'featured' && <FeaturedCarsPanel />}
      </div>
    </div>
  );
}
