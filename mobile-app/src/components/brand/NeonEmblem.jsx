/* The DR.Care neon sign, redrawn as live SVG tubes from the logo: lemon frame with a gap for the
   shower pipe, cyan jets + droplets, magenta front-view car. `animate` flickers it on once and
   keeps the water flowing; static otherwise (small header use). */

export default function NeonEmblem({ size = 120, animate = false, className = '', style }) {
  const flow = animate ? 'neon-flow' : '';
  return (
    <svg
      viewBox="-8 -8 316 316" width={size} height={size}
      className={`${animate ? 'neon-on' : ''} ${className}`} style={{ overflow: 'visible', ...style }}
      role="img" aria-label="DR.Care" focusable="false"
    >
      <path className="tube tube-y" strokeWidth="6" d="M135 3 H4 V296 H46 M96 296 H297 V3 H152" />
      <path className="tube tube-y" strokeWidth="5" d="M124 30 H172 M148 3 V30" />
      <g className={`tube tube-c ${flow}`} strokeWidth="5">
        <path d="M132 42 L70 122" /><path d="M140 42 L108 118" /><path d="M148 42 L150 112" />
        <path d="M156 42 L192 118" /><path d="M164 42 L230 122" />
      </g>
      <g className="neon-dot">
        <circle cx="38" cy="66" r="8" /><circle cx="66" cy="92" r="7" /><circle cx="226" cy="52" r="8" />
        <circle cx="270" cy="46" r="7" /><circle cx="252" cy="98" r="7" /><circle cx="212" cy="74" r="6" />
      </g>
      <g className="tube tube-p" strokeWidth="6">
        <path d="M70 178 L92 128 Q96 120 106 120 H194 Q204 120 208 128 L230 178" />
        <path d="M98 170 L112 138 H188 L202 170" />
        <path strokeWidth="4" d="M118 166 L176 140 M136 168 L194 144" />
        <rect x="40" y="178" width="220" height="88" rx="22" />
        <path strokeWidth="5" d="M60 204 H100 L94 226 H62 Z M240 204 H200 L206 226 H238 Z" />
        <path strokeWidth="5" d="M96 246 H204 M110 258 H190" />
        <path strokeWidth="5" d="M48 266 V284 H84 V266 M216 266 V284 H252 V266" />
      </g>
    </svg>
  );
}
