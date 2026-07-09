import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { secureFetch } from '../lib/api';
import Button from '../components/ui/Button';

export default function RegisterScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', referral_code: '' });
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
      const res = await secureFetch('../api/customer-login.php', {
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
        <h1 className="text-base font-black" style={{ color: 'var(--white)' }}>إنشاء حساب جديد</h1>
      </header>

      <div className="flex-1 flex flex-col p-6">
        {done ? (
          <div className="flex flex-col items-center text-center mt-10 fade-in">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', boxShadow: 'var(--shadow-yellow-glow)' }}>
              <CheckCircle2 size={30} style={{ color: 'var(--yellow)' }} />
            </div>
            <h2 className="text-lg font-black mb-2" style={{ color: 'var(--white)' }}>تم إنشاء الحساب بنجاح!</h2>
            <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
              تحقق من بريدك الإلكتروني لتفعيل حسابك، ثم سجّل دخولك
            </p>
            <Button variant="primary" size="lg" onClick={() => navigate('/login')} className="w-full">
              تسجيل الدخول
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8 mt-4 fade-in">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl mb-3"
                style={{ background: 'linear-gradient(155deg, var(--yellow) 0%, var(--yellow-2) 100%)', color: '#0a0800', boxShadow: 'var(--shadow-yellow-glow)' }}>DR</div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>انضم لعائلة DR.Care</p>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4 fade-in fade-in-1">
              {[
                { label: 'الاسم الكامل',      field: 'name',     type: 'text',     placeholder: 'أحمد محمد', dir: 'rtl' },
                { label: 'البريد الإلكتروني', field: 'email',    type: 'email',    placeholder: 'your@gmail.com' },
                { label: 'رقم الموبايل',       field: 'phone',    type: 'tel',      placeholder: '01XXXXXXXXX' },
                { label: 'كلمة المرور',        field: 'password', type: 'password', placeholder: '••••••••' },
                { label: 'كود الإحالة (اختياري)', field: 'referral_code', type: 'text', placeholder: 'DR-XXXX', dir: 'ltr' },
              ].map(({ label, field, type, placeholder, dir }) => (
                <div key={field}>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>{label}</label>
                  <input type={type} placeholder={placeholder} value={form[field]} onChange={set(field)} dir={dir || 'ltr'}
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
                {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
              </Button>

              <button type="button" onClick={() => navigate('/login')}
                className="text-sm text-center font-bold active:opacity-70" style={{ color: 'var(--yellow)' }}>
                عندك حساب بالفعل؟ سجّل دخولك
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
