/* Side-view silhouettes of the four vehicle types the wash prices by.
   All face LEFT (the direction of travel on the wash line in RTL).
   Body takes `currentColor`; glass and tyres are fixed dark so the shape reads on yellow or paper. */

const GLASS = '#14161a';
const HUB = '#8a8f98';

const Wheel = ({ cx, cy = 56, r = 11 }) => (
  <>
    <circle cx={cx} cy={cy} r={r} fill={GLASS} />
    <circle cx={cx} cy={cy} r={r * 0.46} fill={HUB} />
  </>
);

const SHAPES = {
  sedan: (
    <>
      <path fill="currentColor" d="M6 52 V44 Q6 38 14 36 L38 32 L54 15 Q57 12 62 12 H100 Q106 12 110 16 L124 32 L146 35 Q154 37 154 44 V52 Q154 56 150 56 H10 Q6 56 6 52 Z" />
      <path fill={GLASS} d="M48 31 L60 16 H78 V31 Z M84 31 V16 H100 Q103 16 105 18 L116 31 Z" />
      <Wheel cx={38} /><Wheel cx={122} />
    </>
  ),
  suv: (
    <>
      <path fill="currentColor" d="M5 54 V40 Q5 34 12 33 L30 30 L40 14 Q43 8 49 8 H112 Q118 8 121 13 L130 30 L148 33 Q155 35 155 42 V54 Q155 58 151 58 H9 Q5 58 5 54 Z" />
      <path fill={GLASS} d="M45 29 L52 14 H72 V29 Z M78 29 V14 H108 Q111 14 112 16 L119 29 Z" />
      <Wheel cx={38} cy={58} r={12} /><Wheel cx={124} cy={58} r={12} />
    </>
  ),
  van: (
    <>
      <path fill="currentColor" d="M4 54 V36 Q4 30 12 28 L34 22 L46 8 Q49 5 54 5 H140 Q154 5 154 18 V54 Q154 58 150 58 H8 Q4 58 4 54 Z" />
      <path fill={GLASS} d="M43 21 L51 10 H70 V21 Z M76 21 V10 H92 V21 Z M98 21 V10 H114 V21 Z M120 21 V10 H138 Q140 10 140 12 V21 Z" />
      <path stroke={GLASS} strokeWidth="2" d="M96 24 V56" />
      <Wheel cx={36} cy={58} /><Wheel cx={124} cy={58} />
    </>
  ),
  pickup: (
    <>
      <path fill="currentColor" d="M5 54 V40 Q5 34 12 33 L36 30 L48 14 Q51 10 56 10 H86 Q91 10 92 15 V34 H150 Q155 34 155 40 V54 Q155 58 151 58 H9 Q5 58 5 54 Z" />
      <path fill={GLASS} d="M52 29 L60 15 H84 V29 Z" />
      <path stroke={GLASS} strokeWidth="2.5" fill="none" d="M96 34 V26 H152" />
      <Wheel cx={38} cy={58} /><Wheel cx={124} cy={58} />
    </>
  ),
};

export default function CarArt({ type = 'sedan', className = '', style, title }) {
  return (
    <svg viewBox="0 0 160 70" className={className} style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      {SHAPES[type] || SHAPES.sedan}
    </svg>
  );
}
