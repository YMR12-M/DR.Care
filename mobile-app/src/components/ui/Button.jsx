const VARIANT_STYLE = {
  primary: {
    background: 'linear-gradient(180deg, var(--yellow) 0%, var(--yellow-2) 100%)', color: '#0a0800', fontWeight: 900,
    boxShadow: '0 0 0 1px rgba(255,210,31,0.4), inset 0 -3px 0 rgba(0,0,0,0.2)',
  },
  secondary: {
    background: 'var(--panel-2)', color: 'var(--white-2)', fontWeight: 800,
    border: '1px solid var(--line)',
  },
  ghost: {
    background: 'transparent', color: 'var(--yellow)', fontWeight: 800,
  },
};

const SIZE_STYLE = {
  md: { padding: '0.85rem 1.25rem', fontSize: '0.875rem', borderRadius: 'var(--radius-lg)' },
  lg: { padding: '1rem 1.5rem', fontSize: '1rem', borderRadius: 'var(--radius-lg)' },
};

export default function Button({ variant = 'primary', size = 'lg', className = '', style, children, ...props }) {
  return (
    <button
      type="button"
      className={`active:scale-95 active:brightness-90 transition-all duration-150 disabled:opacity-50 ${className}`}
      style={{ ...VARIANT_STYLE[variant], ...SIZE_STYLE[size], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
