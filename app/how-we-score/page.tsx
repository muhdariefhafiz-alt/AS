import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How AgentScore works: the methodology",
  description:
    "AgentScore (0-100) ranks every CEA-registered Singapore property agent on actual government transaction records, not advertising. Full methodology: the five weighted dimensions, data sources, recalculation cadence, and why rankings cannot be bought.",
  alternates: { canonical: "https://fair-comparisons.com/how-we-score" },
  openGraph: {
    title: "How AgentScore works: the methodology",
    description:
      "The five weighted dimensions behind AgentScore, the CEA/URA/HDB data sources, and why no factor can be purchased.",
    url: "https://fair-comparisons.com/how-we-score",
    type: "article",
    locale: "en_SG",
    images: [{ url: "https://fair-comparisons.com/og-image.png", width: 1200, height: 630, alt: "FairComparisons" }],
  },
};

const DIMENSIONS = [
  {
    name: "Volume",
    pts: 30,
    body: "Sale-weighted transaction record from the CEA register. A completed sale counts most (seller-side sales weighted highest, buyer-side sales less, rentals least), so the score reflects how much an agent actually sells homes, not raw deal count. Log-scaled across the market, with the top of the band extended so the most active producers are distinguished rather than clamped together.",
  },
  {
    name: "Recency",
    pts: 25,
    body: "How recently the agent completed transactions. Recent activity is weighted above historical volume, so a once-busy agent who has gone quiet does not outrank one who is active now.",
  },
  {
    name: "Diversity",
    pts: 15,
    body: "The range of property types and areas the agent actively serves, rewarding genuine breadth over a single lucky streak.",
  },
  {
    name: "Experience",
    pts: 15,
    body: "Years of recorded market activity in the CEA register.",
  },
  {
    name: "Reviews",
    pts: 15,
    body: "Google review rating of the agent's agency, Bayesian-corrected so a 5.0 from 3 reviews does not outrank a 4.6 from 400.",
  },
];

const DATA_SOURCES = [
  "CEA salesperson transaction records: who transacted what, where and when",
  "CEA public register: active registration, agency membership and history",
  "URA private property transactions",
  "HDB resale transactions via data.gov.sg",
  "Google agency review ratings",
];

const FAQ = [
  {
    q: "Can an agent pay to rank higher?",
    a: "No. There is no paid placement and no factor can be purchased. 85 of the 100 points come from transaction volume, recency, diversity and experience, all drawn from government records. Reviews are 15 points and reflect the agency's public Google rating.",
  },
  {
    q: "Does a high AgentScore mean an agent is the right one to sell my home?",
    a: "Largely, yes, more than it used to. AgentScore now sale-weights its volume dimension: a completed sale counts far more than a rental, and seller-side sales count most, so agents who sell homes for owners rank above rental- and buyer-side-heavy agents. For the sharpest signal, still check an agent's share of seller-side sales, shown on every profile, and our seller-facing area rankings additionally tier genuine seller-side agents above buyer-side and rental-heavy ones.",
  },
  {
    q: "How often is it recalculated?",
    a: "Weekly, as new CEA transaction data is ingested.",
  },
];

export default function HowWeScorePage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "How AgentScore works", item: "https://fair-comparisons.com/how-we-score" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />

      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">Methodology</div>
          <h1>How <span className="accent">AgentScore</span> works.</h1>
          <p className="lp-hero__sub">
            AgentScore rates every CEA-registered Singapore property agent from 0 to 100 on actual government transaction records, not advertising spend. Here is exactly how it is built, what it measures, and why no agent can buy a higher position.
          </p>
        </div>
      </header>

      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "8px 40px 56px", maxWidth: 860 }}>
          <h2 style={{ fontSize: "clamp(24px,2.8vw,32px)" }}>The five dimensions</h2>
          <p className="muted" style={{ margin: "10px 0 24px", lineHeight: 1.7 }}>
            The score is the sum of five weighted dimensions. Seventy of the hundred points come from what an agent has actually transacted; the rest reflects experience and the agency&apos;s public review standing.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {DIMENSIONS.map((d) => (
              <div key={d.name} className="fc-card fc-card--pad">
                <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <h3 className="serif" style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{d.name}</h3>
                  <span className="mono" style={{ color: "var(--blue)", fontSize: 14, fontWeight: 600 }}>{d.pts} pts</span>
                </div>
                <p className="muted small" style={{ margin: "8px 0 0", lineHeight: 1.65 }}>{d.body}</p>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: "clamp(24px,2.8vw,32px)", marginTop: 48 }}>Where the data comes from</h2>
          <ul style={{ margin: "14px 0 0", paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {DATA_SOURCES.map((s) => (
              <li key={s} className="fc-row" style={{ gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "var(--blue)", fontWeight: 700, lineHeight: 1.6 }}>&#8226;</span>
                <span style={{ lineHeight: 1.6 }}>{s}</span>
              </li>
            ))}
          </ul>
          <p className="muted small" style={{ marginTop: 16 }}>
            Recalculated weekly as new CEA data is ingested. Registration status can be confirmed directly on the{" "}
            <a href="https://www.cea.gov.sg/aceas/public-register/sales/1" target="_blank" rel="noopener noreferrer nofollow" style={{ color: "var(--blue)" }}>CEA public register</a>.
          </p>

          <div className="fc-card fc-card--pad" style={{ marginTop: 32, background: "var(--cloud)" }}>
            <div className="kicker">Integrity</div>
            <p style={{ margin: "8px 0 0", lineHeight: 1.7 }}>
              There is no paid placement and rankings cannot be bought. No input that feeds AgentScore can be purchased, and we are paid the same regardless of which agent a seller chooses. Thin data is shown as thin, never inflated.
            </p>
          </div>

          <h2 style={{ fontSize: "clamp(24px,2.8vw,32px)", marginTop: 48 }}>Common questions</h2>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQ.map((f) => (
              <details key={f.q} className="fc-card fc-card--pad">
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 16, listStyle: "none" }}>{f.q}</summary>
                <p className="muted" style={{ margin: "10px 0 0", fontSize: 14.5, lineHeight: 1.7 }}>{f.a}</p>
              </details>
            ))}
          </div>

          <div className="fc-row" style={{ gap: 12, marginTop: 36, flexWrap: "wrap" }}>
            <Link href="/property-agents" className="fc-btn fc-btn--primary">Compare agents</Link>
            <Link href="/trust" className="fc-btn fc-btn--ghost">Trust &amp; data</Link>
          </div>
        </div>
      </section>
    </>
  );
}
