export default function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div
      className={`relative flex rounded-full p-1 ${className}`}
      style={{ background: 'var(--panel-3)', border: '1px solid var(--line-2)' }}
    >
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex-1 rounded-full py-2.5 text-sm font-black transition-all duration-200 active:scale-95"
            style={{
              background: active ? 'var(--gradient-gold)' : 'transparent',
              color: active ? '#0a0800' : 'var(--muted)',
              boxShadow: active ? '0 2px 12px rgba(255,210,31,0.3), inset 0 1px 0 rgba(255,255,255,0.35)' : 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
