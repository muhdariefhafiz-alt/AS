// Shareable, screenshot-friendly visual summary of an agent's CEA record.
// Replaces "a wall of 60 rows" as the FIRST thing a visitor sees: a donut of
// the transaction-type mix plus the represented-side split. Pure inline SVG,
// no chart dependency, server-rendered. Data is the already-fetched
// get_agent_track_record aggregates (unique per agent), so this is dense,
// unique, high-dwell content, not boilerplate. The auditable row-by-row record
// still lives below in AgentTransactionRecord (collapsed).

type Counts = Record<string, number>;

// Brand-consistent segment palette (ink/blue system + warm accents).
const SEGMENT_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#64748b", "#0ea5e9"];

function labelType(k: string): string {
  const key = k.toUpperCase().replace(/[_\s]+/g, " ").trim();
  const map: Record<string, string> = {
    "RESALE": "Resale",
    "NEW SALE": "New sale",
    "SUB SALE": "Sub-sale",
    "WHOLE RENTAL": "Rental (whole)",
    "ROOM RENTAL": "Rental (room)",
    "RENTAL": "Rental",
  };
  return map[key] ?? key.toLowerCase().replace(/(^|\s)([a-z])/g, (_m, p, c) => p + c.toUpperCase());
}

function Donut({ segments, total }: { segments: { label: string; value: number; color: string }[]; total: number }) {
  const R = 54;
  const STROKE = 22;
  const C = 2 * Math.PI * R;
  // Pure offset computation (no mutation during render): each arc's start is the
  // sum of the preceding arc lengths.
  const lens = segments.map((s) => (total > 0 ? (s.value / total) * C : 0));
  const offsets = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="Transaction type mix" style={{ flexShrink: 0 }}>
      <g transform="rotate(-90 70 70)">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--line)" strokeWidth={STROKE} />
        {segments.map((s, i) => (
          <circle
            key={s.label}
            cx="70" cy="70" r={R} fill="none"
            stroke={s.color} strokeWidth={STROKE}
            strokeDasharray={`${lens[i]} ${C - lens[i]}`}
            strokeDashoffset={-offsets[i]}
          />
        ))}
      </g>
      <text x="70" y="66" textAnchor="middle" style={{ fontSize: 26, fontWeight: 700, fill: "var(--ink)" }}>{total.toLocaleString()}</text>
      <text x="70" y="84" textAnchor="middle" style={{ fontSize: 11, fill: "var(--slate)", letterSpacing: 0.4 }}>DEALS</text>
    </svg>
  );
}

function SplitBar({ title, left, right }: { title: string; left: { label: string; value: number }; right: { label: string; value: number } }) {
  const tot = left.value + right.value;
  if (tot === 0) return null;
  const lpct = Math.round((left.value / tot) * 100);
  return (
    <div style={{ marginTop: 14 }}>
      <div className="fc-row" style={{ justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ fontWeight: 600, color: "var(--blue-deep)" }}>{left.label} · {left.value} ({lpct}%)</span>
        <span className="muted">{right.label} · {right.value}</span>
      </div>
      <div style={{ marginTop: 5, height: 9, borderRadius: 999, background: "var(--emerald-wash, #d1fae5)", overflow: "hidden" }}>
        <div style={{ width: `${lpct}%`, height: "100%", background: "var(--blue)" }} />
      </div>
      <div className="muted small" style={{ marginTop: 4 }}>{title}</div>
    </div>
  );
}

export default function AgentDealBreakdown({
  transactionTypes,
  representedRoles,
  total,
  given,
}: {
  transactionTypes: Counts;
  representedRoles: Counts;
  total: number;
  given: string;
}) {
  const entries = Object.entries(transactionTypes || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (entries.length === 0 || total === 0) return null;

  const segments = entries.map(([k, v], i) => ({ label: labelType(k), value: v, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }));

  const roles = representedRoles || {};
  const seller = roles["SELLER"] ?? 0;
  const buyer = roles["BUYER"] ?? 0;
  const landlord = roles["LANDLORD"] ?? 0;
  const tenant = roles["TENANT"] ?? 0;

  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: "clamp(22px,2.6vw,30px)" }}>Deal breakdown</h2>
      <p className="muted small" style={{ margin: "6px 0 0" }}>{given}&apos;s {total.toLocaleString()} CEA-recorded transactions at a glance.</p>

      <div className="fc-card fc-card--pad" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "center" }}>
          <Donut segments={segments} total={total} />
          <div style={{ flex: 1, minWidth: 220 }}>
            {segments.map((s) => {
              const pct = Math.round((s.value / total) * 100);
              return (
                <div key={s.label} className="fc-row" style={{ justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 14 }}>
                  <span className="fc-row" style={{ gap: 8, alignItems: "center" }}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, display: "inline-block" }} />
                    {s.label}
                  </span>
                  <span style={{ fontWeight: 600 }}>{s.value.toLocaleString()} <span className="muted" style={{ fontWeight: 400 }}>({pct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>

        {(seller + buyer > 0 || landlord + tenant > 0) && (
          <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 6 }}>
            <SplitBar title="Which side of a sale they usually represent" left={{ label: "Seller", value: seller }} right={{ label: "Buyer", value: buyer }} />
            <SplitBar title="Which side of a rental they usually represent" left={{ label: "Landlord", value: landlord }} right={{ label: "Tenant", value: tenant }} />
          </div>
        )}
      </div>
    </section>
  );
}
