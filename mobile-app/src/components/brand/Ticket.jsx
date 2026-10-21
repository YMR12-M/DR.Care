import { barcodeBars } from '../../lib/format';

/* Deterministic barcode (same booking id → same bars) — purely decorative. */
export function Barcode({ seed = 1, height = 34, className = '' }) {
  const bars = barcodeBars(seed);
  let x = 0;
  const rects = bars.map((b, i) => {
    const r = <rect key={i} x={x} y="0" width={b.w} height="100" />;
    x += b.w + b.gap;
    return r;
  });
  return (
    <svg viewBox={`0 0 ${x} 100`} preserveAspectRatio="none" height={height} width="100%" className={className} fill="currentColor" aria-hidden="true">
      {rects}
    </svg>
  );
}

/* A paper wash ticket: notched sides, tear-off stub. `children` is the printed body; the stub
   defaults to a barcode. `print` plays the slide-out-of-the-machine animation once. */
export default function Ticket({ children, stub, seed, print = false, className = '', style }) {
  return (
    <div className={`ticket ${print ? 'ticket--print' : ''} ${className}`} style={style}>
      <div className="ticket__main">{children}</div>
      <div className="ticket__stub">{stub ?? <Barcode seed={seed} />}</div>
    </div>
  );
}

/* One labelled field on a ticket */
export function TicketField({ label, children, align = 'start', big = false }) {
  return (
    <div style={{ textAlign: align, minWidth: 0 }}>
      <div className="ticket__k">{label}</div>
      <div className={big ? 'ticket__v ticket__v--big' : 'ticket__v'}>{children}</div>
    </div>
  );
}
