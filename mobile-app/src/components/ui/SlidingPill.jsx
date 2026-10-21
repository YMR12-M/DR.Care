import { useRef, useState, useLayoutEffect } from 'react';

/* Selection marker that slides between items (used by pickers with a few options). */
export default function SlidingPill({ items, active, onChange, renderItem, trackStyle = {} }) {
  const refs = useRef({});
  const [pill, setPill] = useState({ left: 0, width: 0, top: 0, height: 0 });

  useLayoutEffect(() => {
    const el = refs.current[active];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth, top: el.offsetTop, height: el.offsetHeight });
  }, [active, items]);

  return (
    <div className="relative flex items-center" style={trackStyle}>
      <div
        className="pill-slide absolute"
        style={{ left: pill.left, width: pill.width, top: pill.top, height: pill.height, background: 'var(--yellow)', borderRadius: 6 }}
      />
      {items.map(it => (
        <button
          key={it.code}
          ref={el => (refs.current[it.code] = el)}
          type="button"
          onClick={() => onChange(it.code)}
          className="relative z-10 flex-1"
        >
          {renderItem(it, it.code === active)}
        </button>
      ))}
    </div>
  );
}
