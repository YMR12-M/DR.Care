import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Phone, Lock, Mail, CalendarDays, ClipboardList } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { secureFetch } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

function fmtMemberSince(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
}

export default function EditProfileScreen() {
  const navigate = useNavigate();
  const { user, setUser, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile]     = useState(null);
  const [form, setForm]           = useState({ name: '', phone: '' });
  const [pwForm, setPwForm]       = useState({ current_password: '', new_password: '' });
  const [nameError, setNameError] = useState('');
  const [pwError, setPwError]     = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPw, setSavingPw]     = useState(false);

  useEffect(() => {
    if (!user) return;
    secureFetch('/api/customer-profile.php')
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setProfile(d.customer);
          setForm({ name: d.customer.name || '', phone: d.customer.phone || '' });
        }
      })
      .catch(() => showToast('مفيش اتصال بالسيرفر', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [authLoading, user, navigate]);

  if (!authLoading && !user) return null;

  const saveInfo = async (e) => {
    e.preventDefault();
    if (!/^[\p{L}\s]{2,80}$/u.test(form.name.trim())) { setNameError('الاسم غير صالح'); return; }
    if (!/^01[0125][0-9]{8}$/.test(form.phone.trim())) { setNameError('رقم موبايل مصري غير صحيح'); return; }
    setNameError('');
    setSavingInfo(true);
    try {
      const res = await secureFetch('/api/customer-profile.php', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim() }),
      });
      const d = await res.json();
      if (d.ok) {
        showToast(d.message || 'اتحفظت البيانات ✓', 'success');
        setUser(u => ({ ...u, name: form.name.trim(), phone: form.phone.trim() }));
        setProfile(p => (p ? { ...p, name: form.name.trim(), phone: form.phone.trim() } : p));
      } else {
        showToast(d.message || 'فشل حفظ البيانات', 'error');
      }
    } catch {
      showToast('مفيش اتصال بالإنترنت', 'error');
    } finally {
      setSavingInfo(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password.length < 6) { setPwError('كلمة المرور الجديدة قصيرة جداً'); return; }
    setPwError('');
    setSavingPw(true);
    try {
      const res = await secureFetch('/api/customer-profile.php', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pwForm),
      });
      const d = await res.json();
      if (d.ok) {
        showToast(d.message || 'اتحدّثت كلمة المرور ✓', 'success');
        setPwForm({ current_password: '', new_password: '' });
      } else {
        showToast(d.message || 'فشل تحديث كلمة المرور', 'error');
      }
    } catch {
      showToast('مفيش اتصال بالإنترنت', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content" style={{ background: 'var(--black)' }}>
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-5 py-3.5"
        style={{ background: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)' }}
      >
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'var(--panel-3)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--line-2)' }}
          type="button">
          <ChevronLeft size={18} style={{ color: 'var(--muted)' }} />
        </button>
        <h1 className="text-base font-black" style={{ color: 'var(--white)' }}>تعديل البيانات</h1>
      </header>

      <div className="p-6 flex flex-col gap-5">
        {/* Identity card */}
        <Card variant="premium" className="p-5 relative overflow-hidden fade-in">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: 'var(--yellow)' }} />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0"
              style={{ background: 'var(--gradient-gold)', color: '#0a0800', boxShadow: 'var(--shadow-gold-premium)' }}>
              {profile?.name?.[0] || 'أ'}
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-base leading-tight truncate" style={{ color: 'var(--white)' }}>{profile?.name || '...'}</h2>
              <p className="text-xs mt-1 inline-flex items-center gap-1.5 truncate" style={{ color: 'var(--muted)' }}>
                <Mail size={12} className="flex-shrink-0" /> {profile?.email || '—'}
              </p>
            </div>
          </div>
          <div className="relative flex gap-3 mt-4 pt-4" style={{ borderTop: '1px dashed var(--line-2)' }}>
            <div className="flex-1 flex items-center gap-2">
              <CalendarDays size={14} style={{ color: 'var(--muted-2)' }} />
              <div>
                <p className="text-[10px]" style={{ color: 'var(--muted-2)' }}>عميل منذ</p>
                <p className="text-xs font-bold" style={{ color: 'var(--white-2)' }}>{fmtMemberSince(profile?.created_at)}</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <ClipboardList size={14} style={{ color: 'var(--muted-2)' }} />
              <div>
                <p className="text-[10px]" style={{ color: 'var(--muted-2)' }}>إجمالي الحجوزات</p>
                <p className="text-xs font-bold" style={{ color: 'var(--white-2)' }}>{profile?.booking_count ?? 0}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Personal info */}
        <Card as="form" onSubmit={saveInfo} className="p-5 flex flex-col gap-4 fade-in fade-in-1">
          <p className="text-sm font-black" style={{ color: 'var(--white)' }}>البيانات الشخصية</p>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>الاسم الكامل</label>
            <Input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} icon={User} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>رقم الموبايل</label>
            <Input type="tel" dir="ltr" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} icon={Phone} />
          </div>
          {nameError && <p className="text-xs font-bold text-right" style={{ color: 'var(--error)' }}>{nameError}</p>}
          <Button type="submit" variant="primary" size="md" disabled={savingInfo} className="w-full">
            {savingInfo ? 'جاري الحفظ...' : 'حفظ البيانات'}
          </Button>
        </Card>

        {/* Password */}
        <Card as="form" onSubmit={savePassword} className="p-5 flex flex-col gap-4 fade-in fade-in-2">
          <p className="text-sm font-black" style={{ color: 'var(--white)' }}>تغيير كلمة المرور</p>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>كلمة المرور الحالية</label>
            <Input type="password" dir="ltr" value={pwForm.current_password}
              onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} icon={Lock} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>كلمة المرور الجديدة</label>
            <Input type="password" dir="ltr" value={pwForm.new_password}
              onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} icon={Lock} />
          </div>
          {pwError && <p className="text-xs font-bold text-right" style={{ color: 'var(--error)' }}>{pwError}</p>}
          <Button type="submit" variant="secondary" size="md" disabled={savingPw} className="w-full">
            {savingPw ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
          </Button>
        </Card>
      </div>
    </div>
  );
}
