/* Tab-bar glyphs drawn on a 28-grid with one stroke weight — the wash bay's own pictograms
   (garage, ticket, receipt, steering wheel) instead of a stock icon set. */

const base = { viewBox: '0 0 28 28', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false' };

export const GarageGlyph = ({ size = 26 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M3 12.5 14 4l11 8.5V24H3Z" />
    <path d="M8 24V15.5h12V24M8 19h12" />
  </svg>
);

export const TicketGlyph = ({ size = 26 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M4 7h20a1 1 0 0 1 1 1v4a2.5 2.5 0 0 0 0 5v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2.5 2.5 0 0 0 0-5V8a1 1 0 0 1 1-1Z" />
    <path d="M10 9v2.5M10 15v2.5" />
  </svg>
);

export const ReceiptGlyph = ({ size = 26 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M6 3h16v22l-2.7-2-2.65 2-2.65-2-2.65 2-2.65-2L6 25Z" />
    <path d="M10 9h8M10 13h8M10 17h5" />
  </svg>
);

export const WheelGlyph = ({ size = 26 }) => (
  <svg {...base} width={size} height={size}>
    <circle cx="14" cy="14" r="10.5" />
    <circle cx="14" cy="14" r="2.6" />
    <path d="M3.8 12.4 11.4 13M24.2 12.4 16.6 13M14 16.6V24.4" />
  </svg>
);
