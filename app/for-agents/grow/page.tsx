import type { Metadata } from "next";
import Link from "next/link";
import { getAgentStats } from "../../lib/agentStats";
import ProductBox from "../../components/ProductBox";
import { WidgetMock } from "../../components/mocks";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Grow: Agent Prospecting & Seller Reports",
  description:
    "The FairComparisons Grow toolkit for Singapore property agents: Deal Radar prospecting on real CEA/URA/HDB data, co-branded seller reports, a lead-generation website widget, and embeddable calculators. Free to be listed and ranked.",
  alternates: { canonical: "https://fair-comparisons.com/for-agents/grow" },
  openGraph: {
    title: "Grow: turn your track record into listings",
    description: "Deal Radar prospecting, co-branded seller reports, a lead widget and embeddable tools. Free to be listed and ranked.",
    url: "https://fair-comparisons.com/for-agents/grow",
    siteName: "FairComparisons", locale: "en_SG", type: "website",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

const FEATURES: { kicker: string; title: string; body: string; points: string[] }[] = [
  {
    kicker: "Deal Radar",
    title: "A daily prospecting list for your farm area",
    body: "Pick the HDB towns and districts you work. Deal Radar surfaces owners reaching their 5-year MOP and every recent sale near them, built entirely from official CEA, URA and HDB records. No scraping, no guessing, a fresh call list every day.",
    points: ["Owners reaching their MOP window", "Recent comparable sales in your patch", "100% real transaction data, updated daily"],
  },
  {
    kicker: "Co-branded seller reports",
    title: "Send owners a branded market report in one click",
    body: "From any Deal Radar prospect, open a clean, shareable report with your photo, name and AgentScore, plus a snapshot of recent sales for their area. Send it to the owner; the 'get a free valuation' button routes them straight back to you.",
    points: ["Your branding and independent AgentScore", "Recent sales, median price and activity", "A valuation CTA that comes back to you as a lead"],
  },
  {
    kicker: "Lead widget",
    title: "Capture your own website's visitors",
    body: "Drop a co-branded card on your own site or blog. Visitors see your independent AgentScore and a 'get a free valuation' button; anyone who clicks arrives as a seller enquiry with you already pinned as their agent.",
    points: ["One-line iframe embed", "Shows your verified AgentScore", "Visitors become enquiries pinned to you"],
  },
  {
    kicker: "Embeddable tools",
    title: "Put trusted calculators on your site, free",
    body: "Stamp duty, home affordability, seller net proceeds and agent commission, all verified against IRAS and MAS and all embeddable on your own site. Give your visitors real answers and keep them on your page.",
    points: ["Stamp duty (BSD/ABSD/SSD) and affordability (TDSR/MSR)", "Net proceeds and commission calculators", "Rates verified against IRAS and MAS"],
  },
];

export default async function GrowPage() {
  const stats = await getAgentStats();

  return (
    <>
      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">For agents · Grow</div>
          <h1>Turn your track record<br /><span className="accent">into your next listing.</span></h1>
          <p className="lp-hero__sub">
            FairComparisons ranks every CEA agent on real transaction data, for free. Grow is the toolkit on top: a daily prospecting feed, co-branded seller reports, a lead widget for your own site, and calculators you can embed anywhere.
          </p>
          <div className="lp-hero__tags">
            <span className="lp-hero__tag">Free to be listed and ranked</span>
            <span className="lp-hero__tag">Built on CEA, URA and HDB data</span>
            <span className="lp-hero__tag">Never pay-to-rank</span>
          </div>
          <div style={{ marginTop: 24 }}>
            <Link href="/search" className="fc-btn fc-btn--primary fc-btn--lg">Find and claim your profile</Link>
          </div>
        </div>
      </header>

      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "56px 40px", display: "flex", flexDirection: "column", gap: 40 }}>
          <ProductBox
            layout="hero"
            eyebrow="Grow toolkit"
            title="Turn your record into your own lead source."
            body="Embed your verified AgentScore badge and a home-value widget on your own website, hand out co-branded seller reports, and let visitors asking what their home is worth become tracked enquiries, all built on your real record."
            mockup={<WidgetMock />}
            cta={{ label: "Claim your free profile", href: "/search", variant: "ink" }}
          />
          {FEATURES.map((f) => (
            <div key={f.kicker} className="fc-card fc-card--pad" style={{ background: "#fff" }}>
              <p className="kicker" style={{ color: "var(--blue-deep)" }}>{f.kicker}</p>
              <h2 className="serif" style={{ fontSize: "clamp(21px,2.6vw,28px)", fontWeight: 600, margin: "6px 0 0", color: "var(--ink)" }}>{f.title}</h2>
              <p className="muted" style={{ marginTop: 10, fontSize: 15.5, lineHeight: 1.7, maxWidth: "68ch" }}>{f.body}</p>
              <ul style={{ marginTop: 14, paddingLeft: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                {f.points.map((p) => (
                  <li key={p} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "var(--slate)" }}>
                    <span style={{ color: "var(--blue)", fontWeight: 700 }}>+</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section--paper">
        <div className="fc-wrap" style={{ padding: "48px 40px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(22px,3vw,30px)" }}>Already the largest independent agent record in Singapore</h2>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
            {[[stats.total, "agents profiled"], [stats.scored, "agents scored"], [stats.agencies, "agencies"]].map(([n, l]) => (
              <div key={String(l)}>
                <div className="serif" style={{ fontSize: 34, fontWeight: 700, color: "var(--blue)" }}>{Number(n).toLocaleString()}</div>
                <div className="muted small">{l}</div>
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 20, fontSize: 14 }}>
            See also how we compare to{" "}
            <Link href="/for-agents/propertyguru-alternative" style={{ color: "var(--blue)", fontWeight: 600 }}>PropertyGuru</Link>,{" "}
            <Link href="/for-agents/99co-alternative" style={{ color: "var(--blue)", fontWeight: 600 }}>99.co</Link> and{" "}
            <Link href="/for-agents" style={{ color: "var(--blue)", fontWeight: 600 }}>other platforms</Link>.
          </p>
        </div>
      </section>

      <section className="lp-hero">
        <div className="fc-wrap" style={{ textAlign: "center", padding: "56px 40px" }}>
          <h2 style={{ color: "#fff", fontSize: "clamp(26px,3vw,34px)" }}>Your profile is already live. Claim it free to start growing.</h2>
          <p className="lp-hero__sub" style={{ margin: "12px auto 22px" }}>No credit card, no listing fees, no pay-to-rank. Just your track record, working for you.</p>
          <Link href="/search" className="fc-btn fc-btn--primary fc-btn--lg">Find and claim your profile</Link>
        </div>
      </section>
    </>
  );
}
