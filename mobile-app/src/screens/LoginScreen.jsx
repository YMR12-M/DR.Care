import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { secureFetch } from '../lib/api';

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
        className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3"
        style={{ background: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)' }}
      >
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)' }}
          type="button">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: 'var(--muted)' }}>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-base font-black" style={{ color: 'var(--white)' }}>تسجيل الدخول</h1>
      </header>

      <div className="flex-1 flex flex-col p-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 mt-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl mb-3"
            style={{ background: 'var(--yellow)', color: '#0a0800' }}>DR</div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>ادخل على حسابك في DR.Care</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
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

          <button type="submit" disabled={loading} className="w-full btn-yellow py-4 rounded-2xl text-base mt-2 disabled:opacity-50">
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>

          <button type="button" onClick={() => navigate('/forgot-password')}
            className="text-sm text-center font-bold" style={{ color: 'var(--yellow)' }}>
            نسيت كلمة المرور؟
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px" style={{ background: 'var(--line)' }}/>
            <span className="text-xs" style={{ color: 'var(--muted-2)' }}>أو</span>
            <div className="flex-1 h-px" style={{ background: 'var(--line)' }}/>
          </div>

          <button type="button" onClick={() => navigate('/register')}
            className="w-full py-4 rounded-2xl text-base font-black"
            style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--white-2)' }}>
            إنشاء حساب جديد
          </button>
        </form>
      </div>
    </div>
  );
}
