import Link from "next/link";

// Feature showcase in the "product box" style: a vivid gradient panel holding a
// product mockup (the creative), paired with a benefit-led header + subheader +
// CTA. The LAYOUT is adapted from the housapp for-agent page; the palette is our
// own "The Record" brand (ink + electric blue, blue-wash gradient), never green.
// Every box showcases a REAL FairComparisons feature; the mockups are pure-JSX,
// clearly illustrative UI states (same standard as DashboardPreview), never
// claims about a real person.

const BLUE_BOX: React.CSSProperties = {
  borderRadius: 24,
  background: "linear-gradient(120deg, #e4e9ff 0%, #b9c6ff 42%, #6b86ff 100%)",
  overflow: "hidden",
};

const MOCKUP: React.CSSProperties = {
  borderRadius: 14,
  background: "#0a1733",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 26px 60px -22px rgba(10,16,38,0.6)",
  color: "#e6ecff",
  overflow: "hidden",
};

function Chrome() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "10px 13px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 8, height: 8, borderRadius: 999, background: "#3a4a7a", display: "inline-block" }} />
      ))}
    </div>
  );
}

// Creative 1: Deal Radar farm-area feed.
function DealRadarMock() {
  return (
    <div aria-hidden="true" style={{ ...MOCKUP, pointerEvents: "none", userSelect: "none" }}>
      <Chrome />
      <div style={{ padding: "14px 15px 16px" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: "#9db4ff" }}>DEAL RADAR · TAMPINES</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>3 owners likely to sell soon</div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {[
            ["Blk 821 Tampines St 81", "MOP reached · held 6 yrs"],
            ["Blk 476 Tampines Ave 9", "Bought 2013 · long tenure"],
            ["Blk 138 Tampines St 11", "Nearby unit just listed"],
          ].map(([a, b]) => (
            <div key={a} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", borderRadius: 9, padding: "9px 11px" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{a}</div>
                <div style={{ fontSize: 10.5, color: "#93a6d8" }}>{b}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#0a1733", background: "#9db4ff", borderRadius: 999, padding: "3px 9px" }}>Signal</span>
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
    <div aria-hidden="true" style={{ ...MOCKUP, pointerEvents: "none", userSelect: "none" }}>
      <Chrome />
      <div style={{ padding: "13px 14px 15px" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: "#9db4ff" }}>SUGGESTED REPLY</div>
        <div style={{ fontSize: 11.5, lineHeight: 1.55, color: "#d3ddff", marginTop: 8, background: "rgba(255,255,255,0.05)", borderRadius: 9, padding: "10px 11px" }}>
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
    <div aria-hidden="true" style={{ ...MOCKUP, pointerEvents: "none", userSelect: "none" }}>
      <Chrome />
      <div style={{ padding: "14px 15px 16px" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: "#9db4ff" }}>ON YOUR WEBSITE</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "11px 12px" }}>
          <span style={{ width: 34, height: 34, borderRadius: 8, background: "#9db4ff", color: "#0a1733", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>89</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Verified on FairComparisons</div>
            <div style={{ fontSize: 10.5, color: "#93a6d8" }}>AgentScore from official records</div>
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

        {/* Hero product box: Deal Radar (fc-grid-2 stacks to one column on mobile) */}
        <div style={{ ...BLUE_BOX, marginTop: 32, padding: "clamp(24px,3vw,36px)" }}>
          <div className="fc-grid-2" style={{ alignItems: "center", gap: "clamp(20px,3vw,36px)" }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: 1.4, fontWeight: 700, color: "var(--ink)", opacity: 0.68 }}>DEAL RADAR</div>
              <h3 className="serif" style={{ fontSize: "clamp(22px,2.4vw,30px)", fontWeight: 600, color: "var(--ink)", margin: "10px 0 0", lineHeight: 1.15 }}>
                Know who is about to sell, before your competitors.
              </h3>
              <p style={{ color: "var(--ink-2)", fontSize: 15, lineHeight: 1.6, margin: "12px 0 0", maxWidth: "42ch" }}>
                Deal Radar reads your farm area for the homes most likely to list next, owners past their MOP, long tenures, blocks where a neighbour just sold, so you reach them first.
              </p>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginTop: 22 }}>
                <Link href="/search" className="fc-btn fc-btn--ink">Claim your free profile</Link>
                <Link href="/for-agents/deal-radar" style={{ color: "var(--ink)", fontWeight: 700, fontSize: 14.5 }}>See Deal Radar →</Link>
              </div>
            </div>
            <DealRadarMock />
          </div>
        </div>

        {/* Two small product boxes */}
        <div className="fc-grid-2" style={{ marginTop: 20, gap: 20 }}>
          <SmallBox
            eyebrow="Lead inbox"
            title="Reply first, backed by your real numbers."
            sub="Every FairComparisons lead lands in one inbox with an AI draft grounded in your own CEA transactions and this street's comps. One tap to reply."
            href="/for-agents/features"
            cta="See the inbox"
            mock={<InboxMock />}
          />
          <SmallBox
            eyebrow="Website widget"
            title="Turn your own site visitors into leads."
            sub="Embed your verified AgentScore badge and a home-value widget on your website. Visitors asking what their home is worth become tracked enquiries."
            href="/for-agents/badge-widget"
            cta="See the widget"
            mock={<WidgetMock />}
          />
        </div>
      </div>
    </section>
  );
}

function SmallBox({
  eyebrow,
  title,
  sub,
  href,
  cta,
  mock,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  href: string;
  cta: string;
  mock: React.ReactNode;
}) {
  return (
    <div className="fc-card" style={{ overflow: "hidden", padding: 0 }}>
      <div style={{ ...BLUE_BOX, borderRadius: 0, padding: "26px 26px 4px" }}>{mock}</div>
      <div style={{ padding: "22px 24px 24px" }}>
        <div className="eyebrow">{eyebrow}</div>
        <h3 className="serif" style={{ fontSize: 21, fontWeight: 600, color: "var(--ink)", margin: "8px 0 0", lineHeight: 1.2 }}>
          {title}
        </h3>
        <p className="muted small" style={{ margin: "10px 0 0", lineHeight: 1.6 }}>{sub}</p>
        <div style={{ marginTop: 16 }}>
          <Link href={href} style={{ color: "var(--blue)", fontWeight: 700, fontSize: 14.5 }}>{cta} →</Link>
        </div>
      </div>
    </div>
  );
}
