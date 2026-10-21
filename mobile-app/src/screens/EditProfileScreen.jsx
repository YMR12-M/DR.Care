import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { secureFetch } from '../lib/api';
import Card from '../components/ui/Card';
import ScreenHeader from '../components/ui/ScreenHeader';
import MemberCard from '../components/brand/MemberCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

function fmtMemberSince(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long' });
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
        showToast(d.message || 'اتحفظت البيانات', 'success');
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
        showToast(d.message || 'اتحدّثت كلمة المرور', 'success');
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
      <ScreenHeader title="تعديل البيانات" onBack={() => navigate(-1)} />

      <div className="p-4 flex flex-col gap-4 pt-5">
        <MemberCard name={profile?.name} email={profile?.email} className="fade-in">
          <div className="flex gap-3 mt-4 pt-3.5" style={{ borderTop: '2px dashed var(--line-2)' }}>
            <div className="flex-1">
              <p className="ticket__k" style={{ color: 'var(--muted-2)' }}>عميل من</p>
              <p className="font-display text-lg leading-tight">{fmtMemberSince(profile?.created_at)}</p>
            </div>
            <div className="flex-1">
              <p className="ticket__k" style={{ color: 'var(--muted-2)' }}>عدد الحجوزات</p>
              <p className="font-display text-lg leading-tight num">{profile?.booking_count ?? 0}</p>
            </div>
          </div>
        </MemberCard>

        {/* Personal info */}
        <Card as="form" onSubmit={saveInfo} className="p-5 flex flex-col gap-4 fade-in fade-in-1">
          <h2 className="font-display text-[1.3rem] leading-none">البيانات الشخصية</h2>
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
          <h2 className="font-display text-[1.3rem] leading-none">تغيير كلمة المرور</h2>
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
