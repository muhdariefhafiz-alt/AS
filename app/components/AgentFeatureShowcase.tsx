import ProductBox, { MOCKUP_STYLE, MockChrome, MOCK } from "./ProductBox";

// The /for-agents feature showcase, built on the reusable ProductBox pattern.
// Every box showcases a REAL FairComparisons feature; the mockups are pure-JSX,
// clearly illustrative UI states (same standard as DashboardPreview).

const mockShell: React.CSSProperties = { ...MOCKUP_STYLE, pointerEvents: "none", userSelect: "none" };

// Creative 1: Deal Radar farm-area feed.
function DealRadarMock() {
  return (
    <div aria-hidden="true" style={mockShell}>
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

// Creative 2: AI-drafted first reply, grounded in the record.
function InboxMock() {
  return (
    <div aria-hidden="true" style={mockShell}>
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

// Creative 3: embeddable AgentScore badge + lead widget for the agent's own site.
function WidgetMock() {
  return (
    <div aria-hidden="true" style={mockShell}>
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

export default function AgentFeatureShowcase() {
  return (
    <section className="lp-section">
      <div className="fc-wrap fc-reveal" style={{ padding: "64px 40px" }}>
        <div style={{ textAlign: "center" }}>
          <div className="lp-hero__eyebrow" style={{ justifyContent: "center" }}>The toolkit</div>
          <h2 style={{ maxWidth: "20ch", margin: "12px auto 0", fontSize: "clamp(26px,3vw,34px)" }}>
            Every tool to win listings, <span className="accent">free.</span>
          </h2>
          <p className="muted" style={{ maxWidth: "56ch", margin: "14px auto 0", fontSize: 15.5, lineHeight: 1.7 }}>
            The same work you do by hand today, done for you: spot owners about to sell, reply first with your real numbers, and turn your own website into a lead source.
          </p>
        </div>

        <div style={{ marginTop: 32 }}>
          <ProductBox
            layout="hero"
            eyebrow="Deal Radar"
            title="Know who is about to sell, before your competitors."
            body="Deal Radar reads your farm area for the homes most likely to list next, owners past their MOP, long tenures, blocks where a neighbour just sold, so you reach them first."
            mockup={<DealRadarMock />}
            cta={{ label: "Claim your free profile", href: "/search", variant: "ink" }}
            secondary={{ label: "See Deal Radar", href: "/for-agents/deal-radar" }}
          />
        </div>

        <div className="fc-grid-2" style={{ marginTop: 20, gap: 20 }}>
          <ProductBox
            layout="stacked"
            eyebrow="Lead inbox"
            title="Reply first, backed by your real numbers."
            body="Every FairComparisons lead lands in one inbox with an AI draft grounded in your own CEA transactions and this street's comps. One tap to reply."
            mockup={<InboxMock />}
            link={{ label: "See the inbox", href: "/for-agents/features" }}
          />
          <ProductBox
            layout="stacked"
            eyebrow="Website widget"
            title="Turn your own site visitors into leads."
            body="Embed your verified AgentScore badge and a home-value widget on your website. Visitors asking what their home is worth become tracked enquiries."
            mockup={<WidgetMock />}
            link={{ label: "See the widget", href: "/for-agents/badge-widget" }}
          />
        </div>
      </div>
    </section>
  );
}
