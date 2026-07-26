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

export function CondoTower({ width = 90, className, style }: { width?: number; className?: string; style?: React.CSSProperties }) {
  // Private condo tower: slim body, protruding balcony ledges, roof garden.
  return (
    <svg viewBox="0 0 90 130" width={width} className={className} style={style} aria-hidden="true" {...S}>
      <rect x="28" y="16" width="36" height="104" rx="2" />
      {/* floors */}
      {[34, 52, 70, 88, 106].map((y) => <line key={y} x1="28" y1={y} x2="64" y2={y} />)}
      {/* balcony ledges, alternating sides */}
      {[40, 76].map((y) => <rect key={`l${y}`} x="20" y={y} width="8" height="8" />)}
      {[58, 94].map((y) => <rect key={`r${y}`} x="64" y={y} width="8" height="8" />)}
      {/* windows */}
      {[40, 58, 76, 94].map((y) => <line key={`w${y}`} x1="40" y1={y} x2="52" y2={y} />)}
      {/* roof garden */}
      <path d="M34 16 v-5 m8 5 v-8 m8 8 v-5 m8 5 v-7" />
      <line x1="20" y1="120" x2="72" y2="120" />
    </svg>
  );
}

export function TerraceRow({ width = 160, className, style }: { width?: number; className?: string; style?: React.CSSProperties }) {
  // Landed terrace row: three attached two-storey houses, pitched roofs.
  return (
    <svg viewBox="0 0 160 84" width={width} className={className} style={style} aria-hidden="true" {...S}>
      {[0, 46, 92].map((x) => (
        <g key={x}>
          <path d={`M${x + 8} 34 L${x + 31} 18 L${x + 54} 34`} />
          <line x1={x + 12} y1={31.5} x2={x + 12} y2={74} />
          <rect x={x + 20} y="42" width="11" height="9" />
          <rect x={x + 34} y="58" width="10" height="16" />
        </g>
      ))}
      <line x1="150" y1="31.5" x2="150" y2="74" />
      <line x1="4" y1="74" x2="156" y2="74" />
    </svg>
  );
}

export function MrtTrain({ width = 140, className, style }: { width?: number; className?: string; style?: React.CSSProperties }) {
  // MRT car: rounded body, door pair, windows, track beneath.
  return (
    <svg viewBox="0 0 140 62" width={width} className={className} style={style} aria-hidden="true" {...S}>
      <rect x="10" y="10" width="120" height="38" rx="10" />
      <rect x="58" y="18" width="10" height="30" />
      <rect x="72" y="18" width="10" height="30" />
      <rect x="20" y="18" width="26" height="12" rx="2" />
      <rect x="94" y="18" width="26" height="12" rx="2" />
      <line x1="4" y1="56" x2="136" y2="56" />
      <line x1="14" y1="52" x2="14" y2="56" />
      <line x1="126" y1="52" x2="126" y2="56" />
    </svg>
  );
}

export function SkylineStrip({ width = 420, className, style }: { width?: number; className?: string; style?: React.CSSProperties }) {
  // Wide skyline for dividers and band watermarks: HDB slab, MBS (three towers
  // + skypark), a supertree, CBD towers, shophouse row. One ground line.
  return (
    <svg viewBox="0 0 420 80" width={width} className={className} style={style} aria-hidden="true" {...S}>
      {/* HDB slab */}
      <rect x="10" y="34" width="52" height="38" rx="1.5" />
      {[42, 52, 62].map((y) => (
        <g key={y}>
          <line x1="16" y1={y} x2="24" y2={y} />
          <line x1="30" y1={y} x2="38" y2={y} />
          <line x1="44" y1={y} x2="52" y2={y} />
        </g>
      ))}
      {/* CBD towers */}
      <rect x="76" y="22" width="16" height="50" />
      <rect x="98" y="36" width="14" height="36" />
      {/* MBS: three towers + curved skypark */}
      <path d="M128 72 L134 30 L146 30 L150 72" />
      <path d="M158 72 L164 30 L176 30 L180 72" />
      <path d="M188 72 L194 30 L206 30 L210 72" />
      <path d="M122 28 Q168 14 216 28" />
      {/* supertree */}
      <line x1="238" y1="72" x2="238" y2="40" />
      <path d="M238 40 Q228 34 224 26 M238 40 Q234 30 233 22 M238 40 Q242 30 244 22 M238 40 Q248 34 252 26" />
      {/* more towers */}
      <rect x="268" y="28" width="15" height="44" />
      <rect x="289" y="42" width="13" height="30" />
      {/* shophouse pair */}
      <path d="M316 46 L331 36 L346 46" />
      <line x1="320" y1="44" x2="320" y2="72" />
      <line x1="342" y1="44" x2="342" y2="72" />
      <rect x="326" y="50" width="10" height="8" />
      <path d="M352 46 L367 36 L382 46" />
      <line x1="356" y1="44" x2="356" y2="72" />
      <line x1="378" y1="44" x2="378" y2="72" />
      <rect x="362" y="50" width="10" height="8" />
      {/* condo */}
      <rect x="394" y="30" width="16" height="42" rx="1.5" />
      <line x1="4" y1="72" x2="416" y2="72" />
    </svg>
  );
}
