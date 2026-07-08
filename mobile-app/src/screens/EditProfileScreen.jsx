import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { secureFetch } from '../lib/api';

export default function EditProfileScreen() {
  const navigate = useNavigate();
  const { user, setUser, loading: authLoading } = useAuth();

  const [form, setForm]           = useState({ name: '', phone: '' });
  const [pwForm, setPwForm]       = useState({ current_password: '', new_password: '' });
  const [infoMsg, setInfoMsg]     = useState(null);
  const [pwMsg, setPwMsg]         = useState(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPw, setSavingPw]     = useState(false);

  useEffect(() => {
    if (!user) return;
    secureFetch('../api/customer-profile.php')
      .then(r => r.json())
      .then(d => { if (d.ok) setForm({ name: d.customer.name || '', phone: d.customer.phone || '' }); })
      .catch(() => {});
  }, [user]);

  if (!authLoading && !user) {
    navigate('/login');
    return null;
  }

  const saveInfo = async (e) => {
    e.preventDefault();
    if (!/^[\p{L}\s]{2,80}$/u.test(form.name.trim())) { setInfoMsg({ ok: false, text: 'الاسم غير صالح' }); return; }
    if (!/^01[0125][0-9]{8}$/.test(form.phone.trim())) { setInfoMsg({ ok: false, text: 'رقم موبايل مصري غير صحيح' }); return; }
    setSavingInfo(true); setInfoMsg(null);
    try {
      const res = await secureFetch('../api/customer-profile.php', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim() }),
      });
      const d = await res.json();
      setInfoMsg({ ok: d.ok, text: d.message });
      if (d.ok) setUser(u => ({ ...u, name: form.name.trim(), phone: form.phone.trim() }));
    } catch {
      setInfoMsg({ ok: false, text: 'مفيش اتصال بالإنترنت' });
    } finally {
      setSavingInfo(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password.length < 6) { setPwMsg({ ok: false, text: 'كلمة المرور الجديدة قصيرة جداً' }); return; }
    setSavingPw(true); setPwMsg(null);
    try {
      const res = await secureFetch('../api/customer-profile.php', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pwForm),
      });
      const d = await res.json();
      setPwMsg({ ok: d.ok, text: d.message });
      if (d.ok) setPwForm({ current_password: '', new_password: '' });
    } catch {
      setPwMsg({ ok: false, text: 'مفيش اتصال بالإنترنت' });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content" style={{ background: 'var(--black)' }}>
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
        <h1 className="text-base font-black" style={{ color: 'var(--white)' }}>تعديل البيانات</h1>
      </header>

      <div className="p-6 flex flex-col gap-6">
        {/* Personal info */}
        <form onSubmit={saveInfo} className="flex flex-col gap-4">
          <p className="text-sm font-black" style={{ color: 'var(--white)' }}>البيانات الشخصية</p>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>الاسم الكامل</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none"
              style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)', color: 'var(--white)' }}/>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>رقم الموبايل</label>
            <input type="tel" dir="ltr" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none"
              style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)', color: 'var(--white)' }}/>
          </div>
          {infoMsg && (
            <p className="text-xs font-bold text-center" style={{ color: infoMsg.ok ? 'var(--success)' : 'var(--error)' }}>{infoMsg.text}</p>
          )}
          <button type="submit" disabled={savingInfo} className="w-full btn-yellow py-3.5 rounded-2xl text-sm disabled:opacity-50">
            {savingInfo ? 'جاري الحفظ...' : 'حفظ البيانات'}
          </button>
        </form>

        <div className="h-px" style={{ background: 'var(--line)' }} />

        {/* Password */}
        <form onSubmit={savePassword} className="flex flex-col gap-4">
          <p className="text-sm font-black" style={{ color: 'var(--white)' }}>تغيير كلمة المرور</p>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>كلمة المرور الحالية</label>
            <input type="password" dir="ltr" value={pwForm.current_password}
              onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
              className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none"
              style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)', color: 'var(--white)' }}/>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>كلمة المرور الجديدة</label>
            <input type="password" dir="ltr" value={pwForm.new_password}
              onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
              className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none"
              style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)', color: 'var(--white)' }}/>
          </div>
          {pwMsg && (
            <p className="text-xs font-bold text-center" style={{ color: pwMsg.ok ? 'var(--success)' : 'var(--error)' }}>{pwMsg.text}</p>
          )}
          <button type="submit" disabled={savingPw}
            className="w-full py-3.5 rounded-2xl text-sm font-black disabled:opacity-50"
            style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--white-2)' }}>
            {savingPw ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  );
}
