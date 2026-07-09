const SIZE_PX = { sm: 36, md: 44, lg: 56 };
const ICON_SIZE = { sm: 18, md: 22, lg: 26 };

export default function IconBadge({ icon: Icon, size = 'md', tone = 'yellow', className = '' }) {
  const px = SIZE_PX[size];
  const toneStyle = tone === 'yellow'
    ? {
        background: 'linear-gradient(155deg, rgba(255,210,31,0.16) 0%, rgba(255,210,31,0.06) 100%)',
        border: '1px solid var(--yellow-line)',
        color: 'var(--yellow)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      }
    : {
        background: 'linear-gradient(155deg, var(--panel-4) 0%, var(--panel-3) 100%)',
        border: '1px solid var(--line-2)',
        color: 'var(--white-2)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      };

  return (
    <div
      className={`flex items-center justify-center rounded-2xl flex-shrink-0 ${className}`}
      style={{ width: px, height: px, ...toneStyle }}
    >
      <Icon size={ICON_SIZE[size]} strokeWidth={2.2} />
    </div>
  );
}
