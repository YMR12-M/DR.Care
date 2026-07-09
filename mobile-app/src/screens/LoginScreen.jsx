import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { secureFetch } from '../lib/api';
import Button from '../components/ui/Button';

export default function LoginScreen() {
  const navigate      = useNavigate();
  const { setUser }   = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('أدخل البريد وكلمة المرور'); return; }
    setLoading(true); setError('');
    try {
      const res = await secureFetch('../api/customer-login.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: form.email, password: form.password }),
      });
      const d = await res.json();
      if (d.ok) {
        const check = await fetch('../api/customer-login.php?action=check', { credentials: 'same-origin' });
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
    <div className="h-full overflow-y-auto scroll-hide flex flex-col" style={{ background: 'var(--black)' }}>
      {/* Header */}
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
        <h1 className="text-base font-black" style={{ color: 'var(--white)' }}>تسجيل الدخول</h1>
      </header>

      <div className="flex-1 flex flex-col p-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 mt-4 fade-in">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl mb-3"
            style={{ background: 'linear-gradient(155deg, var(--yellow) 0%, var(--yellow-2) 100%)', color: '#0a0800', boxShadow: 'var(--shadow-yellow-glow)' }}>DR</div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>ادخل على حسابك في DR.Care</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 fade-in fade-in-1">
          {[
            { label: 'البريد الإلكتروني', field: 'email',    type: 'email',    placeholder: 'your@gmail.com' },
            { label: 'كلمة المرور',       field: 'password', type: 'password', placeholder: '••••••••' },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>{label}</label>
              <input type={type} placeholder={placeholder} value={form[field]} onChange={set(field)} dir="ltr"
                className="w-full rounded-xl px-4 py-3.5 text-sm placeholder-[#6e6860] focus:outline-none transition"
                style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)', color: 'var(--white)' }}/>
            </div>
          ))}

          {error && (
            <div className="rounded-xl p-3 text-sm font-bold text-center"
              style={{ background: 'rgba(240,83,62,0.1)', color: 'var(--error)' }}>
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full mt-2">
            {loading ? 'جاري الدخول...' : 'دخول'}
          </Button>

          <button type="button" onClick={() => navigate('/forgot-password')}
            className="text-sm text-center font-bold active:opacity-70" style={{ color: 'var(--yellow)' }}>
            نسيت كلمة المرور؟
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px" style={{ background: 'var(--line)' }}/>
            <span className="text-xs" style={{ color: 'var(--muted-2)' }}>أو</span>
            <div className="flex-1 h-px" style={{ background: 'var(--line)' }}/>
          </div>

          <Button type="button" variant="secondary" size="lg" onClick={() => navigate('/register')} className="w-full">
            إنشاء حساب جديد
          </Button>
        </form>
      </div>
    </div>
  );
}
