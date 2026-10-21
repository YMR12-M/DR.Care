import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { secureFetch } from '../lib/api';
import Button from '../components/ui/Button';
import SegmentedControl from '../components/ui/SegmentedControl';
import SectionHeader from '../components/ui/SectionHeader';
import WashLine from '../components/brand/WashLine';
import EmptyState from '../components/brand/EmptyState';
import { Mixed } from '../lib/bidi';

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
  return d.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const rewardValue = r => (r.type === 'percent' ? `${r.value}%` : `${r.value} ج`);

/* Where on the reward road is this balance? Fractional station index (the car can sit between stops). */
function roadStage(balance, thresholds) {
  const stops = [0, ...thresholds];
  if (balance >= stops[stops.length - 1]) return stops.length - 1;
  for (let i = 0; i < stops.length - 1; i++) {
    if (balance < stops[i + 1]) return i + (balance - stops[i]) / (stops[i + 1] - stops[i]);
  }
  return 0;
}

/* ══════════ نقاطي tab ══════════ */
function PointsTab({ data }) {
  const balance = data?.balance ?? 0;
  const rewards = data?.rewards || [];
  const thresholds = rewards.map(r => r.points);
  const labels = [
    <span key="s" className="block"><span className="block font-display text-[15px] leading-none" style={{ color: 'var(--muted-2)' }}>0</span></span>,
    ...rewards.map(r => (
      <span key={r.id} className="block">
        <span className="block font-display text-[15px] leading-none" style={{ color: 'var(--white)' }}>{r.points}</span>
        <span className="block text-[10.5px] font-bold mt-0.5" style={{ color: 'var(--yellow)' }}>{rewardValue(r)}</span>
      </span>
    )),
  ];

  return (
    <div className="flex flex-col gap-7 fade-in">
      <section className="board p-5">
        <p className="text-[12px] font-bold mb-2" style={{ color: 'var(--muted)' }}>رصيدك الحالي</p>
        <div className="flex items-end justify-between gap-3">
          <div className="led-board inline-flex items-baseline gap-2 px-4 py-2" style={{ borderRadius: 8 }}>
            <span className="led num relative z-[1]" style={{ fontSize: 72 }}>{balance}</span>
            <span className="font-display relative z-[1] text-xl" style={{ color: 'var(--yellow)' }}>نقطة</span>
          </div>
        </div>
        {data?.next ? (
          <p className="text-[13px] font-semibold mt-3.5" style={{ color: 'var(--white-2)' }}>
            باقي <span className="num font-bold" style={{ color: 'var(--yellow)' }}>{Math.max(0, data.next.points - balance)}</span> نقطة على «{data.next.label}»
          </p>
        ) : (
          <p className="text-[13px] font-semibold mt-3.5" style={{ color: 'var(--success)' }}>وصلت لآخر مكافأة — شغل عالي!</p>
        )}
      </section>

      {rewards.length > 0 && (
        <section>
          <SectionHeader title="طريق المكافآت" eyebrow="كل محطة كوبون خصم" />
          <div style={{ background: 'var(--panel-2)', border: '2px solid var(--line-2)', borderRadius: 10 }} className="px-2 pt-1 pb-0.5">
            <WashLine stage={roadStage(balance, thresholds)} labels={labels} finish={false} ariaLabel={`رصيدك ${balance} نقطة`} />
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="سجل النقاط" />
        {(data?.history || []).length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-display text-xl mb-1" style={{ color: 'var(--white-2)' }}>لسه معملتش نقاط</p>
            <p className="text-xs" style={{ color: 'var(--muted-2)' }}>كل غسلة بتخلص بتديك نقاط تستبدلها بخصم</p>
          </div>
        ) : (
          <div className="receipt">
            <p className="ticket__k text-center mb-1" style={{ letterSpacing: '0.2em' }}>— DR.CARE · كشف النقاط —</p>
            {data.history.map((h, i) => {
              const positive = h.points > 0;
              return (
                <div key={i} className="receipt__row">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold leading-snug"><Mixed>{h.note || h.package_name || h.source}</Mixed></span>
                    <span className="block text-[11px] mt-0.5" style={{ color: 'var(--paper-mute)' }}>{fmtHistoryDate(h.created_at)}</span>
                  </span>
                  <span className="font-display text-[1.45rem] leading-none flex-shrink-0 num" style={{ color: positive ? '#157a43' : '#c23a2e' }} dir="ltr">
                    {positive ? `+${h.points}` : h.points}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ══════════ كوبونات الخصم tab ══════════ */
function RewardsTab({ data, redeeming, confirmId, onRequestConfirm, onCancelConfirm, onRedeem, result, copied, onCopy }) {
  const balance = data?.balance ?? 0;
  return (
    <div className="flex flex-col gap-5 fade-in">
      {result && (
        <div className="p-4 text-center fade-in" style={{ background: 'var(--panel-2)', border: `2px solid ${result.ok ? 'var(--success)' : 'var(--error)'}`, borderRadius: 10 }} role="status">
          {result.ok ? (
            <>
              <p className="font-display text-[1.35rem] leading-none" style={{ color: 'var(--success)' }}>تم استبدال «{result.label}»</p>
              <div className="led-board flex items-center justify-center py-2.5 mt-3" style={{ borderRadius: 8 }}>
                <span className="led relative z-[1]" style={{ fontSize: 40, letterSpacing: '0.06em' }} dir="ltr">{result.code}</span>
              </div>
              <Button size="md" onClick={onCopy} className="mt-3 w-full">
                {copied ? <><Check size={17} strokeWidth={3.2} /> اتنسخ</> : <><Copy size={17} /> انسخ الكود</>}
              </Button>
              <p className="text-xs mt-2.5" style={{ color: 'var(--muted)' }}>استخدم الكود ده عند حجزك الجاي</p>
            </>
          ) : (
            <p className="text-sm font-bold" style={{ color: 'var(--error)' }}>{result.text}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {(data?.rewards || []).map(r => {
          const confirming = confirmId === r.id;
          const can = r.available;
          return (
            <article key={r.id} className={`coupon ${can ? '' : 'coupon--locked'}`}>
              <div className="coupon__main flex items-center">
                <div className="min-w-0">
                  <p className="ticket__k" style={{ letterSpacing: '0.12em' }}>كوبون خصم</p>
                  <p className="font-display text-[3.1rem] leading-[0.95] num">{rewardValue(r)}</p>
                  <p className="text-[12.5px] font-semibold mt-1" style={{ color: 'var(--paper-mute)' }}>{r.desc}</p>
                </div>
              </div>
              <div className="coupon__stub">
                <span className="ticket__k" style={{ marginBottom: 0 }}>التكلفة</span>
                <span className="font-display text-[1.7rem] leading-none num">{r.points}</span>
                <span className="text-[10.5px] font-bold -mt-1">نقطة</span>
                {!can ? (
                  <span className="text-[10.5px] font-bold leading-tight mt-1" style={{ color: '#3a372e' }}>ناقصك <span className="num">{r.points - balance}</span></span>
                ) : !confirming ? (
                  <button
                    type="button" disabled={redeeming === r.id} onClick={() => onRequestConfirm(r.id)}
                    className="font-display text-[1.05rem] px-3 py-1.5 mt-1 active:translate-y-0.5 transition-transform"
                    style={{ background: 'var(--on-yellow)', color: 'var(--yellow)', borderRadius: 6 }}
                  >
                    استبدل
                  </button>
                ) : (
                  <div className="flex flex-col gap-1 mt-1 w-full">
                    <button type="button" disabled={redeeming === r.id} onClick={() => onRedeem(r.id)}
                      className="font-display text-[1rem] py-1.5 active:translate-y-0.5" style={{ background: 'var(--on-yellow)', color: 'var(--yellow)', borderRadius: 6 }}>
                      {redeeming === r.id ? '...' : 'أكّد؟'}
                    </button>
                    <button type="button" onClick={onCancelConfirm} className="text-[11px] font-bold py-1" style={{ color: '#3a372e' }}>إلغاء</button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
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
      showToast('تم نسخ الكود', 'success');
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
        setResult({ ok: true, code: d.coupon_code ?? d.code, label: d.reward?.label ?? d.label });
        showToast('تم الاستبدال', 'success');
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
      <div className="h-full flex flex-col items-center justify-center px-8 text-center main-content" style={{ background: 'var(--black)' }}>
        <EmptyState title="نقاطك هنا" text="سجّل دخولك عشان تشوف رصيدك وكوبونات الخصم" action="تسجيل الدخول" onAction={() => navigate('/login')} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content" style={{ background: 'var(--black)' }}>
      <header className="sticky top-0 z-40 px-4 pt-4 pb-3" style={{ background: 'var(--black)', borderBottom: '2px solid var(--line-2)', paddingTop: 'calc(1rem + var(--safe-top))' }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-[2rem] leading-none">نقاطي وكوبوناتي</h1>
          <button type="button" onClick={load} aria-label="تحديث"
            className="w-9 h-9 flex items-center justify-center active:translate-y-0.5 transition-transform"
            style={{ background: 'var(--panel-3)', borderRadius: 7, color: 'var(--white-2)' }}>
            <RefreshCw size={16} strokeWidth={2.4} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <SegmentedControl
          value={tab} onChange={setTab}
          options={[{ value: 'points', label: 'نقاطي' }, { value: 'rewards', label: 'كوبونات الخصم' }]}
        />
      </header>

      <div className="p-4 pt-5">
        {loading ? (
          <div className="flex flex-col gap-4">{[1, 2, 3].map(i => <div key={i} className="h-24 skeleton" style={{ borderRadius: 10 }} />)}</div>
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
