import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { secureFetch } from '../lib/api';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('أدخل البريد الإلكتروني وكلمة المرور'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await secureFetch('../api/customer-login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: form.email, password: form.password }),
      });
      const d = await res.json();
      if (d.success) {
        setUser(d);
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
    <div className="h-full overflow-y-auto scroll-hide bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center" type="button">
          <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 className="text-base font-bold text-slate-800">تسجيل الدخول</h1>
      </header>

      <div className="flex-1 flex flex-col p-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black mb-3">DR</div>
          <p className="text-sm text-slate-500">ادخل على حسابك في DR.Care</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">البريد الإلكتروني</label>
            <input
              type="email"
              placeholder="your@gmail.com"
              value={form.email}
              onChange={set('email')}
              dir="ltr"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">كلمة المرور</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              dir="ltr"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center bg-red-50 py-2 rounded-xl">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base mt-2 active:scale-95 transition-transform disabled:opacity-60"
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-sm text-blue-600 text-center"
          >
            نسيت كلمة المرور؟
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-slate-200"/>
            <span className="text-xs text-slate-400">أو</span>
            <div className="flex-1 h-px bg-slate-200"/>
          </div>

          <button
            type="button"
            onClick={() => navigate('/register')}
            className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold text-base active:scale-95 transition-transform"
          >
            إنشاء حساب جديد
          </button>
        </form>
      </div>
    </div>
  );
}
