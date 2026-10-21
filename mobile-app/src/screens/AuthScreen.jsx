import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Mail, Lock, Eye, EyeOff, User, Phone, Gift } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { secureFetch } from '../lib/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import SegmentedControl from '../components/ui/SegmentedControl';
import NeonEmblem from '../components/brand/NeonEmblem';

const TABS = [
  { value: 'login',    label: 'تسجيل دخول' },
  { value: 'register', label: 'حساب جديد' },
];

/* ─── Login form ──────────────────────────────────────── */
function LoginForm({ onSwitch }) {
  const navigate    = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('أدخل البريد وكلمة المرور'); return; }
    setLoading(true); setError('');
    try {
      const res = await secureFetch('/api/customer-login.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: form.email, password: form.password }),
      });
      const d = await res.json();
      if (d.ok) {
        const check = await fetch('/api/customer-login.php?action=check', { credentials: 'same-origin' });
        const profile = await check.json();
        setUser(profile.authenticated ? profile : null);
        navigate(-1);
      } else {
        setError(d.message || 'بيانات غير صحيحة');
      }
    } catch {
      setError('مفيش اتصال بالإنترنت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="font-display text-[2.2rem] leading-none mb-2 fade-in">أهلاً بيك تاني</h1>
      <p className="text-sm mb-7 fade-in" style={{ color: 'var(--muted)' }}>ادخل بياناتك وكمّل من حيث وقفت</p>

      <form onSubmit={submit} className="flex flex-col gap-4 fade-in fade-in-1">
        <Input
          type="email" dir="ltr" placeholder="البريد الإلكتروني"
          value={form.email} onChange={set('email')} icon={Mail}
        />
        <Input
          type={showPw ? 'text' : 'password'} dir="ltr" placeholder="كلمة المرور"
          value={form.password} onChange={set('password')} icon={Lock}
          trailing={{ icon: showPw ? EyeOff : Eye, onClick: () => setShowPw(s => !s) }}
        />

        {error && (
          <div role="alert" className="p-3 text-sm font-bold text-center"
            style={{ border: '2px solid var(--error)', borderRadius: 8, color: 'var(--error)' }}>
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full mt-2">
          {loading ? 'جاري الدخول...' : <>دخول <ArrowLeft size={20} strokeWidth={3} /></>}
        </Button>

        <button type="button" onClick={() => navigate('/forgot-password')}
          className="text-sm text-center font-bold active:opacity-70" style={{ color: 'var(--yellow)' }}>
          نسيت كلمة المرور؟
        </button>

        <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
          معندكش حساب؟{' '}
          <button type="button" onClick={() => onSwitch('register')} className="font-black active:opacity-70" style={{ color: 'var(--yellow)' }}>
            سجل دلوقتي
          </button>
        </p>
      </form>
    </>
  );
}

/* ─── Register form ───────────────────────────────────── */
function RegisterForm({ onSwitch }) {
  const [form, setForm]       = useState({ name: '', email: '', phone: '', password: '', referral_code: '' });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);
  const [loading, setLoading] = useState(false);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const validate = () => {
    if (!/^[\p{L}\s]{2,80}$/u.test(form.name.trim())) return 'اكتب اسمك الكامل بحروف صحيحة';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'بريد إلكتروني غير صحيح';
    if (!/^01[0125][0-9]{8}$/.test(form.phone.trim())) return 'رقم موبايل مصري غير صحيح';
    if (form.password.length < 6) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    return '';
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError('');
    try {
      const res = await secureFetch('/api/customer-login.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          referral_code: form.referral_code.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setDone(true);
      } else {
        setError(d.message || 'تعذر إنشاء الحساب');
      }
    } catch {
      setError('مفيش اتصال بالإنترنت');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center text-center mt-4 fade-in">
        <NeonEmblem size={100} animate />
        <h2 className="font-display text-[2rem] leading-none mt-5 mb-2">الحساب اتعمل</h2>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--muted)' }}>
          بص على بريدك الإلكتروني وفعّل حسابك، وبعدها سجّل دخولك
        </p>
        <Button size="lg" onClick={() => onSwitch('login')} className="w-full">تسجيل الدخول</Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-[2.2rem] leading-none mb-2 fade-in">أهلاً بيك في DR.Care</h1>
      <p className="text-sm mb-7 fade-in" style={{ color: 'var(--muted)' }}>حساب واحد لحجوزاتك ونقاطك</p>

      <form onSubmit={submit} className="flex flex-col gap-4 fade-in fade-in-1">
        <Input type="text" placeholder="الاسم الكامل" value={form.name} onChange={set('name')} icon={User} />
        <Input type="email" dir="ltr" placeholder="البريد الإلكتروني" value={form.email} onChange={set('email')} icon={Mail} />
        <Input type="tel" dir="ltr" placeholder="رقم الموبايل" value={form.phone} onChange={set('phone')} icon={Phone} />
        <Input
          type={showPw ? 'text' : 'password'} dir="ltr" placeholder="كلمة المرور"
          value={form.password} onChange={set('password')} icon={Lock}
          trailing={{ icon: showPw ? EyeOff : Eye, onClick: () => setShowPw(s => !s) }}
        />
        <Input type="text" dir="ltr" placeholder="كود الإحالة (اختياري)" value={form.referral_code} onChange={set('referral_code')} icon={Gift} />

        {error && (
          <div role="alert" className="p-3 text-sm font-bold text-center"
            style={{ border: '2px solid var(--error)', borderRadius: 8, color: 'var(--error)' }}>
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full mt-2">
          {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
        </Button>

        <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
          عندك حساب بالفعل؟{' '}
          <button type="button" onClick={() => onSwitch('login')} className="font-black active:opacity-70" style={{ color: 'var(--yellow)' }}>
            سجّل دخولك
          </button>
        </p>
      </form>
    </>
  );
}

/* ─── Main AuthScreen (tabs Login/Register, matches Figma reference) ──── */
export default function AuthScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(location.pathname === '/register' ? 'register' : 'login');

  const switchTab = (next) => {
    setTab(next);
    navigate(next === 'register' ? '/register' : '/login', { replace: true });
  };

  return (
    <div className="h-full overflow-y-auto scroll-hide flex flex-col" style={{ background: 'var(--black)' }}>
      <header className="relative flex items-center justify-center pt-8 pb-5 flex-shrink-0" style={{ paddingTop: 'calc(2rem + var(--safe-top))' }}>
        <button
          type="button" onClick={() => navigate(-1)} aria-label="رجوع"
          className="absolute w-10 h-10 flex items-center justify-center active:translate-y-0.5 transition-transform"
          style={{ right: '1.25rem', top: 'calc(1.5rem + var(--safe-top))', background: 'var(--panel-3)', borderRadius: 8, color: 'var(--white-2)' }}
        >
          <ArrowRight size={20} strokeWidth={2.6} />
        </button>
        <NeonEmblem size={78} animate />
      </header>

      <div className="px-5 pb-10 flex-1 flex flex-col">
        <SegmentedControl options={TABS} value={tab} onChange={switchTab} className="mb-8 fade-in" />

        {tab === 'login' ? <LoginForm onSwitch={switchTab} /> : <RegisterForm onSwitch={switchTab} />}
      </div>
    </div>
  );
}
