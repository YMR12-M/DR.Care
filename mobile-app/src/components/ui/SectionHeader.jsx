export default function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-black tracking-[0.18em] mb-1.5" style={{ color: 'var(--yellow)' }}>
            {eyebrow}
          </p>
        )}
        {title && (
          <h2 className="text-xl font-black leading-tight" style={{ color: 'var(--white)' }}>
            {title}
          </h2>
        )}
      </div>
      {action}
    </div>
  );
}
