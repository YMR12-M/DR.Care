import { useId } from 'react';
import { FOAM_BLOBS, FOAM_DRIPS, BUBBLES, WHEELS } from './heroSceneData';

/* The wash bay: tiled wall, shower rail, a foam-covered sedan, spinning rims and the hazard
   speed-bump on the floor. Pure SVG — replaces the stock photo / Vite placeholder. */

const S = 1.95, OX = 43.3, OY = 101.35;           // sedan path → scene transform
const NOZZLES = [62, 121, 180, 239, 298, 350];

/* `top` adds extra tiled wall above the rail (room for the headline); `bottom` adds extra floor
   below the hazard bump (room for the call-to-action). Everything else keeps scene coordinates. */
export default function HeroScene({ className = '', style, animate = true, top = 0, bottom = 0 }) {
  const uid = useId().replace(/:/g, '');
  const a = animate ? '' : ' hs-still';
  const H = 300 + top + bottom;
  return (
    <svg
      viewBox={`0 0 390 ${H}`} className={className} style={style}
      preserveAspectRatio="xMidYMax meet" role="img"
      aria-label="سيارة بتتغسل بالرغوة تحت رشاشات المياه"
    >
      <defs>
        <pattern id={`${uid}t`} width="64" height="44" patternUnits="userSpaceOnUse">
          <rect width="64" height="44" fill="#0f1215" />
          <rect x="1.5" y="1.5" width="61" height="19" rx="2" fill="#161a1f" />
          <rect x="-30.5" y="23.5" width="61" height="19" rx="2" fill="#161a1f" />
          <rect x="33.5" y="23.5" width="61" height="19" rx="2" fill="#161a1f" />
        </pattern>
        <radialGradient id={`${uid}w`} cx="50%" cy="0%" r="75%">
          <stop offset="0" stopColor="#46c9e7" stopOpacity=".16" /><stop offset="1" stopColor="#46c9e7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#181b20" /><stop offset="1" stopColor="#0d0f12" />
        </linearGradient>
      </defs>

      <rect width="390" height={H} fill={`url(#${uid}t)`} />
      <g transform={`translate(0 ${top})`}>
      <rect y={-top} width="390" height={H} fill={`url(#${uid}w)`} />

      {/* floor + hazard bump */}
      <rect y="232" width="390" height={68 + bottom} fill={`url(#${uid}f)`} />
      <rect y="232" width="390" height="3" fill="#2a2e35" />
      <g transform="translate(0 262)">
        <rect width="390" height="12" fill="#ffd21f" />
        <g fill="#111214">{Array.from({ length: 21 }, (_, i) => <path key={i} d={`M${i * 20 - 6} 12 L${i * 20 + 4} 0 H${i * 20 + 14} L${i * 20 + 4} 12 Z`} />)}</g>
      </g>

      {/* shower rail + jets */}
      <rect x="22" y="22" width="346" height="7" rx="3" fill="#3a3f48" />
      <rect x="22" y="22" width="346" height="2" rx="1" fill="#555c68" />
      {NOZZLES.map(x => <rect key={x} x={x - 5} y="29" width="10" height="8" rx="2" fill="#9aa1ac" />)}
      <g stroke="#46c9e7" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".9">
        {NOZZLES.map((x, i) => (
          <g key={x}>
            <path className={`hs-jet${a}`} d={`M${x - 3} 40 L${x - 16} 124`} style={{ animationDelay: `${(i * 0.17).toFixed(2)}s` }} />
            <path className={`hs-jet${a}`} d={`M${x} 40 L${x} 118`} style={{ animationDelay: `${(i * 0.11 + 0.2).toFixed(2)}s` }} />
            <path className={`hs-jet${a}`} d={`M${x + 3} 40 L${x + 16} 124`} style={{ animationDelay: `${(i * 0.23 + 0.4).toFixed(2)}s` }} />
          </g>
        ))}
      </g>

      {/* the car */}
      <g transform={`translate(${OX} ${OY}) scale(${S})`}>
        <path fill="#3a414b" d="M6 52 V44 Q6 38 14 36 L38 32 L54 15 Q57 12 62 12 H100 Q106 12 110 16 L124 32 L146 35 Q154 37 154 44 V52 Q154 56 150 56 H10 Q6 56 6 52 Z" />
        <path fill="#2b3037" d="M6 46 H154 V52 Q154 56 150 56 H10 Q6 56 6 52 Z" />
        <path fill="none" stroke="#566070" strokeWidth="1" d="M14 37 L38 33 L54 16 M110 17 L124 33 L146 36" />
        <path fill="#12151a" d="M48 31 L60 16 H78 V31 Z M84 31 V16 H100 Q103 16 105 18 L116 31 Z" />
        <path fill="#46c9e7" opacity=".16" d="M52 31 L62 18 H67 L57 31 Z M88 31 V18 H92 V31 Z" />
        <path stroke="#232830" strokeWidth="1" d="M81 31 V52 M120 34 V52" />
        <rect x="73" y="36" width="6" height="1.8" rx=".9" fill="#7c8592" /><rect x="95" y="36" width="6" height="1.8" rx=".9" fill="#7c8592" />
        <path fill="#fff4c4" d="M7 41 Q7 38 11 37.4 L20 36.4 L18 41.4 Z" />
        <path fill="#ff5a4d" d="M152 40 Q153 38.5 151 37.5 L146 36.6 L146.8 41.4 Z" />
        <circle cx="38" cy="56" r="14.5" fill="#0d0f12" /><circle cx="122" cy="56" r="14.5" fill="#0d0f12" />
      </g>

      {WHEELS.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r="21.5" fill="#15181c" stroke="#30353d" strokeWidth="1.6" /><circle r="17" fill="#23272e" />
          <g className={`hs-spin${a}`}>
            <circle r="11" fill="#7f8895" /><circle r="11" fill="none" stroke="#2a2e35" strokeWidth="1.2" />
            {[0, 72, 144, 216, 288].map(deg => <rect key={deg} x="-1.4" y="-10" width="2.8" height="8" rx="1.2" fill="#2f343c" transform={`rotate(${deg})`} />)}
            <circle r="3" fill="#2f343c" />
          </g>
        </g>
      ))}

      {/* foam */}
      <g fill="#f3f0e6">
        {FOAM_DRIPS.map(([x, y, w, h], i) => <rect key={i} x={+(x - w / 2).toFixed(1)} y={y} width={w} height={h} rx={+(w / 2).toFixed(1)} />)}
        {FOAM_BLOBS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
      </g>
      <g fill="#fff" opacity=".55">
        {FOAM_BLOBS.slice(0, 18).map(([x, y, r], i) => <circle key={i} cx={+(x - r * 0.25).toFixed(1)} cy={+(y - r * 0.3).toFixed(1)} r={+(r * 0.28).toFixed(1)} />)}
      </g>

      {/* bubbles */}
      <g fill="none" stroke="#f3f0e6" strokeWidth="1.4" opacity=".8">
        {BUBBLES.map(([x, y, r, d, t], i) => (
          <circle key={i} className={`hs-bub${a}`} cx={x} cy={y} r={r} style={{ animationDelay: `${d}s`, animationDuration: `${t}s` }} />
        ))}
      </g>

      <g stroke="#46c9e7" strokeOpacity=".25" strokeWidth="1.5" strokeLinecap="round"><path d="M40 246 H120 M160 250 H260 M290 245 H350" /></g>
      </g>
    </svg>
  );
}
