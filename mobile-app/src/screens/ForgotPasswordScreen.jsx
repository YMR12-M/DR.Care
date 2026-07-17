import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, KeyRound } from 'lucide-react';
import { secureFetch } from '../lib/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

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
      const res = await secureFetch('/api/password-reset.php', {
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
        className="sticky top-0 z-40 flex items-center gap-3 px-5 py-3.5"
        style={{ background: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)' }}
      >
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'var(--panel-3)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--line-2)' }}
          type="button">
          <ChevronLeft size={18} style={{ color: 'var(--muted)' }} />
        </button>
        <h1 className="text-base font-black" style={{ color: 'var(--white)' }}>نسيت كلمة المرور</h1>
      </header>

      <div className="flex-1 flex flex-col p-6">
        {sent ? (
          <div className="flex flex-col items-center text-center mt-10 fade-in">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', boxShadow: 'var(--shadow-yellow-glow)' }}>
              <Mail size={28} style={{ color: 'var(--yellow)' }} />
            </div>
            <h2 className="text-lg font-black mb-2" style={{ color: 'var(--white)' }}>تحقق من بريدك</h2>
            <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
              لو البريد ده مسجل عندنا، هتوصلك رسالة فيها رابط إعادة تعيين كلمة المرور خلال دقائق.
            </p>
            <Button variant="primary" size="lg" onClick={() => navigate('/login')} className="w-full">
              رجوع لتسجيل الدخول
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8 mt-4 fade-in">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', boxShadow: 'var(--shadow-yellow-glow)' }}>
                <KeyRound size={28} style={{ color: 'var(--yellow)' }} />
              </div>
              <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
                اكتب بريدك الإلكتروني وهنبعتلك رابط إعادة تعيين كلمة المرور
              </p>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4 fade-in fade-in-1">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>البريد الإلكتروني</label>
                <Input type="email" placeholder="your@gmail.com" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" icon={Mail} />
              </div>

              {error && (
                <div className="rounded-xl p-3 text-sm font-bold text-center"
                  style={{ background: 'rgba(240,83,62,0.1)', color: 'var(--error)' }}>
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full mt-2">
                {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
              </Button>

              <button type="button" onClick={() => navigate('/login')}
                className="text-sm text-center font-bold active:opacity-70" style={{ color: 'var(--yellow)' }}>
                رجوع لتسجيل الدخول
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
