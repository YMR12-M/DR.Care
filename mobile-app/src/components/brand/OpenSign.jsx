import { useEffect, useState } from 'react';
import { isOpenNow } from '../../lib/format';

/* A neon "open" sign that is actually honest: it lights up only between 12:00 and 22:00
   (Cairo time) and tells you when the doors open again when it's dark. */
export default function OpenSign({ className = '' }) {
  const [open, setOpen] = useState(() => isOpenNow());
  useEffect(() => {
    const t = setInterval(() => setOpen(isOpenNow()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={`opensign ${open ? 'is-open' : ''} ${className}`} role="status">
      <span className="opensign__word">{open ? 'مفتوح' : 'مقفول'}</span>
      <span className="opensign__sub">{open ? 'لحد 10 بالليل' : 'بنفتح 12 الضهر'}</span>
    </div>
  );
}
