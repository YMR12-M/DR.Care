import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { secureFetch } from '../lib/api';

export default function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('بريد إلكتروني غير صحيح'); return; }
    setLoading(true); setError('');
    try {
      const res = await secureFetch('../api/password-reset.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email: email.trim() }),
      });
      const d = await res.json();
      /* الـ backend يرد بنفس الرسالة دايماً (ok:true) سواء البريد مسجل أو لأ — لمنع تسريب معلومة وجود الحساب */
      if (d.ok) setSent(true);
      else setError(d.message || 'حصل خطأ، حاول تاني');
    } catch {
      setError('مفيش اتصال بالإنترنت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto scroll-hide flex flex-col" style={{ background: 'var(--black)' }}>
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
        <h1 className="text-base font-black" style={{ color: 'var(--white)' }}>نسيت كلمة المرور</h1>
      </header>

      <div className="flex-1 flex flex-col p-6">
        {sent ? (
          <div className="flex flex-col items-center text-center mt-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
              style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)' }}>📧</div>
            <h2 className="text-lg font-black mb-2" style={{ color: 'var(--white)' }}>تحقق من بريدك</h2>
            <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
              لو البريد ده مسجل عندنا، هتوصلك رسالة فيها رابط إعادة تعيين كلمة المرور خلال دقائق.
            </p>
            <button onClick={() => navigate('/login')} className="w-full btn-yellow py-4 rounded-2xl text-base">
              رجوع لتسجيل الدخول
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8 mt-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3"
                style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)' }}>🔑</div>
              <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
                اكتب بريدك الإلكتروني وهنبعتلك رابط إعادة تعيين كلمة المرور
              </p>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>البريد الإلكتروني</label>
                <input type="email" placeholder="your@gmail.com" value={email} onChange={e => setEmail(e.target.value)} dir="ltr"
                  className="w-full rounded-xl px-4 py-3.5 text-sm placeholder-[#6e6860] focus:outline-none transition"
                  style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)', color: 'var(--white)' }}/>
              </div>

              {error && (
                <div className="rounded-xl p-3 text-sm font-bold text-center"
                  style={{ background: 'rgba(240,83,62,0.1)', color: 'var(--error)' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full btn-yellow py-4 rounded-2xl text-base mt-2 disabled:opacity-50">
                {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
              </button>

              <button type="button" onClick={() => navigate('/login')}
                className="text-sm text-center font-bold" style={{ color: 'var(--yellow)' }}>
                رجوع لتسجيل الدخول
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
