export default function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div
      className={`relative flex p-[3px] ${className}`}
      style={{ background: 'var(--panel-2)', border: '2px solid var(--line-2)', borderRadius: 9 }}
      role="tablist"
    >
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className="flex-1 py-2.5 text-[0.95rem] font-bold active:scale-[0.98] transition-colors duration-100"
            style={{
              borderRadius: 6,
              background: active ? 'var(--yellow)' : 'transparent',
              color: active ? 'var(--on-yellow)' : 'var(--muted)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
