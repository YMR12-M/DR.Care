import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { secureFetch } from '../lib/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ScreenHeader from '../components/ui/ScreenHeader';
import NeonEmblem from '../components/brand/NeonEmblem';

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
      <ScreenHeader title="نسيت كلمة المرور" onBack={() => navigate(-1)} />

      <div className="flex-1 flex flex-col p-5">
        {sent ? (
          <div className="flex flex-col items-center text-center mt-8 fade-in">
            <NeonEmblem size={100} animate />
            <h2 className="font-display text-[2rem] leading-none mt-5 mb-2">شوف بريدك</h2>
            <p className="text-sm mb-8 leading-relaxed max-w-[19rem]" style={{ color: 'var(--muted)' }}>
              لو البريد ده مسجل عندنا، هتوصلك رسالة فيها رابط إعادة تعيين كلمة المرور خلال دقائق.
            </p>
            <Button size="lg" onClick={() => navigate('/login')} className="w-full">رجوع لتسجيل الدخول</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8 mt-4 fade-in">
              <NeonEmblem size={86} animate />
              <p className="text-sm text-center mt-5 leading-relaxed max-w-[19rem]" style={{ color: 'var(--muted)' }}>
                اكتب بريدك الإلكتروني وهنبعتلك رابط إعادة تعيين كلمة المرور
              </p>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4 fade-in fade-in-1">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>البريد الإلكتروني</label>
                <Input type="email" placeholder="your@gmail.com" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" icon={Mail} />
              </div>

              {error && (
                <div role="alert" className="p-3 text-sm font-bold text-center"
                  style={{ border: '2px solid var(--error)', borderRadius: 8, color: 'var(--error)' }}>
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
