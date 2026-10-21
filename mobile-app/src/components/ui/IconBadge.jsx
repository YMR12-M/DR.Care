const SIZE_PX = { sm: 36, md: 44, lg: 56 };
const ICON_SIZE = { sm: 18, md: 22, lg: 26 };

/* A square sign-plate that holds a glyph: yellow = lit/active, panel = idle. No gradient, no glow. */
export default function IconBadge({ icon: Icon, size = 'md', tone = 'yellow', className = '' }) {
  const px = SIZE_PX[size];
  const toneStyle = tone === 'yellow'
    ? { background: 'var(--yellow)', color: 'var(--on-yellow)' }
    : { background: 'var(--panel-3)', color: 'var(--white-2)' };

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: px, height: px, borderRadius: 8, ...toneStyle }}
    >
      <Icon size={ICON_SIZE[size]} strokeWidth={2.4} />
    </div>
  );
}
