export default function Input({ icon: Icon, trailing, error, className = '', style, ...props }) {
  return (
    <div className={`relative ${className}`}>
      <input
        className={`input-premium text-[0.95rem] ${error ? 'input-error' : ''}`}
        style={{
          paddingRight: Icon ? '3rem' : '1.1rem',
          paddingLeft: trailing ? '3rem' : '1.1rem',
          ...style,
        }}
        {...props}
      />
      {Icon && (
        <Icon size={18} className="absolute top-1/2 -translate-y-1/2 pointer-events-none" style={{ right: '1.05rem', color: 'var(--muted)' }} />
      )}
      {trailing && (
        <button
          type="button"
          onClick={trailing.onClick}
          className="absolute top-1/2 -translate-y-1/2 active:opacity-70"
          style={{ left: '1.05rem', color: 'var(--muted)' }}
        >
          <trailing.icon size={18} />
        </button>
      )}
    </div>
  );
}
