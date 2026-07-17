const VARIANT_STYLE = {
  primary: {
    background: 'var(--gradient-gold)', color: '#0a0800', fontWeight: 900,
    boxShadow: '0 0 0 1px rgba(255,210,31,0.5), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.25), var(--shadow-gold-premium)',
  },
  secondary: {
    background: 'linear-gradient(160deg, var(--panel-3) 0%, var(--panel-2) 100%)', color: 'var(--white-2)', fontWeight: 800,
    border: '1px solid var(--line-2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  ghost: {
    background: 'transparent', color: 'var(--yellow)', fontWeight: 800,
  },
};

const SIZE_STYLE = {
  md: { padding: '0.85rem 1.25rem', fontSize: '0.875rem', borderRadius: '9999px' },
  lg: { padding: '1rem 1.5rem', fontSize: '1rem', borderRadius: '9999px' },
};

export default function Button({ variant = 'primary', size = 'lg', className = '', style, children, ...props }) {
  return (
    <button
      type="button"
      className={`active:scale-95 active:brightness-90 transition-all duration-150 disabled:opacity-50 ${variant === 'primary' ? 'btn-shine' : ''} ${className}`}
      style={{ ...VARIANT_STYLE[variant], ...SIZE_STYLE[size], ...style }}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}
