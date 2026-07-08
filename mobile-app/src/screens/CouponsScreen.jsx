import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { secureFetch } from '../lib/api';

export default function CouponsScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [result, setResult]     = useState(null);

  const load = () => {
    setLoading(true);
    secureFetch('../api/loyalty.php')
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
      const res = await secureFetch('../api/loyalty.php', {
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
        <div className="text-6xl mb-4">🎁</div>
        <h2 className="text-lg font-black mb-2" style={{ color: 'var(--white)' }}>نقاط الولاء والكوبونات</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>سجل دخولك عشان تشوف رصيدك ومكافآتك</p>
        <button onClick={() => navigate('/login')} className="btn-yellow px-8 py-3 rounded-2xl text-sm">
          تسجيل الدخول
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content" style={{ background: 'var(--black)' }}>
      <header
        className="sticky top-0 z-40 px-4 py-4"
        style={{ background: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)' }}
      >
        <h1 className="text-base font-black" style={{ color: 'var(--white)' }}>كوبونات الخصم</h1>
      </header>

      {loading ? (
        <div className="p-4 flex flex-col gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--panel-2)' }}/>
          ))}
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-4">
          {/* Balance */}
          <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--muted)' }}>رصيدك الحالي</p>
            <p className="text-3xl font-black" style={{ color: 'var(--yellow)' }}>{data?.balance ?? 0} نقطة</p>
            {data?.next && (
              <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                باقي {data.next.points - data.balance} نقطة لـ «{data.next.label}»
              </p>
            )}
          </div>

          {/* Redeem result */}
          {result && (
            <div className="rounded-2xl p-4 text-center"
              style={{ background: result.ok ? 'rgba(111,207,71,0.1)' : 'rgba(240,83,62,0.1)', border: `1px solid ${result.ok ? 'var(--success)' : 'var(--error)'}` }}>
              {result.ok ? (
                <>
                  <p className="text-sm font-black" style={{ color: 'var(--success)' }}>تم استبدال «{result.label}» ✓</p>
                  <p className="text-lg font-black mt-1 tracking-wider" dir="ltr" style={{ color: 'var(--white)' }}>{result.code}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>استخدم الكود ده عند حجزك الجاي</p>
                </>
              ) : (
                <p className="text-sm font-bold" style={{ color: 'var(--error)' }}>{result.text}</p>
              )}
            </div>
          )}

          {/* Rewards */}
          <div>
            <p className="text-xs font-black mb-3" style={{ color: 'var(--muted)' }}>المكافآت المتاحة</p>
            <div className="flex flex-col gap-2.5">
              {(data?.rewards || []).map(r => (
                <div key={r.id} className="rounded-2xl p-4 flex items-center justify-between"
                  style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
                  <div>
                    <p className="text-sm font-black" style={{ color: 'var(--white)' }}>{r.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{r.desc} — {r.points} نقطة</p>
                  </div>
                  <button
                    type="button"
                    disabled={!r.available || redeeming === r.id}
                    onClick={() => redeem(r.id)}
                    className="px-4 py-2 rounded-xl text-xs font-black flex-shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
                    style={{ background: 'var(--yellow)', color: '#0a0800' }}
                  >
                    {redeeming === r.id ? '...' : 'استبدال'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          {data?.history?.length > 0 && (
            <div>
              <p className="text-xs font-black mb-3" style={{ color: 'var(--muted)' }}>سجل النقاط</p>
              <div className="flex flex-col gap-2">
                {data.history.map((h, i) => (
                  <div key={i} className="rounded-xl p-3 flex items-center justify-between"
                    style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--white-2)' }}>{h.note || h.package_name || h.source}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-2)' }}>{h.created_at}</p>
                    </div>
                    <span className="text-sm font-black" style={{ color: h.points > 0 ? 'var(--success)' : 'var(--error)' }}>
                      {h.points > 0 ? `+${h.points}` : h.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
