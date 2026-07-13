// Activity-over-time + rank-percentile visuals for the public agent page.
// Closes the last visual gap vs PropKaki/OpenAgent, on data we already hold
// (get_agent_activity_by_year + the stored AgentScore percentile). Pure inline
// SVG/CSS, server-rendered, unique per agent. Every number is from the CEA
// record; nothing is fabricated.

type YearRow = { year: string; sales: number; rentals: number; total: number };

export default function AgentActivityChart({
  activity,
  percentile,
  totalTxns,
  given,
}: {
  activity: YearRow[];
  percentile: number | null;
  totalTxns: number;
  given: string;
}) {
  const years = (activity ?? []).filter((y) => y.total > 0);
  const hasYears = years.length >= 2;
  // Lower percentile = better (1 = top of the market). Guard the range.
  const pct = percentile != null && percentile >= 1 && percentile <= 100 ? percentile : null;
  if (!hasYears && pct == null) return null;

  const maxTotal = Math.max(...years.map((y) => y.total), 1);

  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: "clamp(22px,2.6vw,30px)" }}>Activity over time</h2>
      <p className="muted small" style={{ margin: "6px 0 0" }}>{given}&apos;s recorded CEA transactions by year, sales and rentals.</p>

      <div className="fc-card fc-card--pad" style={{ marginTop: 16 }}>
        {hasYears && (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 180, marginTop: 4 }}>
              {years.map((y) => {
                const h = Math.max(Math.round((y.total / maxTotal) * 150), 4);
                const salesH = y.total > 0 ? Math.round((y.sales / y.total) * h) : 0;
                return (
                  <div key={y.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <span className="small" style={{ fontWeight: 600, color: "var(--ink)" }}>{y.total}</span>
                    <div title={`${y.year}: ${y.sales} sales, ${y.rentals} rentals`} style={{ width: "100%", maxWidth: 44, height: h, borderRadius: 5, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "var(--blue-wash)" }}>
                      {salesH > 0 && <div style={{ height: salesH, background: "var(--blue)" }} />}
                    </div>
                    <span className="small muted">{y.year}</span>
                  </div>
                );
              })}
            </div>
            <div className="fc-row" style={{ gap: 18, marginTop: 12, fontSize: 13 }}>
              <span className="fc-row" style={{ gap: 6, alignItems: "center" }}><span style={{ width: 11, height: 11, borderRadius: 3, background: "var(--blue)", display: "inline-block" }} /> Sales</span>
              <span className="fc-row" style={{ gap: 6, alignItems: "center" }}><span style={{ width: 11, height: 11, borderRadius: 3, background: "var(--blue-wash)", display: "inline-block" }} /> Rentals</span>
            </div>
          </>
        )}

        {pct != null && (
          <div style={{ marginTop: hasYears ? 20 : 0, borderTop: hasYears ? "1px solid var(--line)" : "none", paddingTop: hasYears ? 16 : 0 }}>
            <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Where {given} ranks</span>
              <span className="serif" style={{ fontSize: 20, fontWeight: 600, color: "var(--blue-deep)" }}>Top {pct}%</span>
            </div>
            {/* Marker sits at (100 - pct)% from the left: top agents land near the right. */}
            <div style={{ position: "relative", marginTop: 10, height: 10, borderRadius: 999, background: "var(--cloud)" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${100 - pct}%`, borderRadius: 999, background: "var(--blue)" }} />
              <div style={{ position: "absolute", left: `calc(${100 - pct}% - 6px)`, top: -3, width: 16, height: 16, borderRadius: 999, background: "#fff", border: "3px solid var(--blue-deep)" }} />
            </div>
            <p className="muted small" style={{ marginTop: 10 }}>
              Ranked by AgentScore across all scored CEA agents in Singapore, ahead of about {100 - pct}% of them. Based on {totalTxns.toLocaleString()} recorded transactions.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
