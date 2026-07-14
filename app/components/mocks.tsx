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

// ---- Agent-facing creatives (feature pages + for-agents showcase) ----

// Deal Radar farm-area feed.
export function DealRadarMock() {
  return (
    <div aria-hidden="true" style={shell}>
      <MockChrome />
      <div style={{ padding: "14px 15px 16px" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: MOCK.label }}>DEAL RADAR · TAMPINES</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>3 owners likely to sell soon</div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {[
            ["Blk 821 Tampines St 81", "MOP reached · held 6 yrs"],
            ["Blk 476 Tampines Ave 9", "Bought 2013 · long tenure"],
            ["Blk 138 Tampines St 11", "Nearby unit just listed"],
          ].map(([a, b]) => (
            <div key={a} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: MOCK.panel, borderRadius: 9, padding: "9px 11px" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{a}</div>
                <div style={{ fontSize: 10.5, color: MOCK.faint }}>{b}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: MOCK.pillText, background: MOCK.pillBg, borderRadius: 999, padding: "3px 9px" }}>Signal</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// AI-drafted first reply, grounded in the record.
export function InboxMock() {
  return (
    <div aria-hidden="true" style={shell}>
      <MockChrome />
      <div style={{ padding: "13px 14px 15px" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: MOCK.label }}>SUGGESTED REPLY</div>
        <div style={{ fontSize: 11.5, lineHeight: 1.55, color: MOCK.body, marginTop: 8, background: MOCK.panel, borderRadius: 9, padding: "10px 11px" }}>
          Hi Mdm Tan, thanks for shortlisting me. I have sold three 4-room units in Tampines in the last year, the most recent near your block. Happy to share a precise valuation. Could we speak this week?
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: "var(--blue)", borderRadius: 7, padding: "6px 11px" }}>Copy</span>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "#c3d0ff", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 7, padding: "6px 11px" }}>Grounded in your record</span>
        </div>
      </div>
    </div>
  );
}

// Embeddable AgentScore badge + lead widget for the agent's own site.
export function WidgetMock() {
  return (
    <div aria-hidden="true" style={shell}>
      <MockChrome />
      <div style={{ padding: "14px 15px 16px" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: MOCK.label }}>ON YOUR WEBSITE</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, background: MOCK.panel, borderRadius: 10, padding: "11px 12px" }}>
          <span style={{ width: 34, height: 34, borderRadius: 8, background: MOCK.pillBg, color: MOCK.pillText, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>89</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Verified on FairComparisons</div>
            <div style={{ fontSize: 10.5, color: MOCK.faint }}>AgentScore from official records</div>
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "var(--blue)", borderRadius: 8, padding: "8px 11px", marginTop: 9, textAlign: "center" }}>
          What is my home worth? →
        </div>
      </div>
    </div>
  );
}

// Planner: a buyer self-schedules a viewing that syncs to the agent's calendar.
export function PlannerMock() {
  return (
    <div aria-hidden="true" style={shell}>
      <MockChrome />
      <div style={{ padding: "14px 15px 16px" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: MOCK.label }}>VIEWING PLANNER</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>New viewing request</div>
        <div style={{ background: MOCK.panel, borderRadius: 10, padding: "11px 12px", marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Blk 138 Tampines St 11</div>
              <div style={{ fontSize: 10.5, color: MOCK.faint }}>Sat 12 Jul · 3:00pm</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "var(--blue)", borderRadius: 999, padding: "4px 11px" }}>Confirm</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 11, fontSize: 11, color: MOCK.body }}>
          <span style={{ width: 16, height: 16, borderRadius: 999, background: MOCK.pillBg, color: MOCK.pillText, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>✓</span>
          Syncs to your Google Calendar
        </div>
      </div>
    </div>
  );
}

// Demand Dashboard: how many sellers are viewing / comparing the agent.
export function DemandMock() {
  return (
    <div aria-hidden="true" style={shell}>
      <MockChrome />
      <div style={{ padding: "14px 15px 16px" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: MOCK.label }}>DEMAND · LAST 30 DAYS</div>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          {[["Profile views", "218"], ["Compared", "34"], ["Shortlisted", "6"]].map(([a, b]) => (
            <div key={a} style={{ flex: 1, background: MOCK.panel, borderRadius: 10, padding: "11px 10px", textAlign: "center" }}>
              <div className="tnum" style={{ fontSize: 20, fontWeight: 800, color: MOCK.label }}>{b}</div>
              <div style={{ fontSize: 10, color: MOCK.faint, marginTop: 2 }}>{a}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 44, marginTop: 12 }}>
          {[35, 52, 40, 68, 58, 82, 74].map((h, i) => (
            <span key={i} style={{ flex: 1, height: `${h}%`, background: i === 5 ? "var(--blue)" : MOCK.pillBg, borderRadius: 3 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Building Pages: the agent owning a development's data page.
export function BuildingPageMock() {
  return (
    <div aria-hidden="true" style={shell}>
      <MockChrome />
      <div style={{ padding: "14px 15px 16px" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: MOCK.label }}>THE SAIL @ MARINA BAY</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>Your page for this development</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, background: MOCK.panel, borderRadius: 10, padding: "11px 12px" }}>
          <span style={{ width: 34, height: 34, borderRadius: 999, background: MOCK.pillBg, color: MOCK.pillText, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>★</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Your listing agent</div>
            <div style={{ fontSize: 10.5, color: MOCK.faint }}>12 recent sales in this building</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "var(--blue)", borderRadius: 999, padding: "4px 10px" }}>Book</span>
        </div>
        <div style={{ fontSize: 10.5, color: MOCK.faint, marginTop: 10 }}>One agent per building. First come, first served.</div>
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
