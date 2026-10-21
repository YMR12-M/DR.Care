/* Panels are painted steel plates, not floating glass: flat fill, 2px edge, hard shadow at most. */
const VARIANT_STYLE = {
  flat:     { background: 'var(--panel-2)', border: '2px solid var(--line-2)' },
  elevated: { background: 'var(--panel-2)', border: '2px solid var(--steel)', boxShadow: '0 4px 0 rgba(0,0,0,0.45)' },
  yellow:   { background: 'var(--yellow-soft)', border: '2px solid var(--yellow-line)' },
  premium:  { background: '#0a0b0d', border: '2px solid var(--steel)', boxShadow: '0 4px 0 rgba(0,0,0,0.45)' },
};

export default function Card({ as: Tag = 'div', variant = 'flat', className = '', style, children, ...props }) {
  return (
    <Tag className={className} style={{ borderRadius: 10, ...VARIANT_STYLE[variant], ...style }} {...props}>
      {children}
    </Tag>
  );
}
