import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Star, CheckCircle2, Copy, Check, RefreshCw, TrendingUp, TrendingDown, History } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { secureFetch } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconBadge from '../components/ui/IconBadge';
import SegmentedControl from '../components/ui/SegmentedControl';

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

function fmtHistoryDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* ══════════ نقاطي tab ══════════ */
function PointsTab({ data }) {
  const pct = data?.next ? Math.min(100, Math.round((data.balance / data.next.points) * 100)) : 100;

  return (
    <div className="flex flex-col gap-5 fade-in">
      <Card variant="premium" className="p-5 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: 'var(--yellow)' }} />
        <p className="text-xs font-bold mb-1 relative" style={{ color: 'var(--muted)' }}>رصيدك الحالي</p>
        <p className="text-4xl font-black relative" style={{ color: 'var(--yellow)' }}>{data?.balance ?? 0}</p>
        <p className="text-xs font-bold relative" style={{ color: 'var(--muted)' }}>نقطة</p>

        {data?.next && (
          <div className="mt-4 relative">
            <div className="flex justify-between text-[11px] font-bold mb-1.5">
              <span style={{ color: 'var(--muted)' }}>باقي {Math.max(0, data.next.points - data.balance)} نقطة لـ «{data.next.label}»</span>
              <span style={{ color: 'var(--yellow)' }}>{pct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--panel-3)' }}>
              <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'var(--gradient-gold)' }} />
            </div>
          </div>
        )}
      </Card>

      <div>
        <p className="text-xs font-black mb-3 inline-flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
          <History size={13} /> سجل النقاط
        </p>
        {(data?.history || []).length === 0 ? (
          <div className="flex flex-col items-center text-center py-10">
            <IconBadge icon={Star} size="md" tone="panel" className="mb-3" />
            <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>لسه معملتش نقاط</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-2)' }}>كل حجز بيديك نقاط تقدر تستبدلها بعدين</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {data.history.map((h, i) => {
              const positive = h.points > 0;
              return (
                <Card key={i} className="p-4 flex items-center gap-3">
                  <IconBadge icon={positive ? TrendingUp : TrendingDown} size="sm" tone={positive ? 'yellow' : 'panel'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--white-2)' }}>{h.note || h.package_name || h.source}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-2)' }}>{fmtHistoryDate(h.created_at)}</p>
                  </div>
                  <span className="text-sm font-black flex-shrink-0" style={{ color: positive ? 'var(--success)' : 'var(--error)' }}>
                    {positive ? `+${h.points}` : h.points}
                  </span>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════ كوبونات الخصم tab ══════════ */
function RewardsTab({ data, redeeming, confirmId, onRequestConfirm, onCancelConfirm, onRedeem, result, copied, onCopy }) {
  return (
    <div className="flex flex-col gap-5 fade-in">
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
                <button type="button" onClick={onCopy}
                  className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                  style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', color: 'var(--yellow)' }}>
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

      <div>
        <p className="text-xs font-black mb-3" style={{ color: 'var(--muted)' }}>المكافآت المتاحة</p>
        <div className="flex flex-col gap-3">
          {(data?.rewards || []).map(r => {
            const confirming = confirmId === r.id;
            return (
              <Card key={r.id} className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <IconBadge icon={Gift} size="sm" tone={r.available ? 'yellow' : 'panel'} />
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate" style={{ color: 'var(--white)' }}>{r.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{r.desc} — {r.points} نقطة</p>
                    </div>
                  </div>
                  {!confirming ? (
                    <Button variant="primary" size="md" disabled={!r.available || redeeming === r.id}
                      onClick={() => onRequestConfirm(r.id)} className="flex-shrink-0" style={{ padding: '0.5rem 1rem' }}>
                      استبدال
                    </Button>
                  ) : (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button type="button" onClick={onCancelConfirm}
                        className="text-xs font-bold px-2.5 py-2 rounded-xl active:scale-95 transition-transform"
                        style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--muted)' }}>
                        إلغاء
                      </button>
                      <Button variant="primary" size="md" disabled={redeeming === r.id}
                        onClick={() => onRedeem(r.id)} style={{ padding: '0.5rem 1rem' }}>
                        {redeeming === r.id ? '...' : 'تأكيد؟'}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CouponsScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState('points');
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [result, setResult]     = useState(null);
  const [copied, setCopied]     = useState(false);

  const copyCode = async () => {
    if (!result?.code) return;
    const ok = await copyText(result.code);
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
      .catch(() => showToast('مفيش اتصال بالسيرفر', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const redeem = async (rewardId) => {
    setConfirmId(null);
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
        showToast('تم الاستبدال بنجاح ✓', 'success');
        load();
      } else {
        setResult({ ok: false, text: d.message });
        showToast(d.message || 'فشل الاستبدال', 'error');
      }
    } catch {
      showToast('مفيش اتصال بالإنترنت', 'error');
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
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-black" style={{ color: 'var(--white)' }}>نقاطي وكوبوناتي</h1>
          <button type="button" onClick={load}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)', color: 'var(--muted)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'points',  label: 'نقاطي' },
            { value: 'rewards', label: 'كوبونات الخصم' },
          ]}
        />
      </header>

      <div className="p-5">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl skeleton" style={{ border: '1px solid var(--line-2)' }} />
            ))}
          </div>
        ) : tab === 'points' ? (
          <PointsTab data={data} />
        ) : (
          <RewardsTab
            data={data} redeeming={redeeming} confirmId={confirmId}
            onRequestConfirm={setConfirmId} onCancelConfirm={() => setConfirmId(null)}
            onRedeem={redeem} result={result} copied={copied} onCopy={copyCode}
          />
        )}
      </div>
    </div>
  );
}
