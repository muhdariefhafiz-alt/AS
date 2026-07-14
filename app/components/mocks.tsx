import { MOCKUP_STYLE, MockChrome, MOCK } from "./ProductBox";

// Shared product-mockup creatives for ProductBox, reused across user- and
// agent-facing surfaces. Pure-JSX, clearly illustrative UI states (same standard
// as DashboardPreview), never claims about a real named person: agent rows are
// anonymised (score + area + counts), so nothing reads as a real individual.

const shell: React.CSSProperties = { ...MOCKUP_STYLE, pointerEvents: "none", userSelect: "none" };

// Seller compare + invite: the core seller experience (homepage, /sell,
// /property-agents).
export function SellerCompareMock() {
  const rows: [string, string, string][] = [
    ["1", "92", "Tampines · 41 recent sales"],
    ["2", "88", "Tampines · 33 recent sales"],
    ["3", "85", "Tampines · 27 recent sales"],
  ];
  return (
    <div aria-hidden="true" style={shell}>
      <MockChrome />
      <div style={{ padding: "14px 15px 16px" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: MOCK.label }}>AGENTS IN TAMPINES</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>Ranked on real transactions</div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {rows.map(([pos, score, sub], i) => (
            <div key={pos} style={{ display: "flex", alignItems: "center", gap: 10, background: MOCK.panel, borderRadius: 9, padding: "9px 11px" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: MOCK.faint, width: 14 }}>{pos}</span>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: MOCK.pillBg, color: MOCK.pillText, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{score}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 600 }}>AgentScore {score}</span>
                <span style={{ display: "block", fontSize: 10.5, color: MOCK.faint }}>{sub}</span>
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? "#fff" : MOCK.pillText, background: i === 0 ? "var(--blue)" : MOCK.pillBg, borderRadius: 999, padding: "4px 10px" }}>Invite</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Automatic valuation: an evidence-backed value range (/tools/valuation, /sell).
export function ValuationMock() {
  return (
    <div aria-hidden="true" style={shell}>
      <MockChrome />
      <div style={{ padding: "16px 15px 18px" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: MOCK.label, textAlign: "center" }}>ESTIMATED VALUE</div>
        <div className="serif" style={{ fontSize: 26, fontWeight: 600, textAlign: "center", marginTop: 6 }}>S$630k to S$670k</div>
        <div style={{ height: 6, borderRadius: 999, background: MOCK.panel, marginTop: 12, position: "relative", overflow: "hidden" }}>
          <span style={{ position: "absolute", left: "22%", right: "26%", top: 0, bottom: 0, background: "var(--blue)", borderRadius: 999 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MOCK.faint, marginTop: 7 }}>
          <span>Recent nearby sales</span>
          <span>URA / HDB records</span>
        </div>
        <div style={{ fontSize: 11, color: MOCK.body, background: MOCK.panel, borderRadius: 9, padding: "10px 11px", marginTop: 12 }}>
          Based on 8 recent transactions within 400m, dated and sourced.
        </div>
      </div>
    </div>
  );
}

// MOP eligibility tracker (/tools/mop-tracker).
export function MopTrackerMock() {
  return (
    <div aria-hidden="true" style={shell}>
      <MockChrome />
      <div style={{ padding: "16px 15px 18px" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: MOCK.label }}>MOP TRACKER</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>You can sell from Mar 2027</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1, height: 8, borderRadius: 999, background: MOCK.panel, overflow: "hidden" }}>
            <span style={{ display: "block", width: "72%", height: "100%", background: "var(--blue)" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: MOCK.label }}>72%</span>
        </div>
        <div style={{ display: "grid", gap: 7, marginTop: 12 }}>
          {[["Key collection", "Mar 2022"], ["MOP reached", "Mar 2027"], ["Months to go", "8"]].map(([a, b]) => (
            <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
              <span style={{ color: MOCK.faint }}>{a}</span>
              <span style={{ fontWeight: 600 }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
