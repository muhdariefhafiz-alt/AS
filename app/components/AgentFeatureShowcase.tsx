import ProductBox from "./ProductBox";
import { DealRadarMock, InboxMock, WidgetMock } from "./mocks";

// The /for-agents feature showcase, built on the reusable ProductBox pattern.
// Every box showcases a REAL FairComparisons feature; the mockups live in the
// shared mocks library (pure-JSX illustrative UI, same standard as DashboardPreview).

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
