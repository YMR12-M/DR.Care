/* Section title the way a wash-bay sign would carry it: a hazard block, a big painted headline,
   and an optional small label — no tracked-out English eyebrow. */
export default function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between mb-4 gap-3">
      <div className="flex items-stretch gap-3 min-w-0">
        <span className="hazard flex-shrink-0" style={{ width: 8, height: 'auto', alignSelf: 'stretch', minHeight: 30, borderRadius: 2 }} aria-hidden="true" />
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-bold mb-0.5" style={{ color: 'var(--muted)' }}>{eyebrow}</p>}
          {title && <h2 className="font-display text-[1.7rem] leading-none" style={{ color: 'var(--white)' }}>{title}</h2>}
        </div>
      </div>
      {action}
    </div>
  );
}
