import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

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
      className="fixed left-4 right-4 z-[9997] rounded-2xl p-4 flex items-center gap-3 fade-in"
      style={{
        bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(165deg, var(--panel-3) 0%, var(--panel) 100%)',
        border: '1px solid var(--yellow-line)',
        boxShadow: 'var(--shadow-premium)',
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--gradient-gold-soft)', border: '1px solid var(--yellow-line)' }}
      >
        <Download size={20} style={{ color: 'var(--yellow)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black" style={{ color: 'var(--white)' }}>نزّل تطبيق DR.Care</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          {iosHint ? 'دوس على مشاركة ⬆️ ثم "إضافة إلى الشاشة الرئيسية"' : 'وصول أسرع من شاشتك الرئيسية'}
        </p>
      </div>
      {!iosHint && (
        <button type="button" onClick={install}
          className="text-xs font-black px-3.5 py-2 rounded-xl flex-shrink-0 active:scale-95 transition-transform"
          style={{ background: 'var(--gradient-gold)', color: '#0a0800' }}>
          تنزيل
        </button>
      )}
      <button type="button" onClick={dismiss} aria-label="إغلاق"
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
        style={{ background: 'var(--panel-4)', color: 'var(--muted)' }}>
        <X size={13} />
      </button>
    </div>
  );
}
