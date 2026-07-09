const VARIANT_STYLE = {
  flat:     { background: 'var(--panel-2)', boxShadow: 'var(--shadow-card)' },
  elevated: { background: 'var(--panel-2)', boxShadow: 'var(--shadow-elevated)' },
  yellow:   { background: 'var(--yellow-soft)', boxShadow: 'var(--shadow-yellow-glow)', border: '1px solid var(--yellow-line)' },
};

export default function Card({ as: Tag = 'div', variant = 'flat', className = '', style, children, ...props }) {
  return (
    <Tag
      className={`rounded-2xl ${className}`}
      style={{ ...VARIANT_STYLE[variant], ...style }}
      {...props}
    >
      {children}
    </Tag>
  );
}
