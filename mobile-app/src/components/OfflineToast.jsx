import { useState, useEffect } from 'react';

export default function OfflineToast() {
  const [status, setStatus] = useState(null); // null | 'offline' | 'online'

  useEffect(() => {
    const handleOffline = () => setStatus('offline');
    const handleOnline  = () => {
      setStatus('online');
      setTimeout(() => setStatus(null), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
    };
  }, []);

  if (!status) return null;

  const isOffline = status === 'offline';

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-center gap-2 py-2 px-4 text-sm font-bold text-center"
      style={{
        background: isOffline ? 'rgba(240,83,62,0.95)' : 'rgba(111,207,71,0.95)',
        color: '#fff',
        backdropFilter: 'blur(12px)',
        paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
        animation: 'slideDown 0.25s ease',
      }}
    >
      {isOffline ? (
        <>
          <span>📵</span>
          <span>وضع عدم الاتصال</span>
        </>
      ) : (
        <>
          <span>✓</span>
          <span>تم استعادة الاتصال</span>
        </>
      )}
    </div>
  );
}
