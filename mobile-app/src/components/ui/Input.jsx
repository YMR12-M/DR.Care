export default function Input({ icon: Icon, trailing, error, className = '', style, ...props }) {
  return (
    <div className={`relative ${className}`}>
      <input
        className={`input-premium rounded-2xl text-[0.95rem] ${error ? 'input-error' : ''}`}
        style={{
          paddingRight: Icon ? '3.1rem' : '1.3rem',
          paddingLeft: trailing ? '3.1rem' : '1.3rem',
          ...style,
        }}
        {...props}
      />
      {Icon && (
        <Icon size={19} className="absolute top-1/2 -translate-y-1/2 pointer-events-none" style={{ right: '1.15rem', color: 'var(--muted)' }} />
      )}
      {trailing && (
        <button
          type="button"
          onClick={trailing.onClick}
          className="absolute top-1/2 -translate-y-1/2 active:opacity-70"
          style={{ left: '1.15rem', color: 'var(--muted)' }}
        >
          <trailing.icon size={19} />
        </button>
      )}
    </div>
  );
}
