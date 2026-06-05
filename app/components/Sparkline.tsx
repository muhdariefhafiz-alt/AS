/**
 * Tiny inline SVG sparkline. Zero-dependency, server-renderable.
 * Usage: <Sparkline values={[3,4,2,7,5]} height={28} width={100} color="#1f44ff" />
 */
export function Sparkline({
  values,
  width = 120,
  height = 32,
  color = "#1f44ff",
  fill = true,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}) {
  if (!values || values.length === 0) {
    return (
      <svg width={width} height={height} aria-hidden>
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#e5e7eb" strokeWidth={1} />
      </svg>
    );
  }
  const max = Math.max(1, ...values);
  const step = width / Math.max(1, values.length - 1);
  const pad = 2;
  const innerH = height - pad * 2;
  const pts = values.map((v, i) => ({ x: i * step, y: pad + innerH - (v / max) * innerH }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = fill ? `${line} L${(values.length - 1) * step},${height} L0,${height} Z` : null;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {area && <path d={area} fill={color} fillOpacity={0.1} stroke="none" />}
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={2} fill={color} />
    </svg>
  );
}
