import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

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
      role="status"
      className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-center gap-2 py-2 px-4 text-sm font-bold text-center"
      style={{
        background: isOffline ? 'var(--error)' : 'var(--success)',
        color: 'var(--on-yellow)',
        paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
        borderBottom: '3px solid var(--on-yellow)',
        animation: 'slideDown 0.25s ease',
      }}
    >
      {isOffline ? <WifiOff size={16} strokeWidth={2.6} /> : <Wifi size={16} strokeWidth={2.6} />}
      <span>{isOffline ? 'مفيش اتصال بالإنترنت' : 'النت رجع'}</span>
    </div>
  );
}
