/* ملاحظة: الظل وحده مش كفاية للإحساس بالارتفاع على خلفية سودة تقريباً (--black) —
   على شاشة حقيقية (خصوصاً OLED) الظل الأسود على خلفية سودة بيبقى غير مرئي تقريباً.
   الحدّ (border) هو الضمان الوحيد للفصل البصري بين الكارت والخلفية بغض النظر عن الإضاءة. */
const VARIANT_STYLE = {
  flat:     { background: 'var(--panel-2)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--line-2)' },
  elevated: { background: 'var(--panel-2)', boxShadow: 'var(--shadow-elevated)', border: '1px solid var(--line-2)' },
  yellow:   { background: 'var(--yellow-soft)', boxShadow: 'var(--shadow-yellow-glow)', border: '1px solid var(--yellow-line)' },
  premium:  {
    background: 'linear-gradient(165deg, var(--panel-3) 0%, var(--panel) 70%)',
    boxShadow: 'var(--shadow-premium)', border: '1px solid var(--line-2)',
  },
};

const VARIANT_CLASS = { premium: 'gold-rim' };

export default function Card({ as: Tag = 'div', variant = 'flat', className = '', style, children, ...props }) {
  return (
    <Tag
      className={`rounded-2xl ${VARIANT_CLASS[variant] || ''} ${className}`}
      style={{ ...VARIANT_STYLE[variant], ...style }}
      {...props}
    >
      {children}
    </Tag>
  );
}
