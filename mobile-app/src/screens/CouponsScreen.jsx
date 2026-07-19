import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, CheckCircle2, Copy, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { secureFetch } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconBadge from '../components/ui/IconBadge';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

export default function CouponsScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [result, setResult]     = useState(null);
  const [copied, setCopied]     = useState(false);

  const copyCode = async (code) => {
    const ok = await copyText(code);
    if (ok) {
      setCopied(true);
      showToast('تم نسخ الكود ✓', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast('تعذر النسخ — انسخ الكود يدوياً', 'error');
    }
  };

  const load = () => {
    setLoading(true);
    secureFetch('/api/loyalty.php')
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    load();
  }, [user, authLoading]);

  const redeem = async (rewardId) => {
    setRedeeming(rewardId);
    setResult(null);
    try {
      const res = await secureFetch('/api/loyalty.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward_id: rewardId }),
      });
      const d = await res.json();
      if (d.ok) {
        setResult({ ok: true, code: d.coupon_code, label: d.reward?.label });
        load();
      } else {
        setResult({ ok: false, text: d.message });
      }
    } catch {
      setResult({ ok: false, text: 'مفيش اتصال بالإنترنت' });
    } finally {
      setRedeeming(null);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--black)' }}>
        <IconBadge icon={Gift} size="lg" tone="yellow" className="mb-4" />
        <h2 className="text-lg font-black mb-2" style={{ color: 'var(--white)' }}>نقاط الولاء والكوبونات</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>سجل دخولك عشان تشوف رصيدك ومكافآتك</p>
        <Button variant="primary" size="lg" onClick={() => navigate('/login')} style={{ padding: '0.75rem 2rem' }}>
          تسجيل الدخول
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content" style={{ background: 'var(--black)' }}>
      <header
        className="sticky top-0 z-40 px-5 py-4"
        style={{ background: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)' }}
      >
        <h1 className="text-lg font-black" style={{ color: 'var(--white)' }}>كوبونات الخصم</h1>
      </header>

      {loading ? (
        <div className="p-5 flex flex-col gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 rounded-2xl skeleton" style={{ border: '1px solid var(--line-2)' }}/>
          ))}
        </div>
      ) : (
        <div className="p-5 flex flex-col gap-5">
          {/* Balance */}
          <Card variant="yellow" className="p-5 text-center fade-in">
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--muted)' }}>رصيدك الحالي</p>
            <p className="text-3xl font-black" style={{ color: 'var(--yellow)' }}>{data?.balance ?? 0} نقطة</p>
            {data?.next && (
              <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                باقي {data.next.points - data.balance} نقطة لـ «{data.next.label}»
              </p>
            )}
          </Card>

          {/* Redeem result */}
          {result && (
            <div className="rounded-2xl p-4 text-center fade-in"
              style={{ background: result.ok ? 'rgba(111,207,71,0.1)' : 'rgba(240,83,62,0.1)', border: `1px solid ${result.ok ? 'var(--success)' : 'var(--error)'}` }}>
              {result.ok ? (
                <>
                  <p className="inline-flex items-center gap-1.5 text-sm font-black" style={{ color: 'var(--success)' }}>
                    <CheckCircle2 size={15} /> تم استبدال «{result.label}»
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <p className="text-lg font-black tracking-wider" dir="ltr" style={{ color: 'var(--white)' }}>{result.code}</p>
                    <button
                      type="button"
                      onClick={() => copyCode(result.code)}
                      className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                      style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', color: 'var(--yellow)' }}
                    >
                      {copied ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}
                      {copied ? 'اتنسخ' : 'نسخ الكود'}
                    </button>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>استخدم الكود ده عند حجزك الجاي</p>
                </>
              ) : (
                <p className="text-sm font-bold" style={{ color: 'var(--error)' }}>{result.text}</p>
              )}
            </div>
          )}

          {/* Rewards */}
          <div className="fade-in fade-in-1">
            <p className="text-xs font-black mb-3" style={{ color: 'var(--muted)' }}>المكافآت المتاحة</p>
            <div className="flex flex-col gap-3">
              {(data?.rewards || []).map(r => (
                <Card key={r.id} className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconBadge icon={Gift} size="sm" tone={r.available ? 'yellow' : 'panel'} />
                    <div>
                      <p className="text-sm font-black" style={{ color: 'var(--white)' }}>{r.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{r.desc} — {r.points} نقطة</p>
                    </div>
                  </div>
                  <Button
                    variant="primary" size="md"
                    disabled={!r.available || redeeming === r.id}
                    onClick={() => redeem(r.id)}
                    className="flex-shrink-0"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    {redeeming === r.id ? '...' : 'استبدال'}
                  </Button>
                </Card>
              ))}
            </div>
          </div>

          {/* History */}
          {data?.history?.length > 0 && (
            <div className="fade-in fade-in-2">
              <p className="text-xs font-black mb-3" style={{ color: 'var(--muted)' }}>سجل النقاط</p>
              <div className="flex flex-col gap-2.5">
                {data.history.map((h, i) => (
                  <Card key={i} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--white-2)' }}>{h.note || h.package_name || h.source}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-2)' }}>{h.created_at}</p>
                    </div>
                    <span className="text-sm font-black" style={{ color: h.points > 0 ? 'var(--success)' : 'var(--error)' }}>
                      {h.points > 0 ? `+${h.points}` : h.points}
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
