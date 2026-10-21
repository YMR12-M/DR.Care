import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

const DISMISS_KEY = 'dr_install_dismissed_at';
const DISMISS_DAYS = 14;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const dismissedRecently = dismissedAt && (Date.now() - dismissedAt) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    if (dismissedRecently) return;

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    const handleInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    /* iOS Safari never fires beforeinstallprompt — show manual "Add to Home Screen" instructions instead */
    if (isIos()) {
      setIosHint(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => {});
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed left-3 right-3 z-[9997] flex items-stretch fade-in overflow-hidden"
      style={{
        bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        background: 'var(--yellow)', color: 'var(--on-yellow)', borderRadius: 10, boxShadow: '0 5px 0 rgba(0,0,0,0.5)',
      }}
    >
      <div className="flex-1 min-w-0 flex items-center gap-3 p-3.5">
        <span className="flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--on-yellow)', color: 'var(--yellow)' }}>
          {iosHint ? <Share size={19} strokeWidth={2.6} /> : <Download size={19} strokeWidth={2.6} />}
        </span>
        <div className="min-w-0">
          <p className="font-display text-[1.15rem] leading-none">نزّل تطبيق DR.Care</p>
          <p className="text-xs font-bold mt-1 leading-snug" style={{ opacity: 0.8 }}>
            {iosHint ? 'دوس على «مشاركة» ثم «إضافة إلى الشاشة الرئيسية»' : 'يفتح أسرع من شاشتك الرئيسية'}
          </p>
        </div>
      </div>
      {!iosHint && (
        <button type="button" onClick={install} className="flex-shrink-0 px-4 font-display text-lg active:opacity-70" style={{ background: 'var(--on-yellow)', color: 'var(--yellow)' }}>
          نزّل
        </button>
      )}
      <button type="button" onClick={dismiss} aria-label="إغلاق" className="flex-shrink-0 w-10 flex items-center justify-center active:opacity-60">
        <X size={16} strokeWidth={3} />
      </button>
    </div>
  );
}
