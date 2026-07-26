import Link from "next/link";
import type { Metadata } from "next";
import HeroBand from "../../components/HeroBand";
import SkylinePreFooter from "../../components/SkylinePreFooter";
import SellCtaBand from "../../components/SellCtaBand";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Singapore Property Agent Checker",
  description:
    "Free property agent checker for Singapore. Check any agent's CEA registration, real transaction record, areas and AgentScore in seconds. Built on government data, not marketing.",
  alternates: { canonical: "https://fair-comparisons.com/property-agents/check" },
  openGraph: {
    title: "Property Agent Checker Singapore",
    description: "Check any agent's CEA registration and real transaction record and AgentScore. Free.",
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
  ["Is there a free property agent checker in Singapore?", "Yes, this is one. Use the property agent checker above to search any agent by name or CEA registration number, then check their CEA status, real transaction record, areas and AgentScore. It is free and built on public government data, not on agent marketing."],
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
      <HeroBand
        eyebrow="Property agent checker"
        title={<>Check any agent on the record,</>}
        accent={<>before you sign.</>}
        sub={<>A free property agent checker built on the CEA register. Verify an agent&apos;s registration and see their real transaction history and AgentScore. Search by name or CEA registration number.</>}
        chips={["Built on the CEA register", "Free"]}
        art="mrt"
      >
        <form action="/search" method="GET" className="fc-search">
          <input name="q" placeholder="Agent name or CEA number (e.g. R012345A)" aria-label="Agent name or CEA registration number" />
          <button type="submit" className="fc-btn fc-btn--primary fc-btn--hairline">Check agent</button>
        </form>
      </HeroBand>

      {/* WHAT YOU CAN CHECK */}
      <section className="fc-wrap fc-reveal" style={{ padding: "56px 40px" }}>
        <div className="eyebrow">What you can check</div>
        <h2 style={{ marginTop: 12 }}>Judge an agent on evidence, not claims.</h2>
        <div className="fc-scene fc-scene--grow" style={{ marginTop: 24, padding: "clamp(16px,2.5vw,28px)" }}>
          <div className="fc-grid-2">
            {CHECKS.map(([t, d], i) => (
              <div key={t} className="fc-card fc-card--pad fc-reveal" style={{ ["--reveal-delay" as string]: `${Math.min(i * 0.05, 0.4)}s`, background: "#fff" }}>
                <div className="serif" style={{ fontWeight: 600, fontSize: 19 }}>{t}</div>
                <p className="muted" style={{ margin: "8px 0 0", fontSize: 14.5, lineHeight: 1.6 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 22 }}>
          <Link href="/property-agents" className="fc-btn fc-btn--quiet fc-btn--sm">Browse all agents and agencies</Link>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: "var(--cloud)" }}>
        <div className="fc-wrap fc-reveal" style={{ padding: "56px 40px", maxWidth: 820 }}>
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

      <SkylinePreFooter />
      <SellCtaBand source="check_agent" heading="Selling? Skip the guesswork." sub="Get a free shortlist of the agents who actually sell homes like yours, ranked on the same CEA record you just checked." />
    </>
  );
}
