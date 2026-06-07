import Link from "next/link";
import type { Metadata } from "next";
import SellCtaBand from "../../components/SellCtaBand";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Check a Property Agent in Singapore | CEA Status + Real Record",
  description:
    "Check any Singapore property agent in seconds. Verify CEA registration, see their actual transaction record, areas, and AgentScore. Free, based on government data.",
  alternates: { canonical: "https://fair-comparisons.com/property-agents/check" },
  openGraph: {
    title: "Check a Property Agent in Singapore",
    description: "Verify CEA registration and see an agent's real transaction record and AgentScore. Free.",
    url: "https://fair-comparisons.com/property-agents/check",
    type: "website",
    locale: "en_SG",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

const CHECKS: [string, string][] = [
  ["CEA registration", "Every property agent in Singapore must be registered with the Council for Estate Agencies (CEA). We build on the public register, so you can confirm an agent is currently registered and which agency they work under."],
  ["Real transaction record", "See how many transactions the agent has actually been recorded on, what property types, and which areas, drawn from CEA transaction data rather than self-reported claims."],
  ["AgentScore", "An independent 0 to 100 score from sale-weighted transaction volume (completed sales count most, rentals least), recency, market diversity, experience, and the agency's Google reviews. It cannot be bought."],
  ["Sale vs rental mix", "We flag agents whose recorded deals are mostly rentals, so if you are selling you can quickly see who focuses on leasing rather than selling homes."],
];

const FAQ: [string, string][] = [
  ["How do I check if a property agent is CEA-registered?", "Every salesperson in Singapore must be registered with the Council for Estate Agencies. Search the agent's name or CEA registration number above to open their profile, which shows their registration and the agency they are registered under, based on the CEA public register."],
  ["What is a CEA registration number?", "It is the unique identifier every registered Singapore property agent holds, usually starting with R followed by digits and a letter (for example R012345A). You can use it to look up a specific agent and avoid confusing two people with the same name."],
  ["Can I check an agent's track record before hiring them?", "Yes. Each agent profile shows the transactions they have actually been recorded on, the property types and areas they work in, and their AgentScore, so you can judge them on evidence rather than marketing."],
  ["Is it free to check an agent?", "Yes, checking any agent is free. If you are selling, you can also get a free shortlist of the top-ranked agents for your area and have them quote their own fee."],
];

export default function CheckAgentPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "Property agents", item: "https://fair-comparisons.com/property-agents" },
      { "@type": "ListItem", position: 3, name: "Check an agent", item: "https://fair-comparisons.com/property-agents/check" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />

      {/* HERO */}
      <section style={{ background: "var(--ink)", color: "#fff" }}>
        <div className="fc-wrap" style={{ padding: "64px 40px 56px" }}>
          <div className="eyebrow" style={{ color: "var(--slate-2)", marginBottom: 18 }}>Check a property agent</div>
          <h1 style={{ color: "#fff", fontSize: "var(--t-h1)", margin: 0, maxWidth: "18ch" }}>
            Check any agent <span className="italic-serif">on the record,</span> before you sign.
          </h1>
          <p className="lede" style={{ color: "rgba(255,255,255,0.74)", marginTop: 16, maxWidth: "60ch" }}>
            Verify CEA registration and see an agent&apos;s real transaction history and AgentScore. Search by name or CEA registration number.
          </p>

          <form action="/search" method="GET" className="fc-search" style={{ marginTop: 26 }}>
            <input name="q" placeholder="Agent name or CEA number (e.g. R012345A)" aria-label="Agent name or CEA registration number" />
            <button type="submit" className="fc-btn fc-btn--primary">Check agent</button>
          </form>

          <div className="fc-row" style={{ marginTop: 16, gap: 18 }}>
            <span className="mono" style={{ color: "rgba(255,255,255,0.82)", fontSize: 13 }}>Built on the CEA register</span>
            <span className="mono" style={{ color: "rgba(255,255,255,0.82)", fontSize: 13 }}>Free</span>
          </div>
        </div>
      </section>

      {/* WHAT YOU CAN CHECK */}
      <section className="fc-wrap" style={{ padding: "56px 40px" }}>
        <div className="eyebrow">What you can check</div>
        <h2 style={{ marginTop: 12 }}>Judge an agent on evidence, not claims.</h2>
        <div className="fc-grid-2" style={{ marginTop: 24 }}>
          {CHECKS.map(([t, d]) => (
            <div key={t} className="fc-card fc-card--pad">
              <div className="serif" style={{ fontWeight: 600, fontSize: 19 }}>{t}</div>
              <p className="muted" style={{ margin: "8px 0 0", fontSize: 14.5, lineHeight: 1.6 }}>{d}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 22 }}>
          <Link href="/property-agents" className="fc-btn fc-btn--quiet fc-btn--sm">Browse all agents and agencies</Link>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: "var(--cloud)" }}>
        <div className="fc-wrap" style={{ padding: "56px 40px", maxWidth: 820 }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,32px)" }}>Frequently asked questions</h2>
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 18 }}>
            {FAQ.map(([q, a]) => (
              <div key={q}>
                <h3 className="serif" style={{ fontSize: 18, fontWeight: 600 }}>{q}</h3>
                <p className="muted" style={{ marginTop: 6, fontSize: 15, lineHeight: 1.6 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SellCtaBand source="check_agent" heading="Selling? Skip the guesswork." sub="Get a free shortlist of the agents who actually sell homes like yours, ranked on the same CEA record you just checked." />
    </>
  );
}
