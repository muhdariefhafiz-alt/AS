// Singapore line-art set: thin-stroke outline drawings for scene whitespace,
// echoing housapp's house doodles but unmistakably local (HDB slab block,
// shophouse row, key, calendar). All stroke-only, currentColor, so they tint
// via .fc-lineart (light on paper, faint white inside ink scenes). Decorative:
// aria-hidden, never load-bearing content.

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HdbBlock({ width = 150, className, style }: { width?: number; className?: string; style?: React.CSSProperties }) {
  // Classic HDB slab block: long body, window grid, void-deck columns.
  return (
    <svg viewBox="0 0 150 110" width={width} className={className} style={style} aria-hidden="true" {...S}>
      <rect x="10" y="14" width="130" height="72" rx="2" />
      {/* window grid: 3 floors x 6 bays */}
      {[26, 44, 62].map((y) =>
        [20, 40, 60, 80, 100, 120].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="12" height="9" />)
      )}
      {/* void deck columns */}
      {[24, 52, 80, 108, 132].map((x) => <line key={x} x1={x} y1="86" x2={x} y2="100" />)}
      <line x1="4" y1="100" x2="146" y2="100" />
      {/* rooftop water tank */}
      <rect x="112" y="6" width="18" height="8" rx="2" />
    </svg>
  );
}

export function Shophouse({ width = 130, className, style }: { width?: number; className?: string; style?: React.CSSProperties }) {
  // Conservation shophouse: pitched tiled roof, shuttered windows, five-foot way.
  return (
    <svg viewBox="0 0 130 100" width={width} className={className} style={style} aria-hidden="true" {...S}>
      <path d="M12 34 L65 12 L118 34" />
      <line x1="20" y1="31" x2="20" y2="90" />
      <line x1="110" y1="31" x2="110" y2="90" />
      {/* shuttered windows */}
      <rect x="34" y="40" width="14" height="20" />
      <line x1="41" y1="40" x2="41" y2="60" />
      <rect x="58" y="40" width="14" height="20" />
      <line x1="65" y1="40" x2="65" y2="60" />
      <rect x="82" y="40" width="14" height="20" />
      <line x1="89" y1="40" x2="89" y2="60" />
      {/* five-foot-way arches */}
      <path d="M34 90 v-14 a8 8 0 0 1 16 0 v14" />
      <path d="M58 90 v-14 a8 8 0 0 1 16 0 v14" />
      <line x1="8" y1="90" x2="122" y2="90" />
    </svg>
  );
}

export function KeyLine({ width = 70, className, style }: { width?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 70 34" width={width} className={className} style={style} aria-hidden="true" {...S}>
      <circle cx="14" cy="17" r="9" />
      <line x1="23" y1="17" x2="62" y2="17" />
      <line x1="50" y1="17" x2="50" y2="25" />
      <line x1="60" y1="17" x2="60" y2="23" />
    </svg>
  );
}

export function CalendarLine({ width = 64, className, style }: { width?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 60" width={width} className={className} style={style} aria-hidden="true" {...S}>
      <rect x="6" y="10" width="52" height="44" rx="4" />
      <line x1="6" y1="24" x2="58" y2="24" />
      <line x1="20" y1="4" x2="20" y2="14" />
      <line x1="44" y1="4" x2="44" y2="14" />
      <path d="M24 40 l6 6 L42 32" />
    </svg>
  );
}
