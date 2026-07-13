import type { Metadata } from "next";
import Link from "next/link";
import { getAgentStats } from "../../lib/agentStats";

export const revalidate = 86400;

// The suite-level marketing page: every agent tool, the story of how they
// fit together, and one claim CTA. Individual features get their own spoke
// pages; this hub carries the "as a whole" pitch and the internal link
// equity between them. All claims describe the product as it works today.

export const metadata: Metadata = {
  title: "Property Agent Tools Singapore: The Free Toolkit",
  description:
    "Prospecting, viewings, seller leads and proof of your record, in one free dashboard built on official CEA, URA and HDB data. Claim your profile and start today.",
  alternates: { canonical: "https://fair-comparisons.com/for-agents/features" },
  openGraph: {
    title: "Property Agent Tools Singapore: The Free Toolkit",
    description:
      "Prospecting, viewings, seller leads and proof of your record, in one free dashboard built on official CEA, URA and HDB data.",
    url: "https://fair-comparisons.com/for-agents/features",
    siteName: "FairComparisons", locale: "en_SG", type: "website",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Property Agent Tools Singapore: The Free Toolkit",
    description:
      "Prospecting, viewings, seller leads and proof of your record, in one free dashboard built on official CEA, URA and HDB data.",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

// Pillar -> features. Each card: name, one-line benefit, href.
const PILLARS: { pillar: string; story: string; items: { name: string; benefit: string; href: string }[] }[] = [
  {
    pillar: "Win the listing",
    story: "Know who can sell before they list, and walk in with the evidence.",
    items: [
      { name: "Deal Radar", benefit: "HDB owners reaching MOP and fresh sales in your farm areas, from official records.", href: "/for-agents/deal-radar" },
      { name: "Seller enquiries", benefit: "Sellers compare every agent in their area and invite you to quote. The introduction is free.", href: "/for-agents/lead-generation" },
      { name: "Building Pages", benefit: "Your commentary and booking link on a development's data page, exclusively yours.", href: "/for-agents/building-pages" },
    ],
  },
  {
    pillar: "Run the deal",
    story: "One dashboard for the appointments and enquiries a deal is made of.",
    items: [
      { name: "Viewing Planner", benefit: "One booking link; buyers pick a time, you confirm from your dashboard.", href: "/for-agents/planner" },
      { name: "Quote inbox", benefit: "Seller briefs with budgets attached; send your fee quote in minutes.", href: "/for-agents/lead-generation" },
      { name: "Agent calculators", benefit: "Stamp duty, net proceeds, affordability and a CEA advert checker, free to use and share.", href: "/tools" },
    ],
  },
  {
    pillar: "Grow your name",
    story: "An unbuyable score is the best marketing asset you own. Put it to work.",
    items: [
      { name: "Demand Dashboard", benefit: "Real sellers viewing, shortlisting and inviting you, in honest numbers.", href: "/for-agents/demand-dashboard" },
      { name: "Badge & Lead Widget", benefit: "Your verified score in your signature, a valuation widget on your site feeding you enquiries.", href: "/for-agents/badge-widget" },
      { name: "Grow toolkit", benefit: "Co-branded seller reports and embeddable tools that turn your record into listings.", href: "/for-agents/grow" },
    ],
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "What does the agent toolkit cost?",
    a: "Being listed, ranked and found is free forever, and the core toolkit (Deal Radar, Planner, Demand Dashboard, seller enquiries, badge and widget, one Building Page) comes free with your claimed profile. Optional plans (Verified S$29/mo, Professional S$69/mo, Elite S$149/mo) add reputation tools and higher Building Page quotas. Nothing you pay changes your rank.",
  },
  {
    q: "Do I need to claim my profile to use the tools?",
    a: "Yes. Every CEA-registered agent already has a public profile ranked on their record; claiming it (free, no credit card) unlocks the dashboard where the tools live.",
  },
  {
    q: "Is this a replacement for my portal package?",
    a: "No. Portals are where buyers browse listings. FairComparisons is an independent record and a seller marketplace: sellers compare agents on real transactions and invite the ones they choose. Many agents run both; agents priced out of portal packages still rank here at no cost.",
  },
  {
    q: "Where does the data behind the tools come from?",
    a: "Official public records: CEA salesperson transaction records, URA private transaction data and HDB resale data. Every score and every Deal Radar signal traces to a recorded transaction; we never invent a number.",
  },
];

export default async function FeaturesHubPage() {
  const stats = await getAgentStats();

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "FairComparisons agent toolkit",
    itemListElement: PILLARS.flatMap((p) => p.items)
      .filter((i, idx, arr) => arr.findIndex((x) => x.href === i.href) === idx)
      .map((i, idx) => ({
        "@type": "ListItem", position: idx + 1, name: i.name,
        url: `https://fair-comparisons.com${i.href}`,
      })),
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "For Agents", item: "https://fair-comparisons.com/for-agents" },
      { "@type": "ListItem", position: 3, name: "Features", item: "https://fair-comparisons.com/for-agents/features" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />

      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">For agents · The full toolkit</div>
          <h1>Every tool an agent needs.<br /><span className="accent">One free dashboard.</span></h1>
          <p className="lp-hero__sub">
            Prospecting, viewings, seller leads and proof of your record, built on the same official CEA, URA and HDB
            data that scores {stats.scored.toLocaleString()} agents. Free to be listed. Free to be found. Free to win.
          </p>
          <div className="lp-hero__tags">
            <span className="lp-hero__tag">Free forever listing</span>
            <span className="lp-hero__tag">No paid placement</span>
            <span className="lp-hero__tag">Built on official records</span>
          </div>
          <div style={{ marginTop: 24 }}>
            <Link href="/search" className="fc-btn fc-btn--primary fc-btn--lg">Find and claim your profile</Link>
          </div>
        </div>
      </header>

      {PILLARS.map((p, pi) => (
        <section key={p.pillar} className={pi % 2 === 0 ? "lp-section" : "lp-section--paper"}>
          <div className="fc-wrap" style={{ padding: "56px 40px" }}>
            <p className="kicker" style={{ color: "var(--blue-deep)", textAlign: "center" }}>Pillar {pi + 1}</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(24px,3vw,32px)", marginTop: 6 }}>{p.pillar}</h2>
            <p className="muted" style={{ textAlign: "center", maxWidth: "56ch", margin: "10px auto 0" }}>{p.story}</p>
            <div className="fc-grid-3" style={{ marginTop: 28 }}>
              {p.items.map((i) => (
                <Link key={i.name + i.href} href={i.href} className="fc-card fc-card--pad" style={{ background: "#fff", display: "block", textDecoration: "none" }}>
                  <div className="serif" style={{ fontWeight: 600, fontSize: 19, color: "var(--ink)" }}>{i.name}</div>
                  <p className="muted" style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6 }}>{i.benefit}</p>
                  <span style={{ display: "inline-block", marginTop: 12, color: "var(--blue)", fontWeight: 600, fontSize: 14 }}>Learn more →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Whole-suite benefit + honest pricing note */}
      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "56px 40px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,32px)" }}>Why one toolkit beats ten subscriptions</h2>
          <p className="muted" style={{ maxWidth: "62ch", margin: "12px auto 0", lineHeight: 1.7 }}>
            Every tool here runs on the same asset: your verified transaction record. The record ranks you, the ranking
            brings sellers, the sellers book viewings, the viewings become deals, and the deals strengthen the record.
            Portals charge thousands a year for visibility that resets every month. Your record compounds.
          </p>
          <p className="muted" style={{ maxWidth: "62ch", margin: "16px auto 0", lineHeight: 1.7 }}>
            The core toolkit is free with your claimed profile. Optional plans (Verified S$29/mo, Professional S$69/mo,
            Elite S$149/mo) add reputation tools and higher{" "}
            <Link href="/for-agents/building-pages" style={{ color: "var(--blue)", fontWeight: 600 }}>Building Page</Link> quotas.
            Payment never changes rank: see{" "}
            <Link href="/for-agents/portal-pricing" style={{ color: "var(--blue)", fontWeight: 600 }}>what portals charge in 2026</Link>{" "}
            for the comparison in numbers.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section--paper">
        <div className="fc-wrap" style={{ padding: "48px 40px" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(22px,3vw,30px)" }}>Frequently asked questions</h2>
          <div style={{ maxWidth: 720, margin: "24px auto 0", display: "flex", flexDirection: "column", gap: 18 }}>
            {FAQ.map((f) => (
              <div key={f.q}>
                <h3 style={{ fontSize: 15.5, fontWeight: 600, margin: 0, color: "var(--ink)" }}>{f.q}</h3>
                <p className="muted" style={{ margin: "6px 0 0", fontSize: 14.5, lineHeight: 1.65 }}>{f.a}</p>
              </div>
            ))}
          </div>
          <p className="muted small" style={{ textAlign: "center", marginTop: 24 }}>
            Comparing platforms? Read the{" "}
            <Link href="/for-agents/propertyguru-alternative" style={{ color: "var(--blue)" }}>PropertyGuru alternative</Link>,{" "}
            <Link href="/for-agents/propkaki-alternative" style={{ color: "var(--blue)" }}>PropKaki alternative</Link> and{" "}
            <Link href="/for-agents/portal-pricing" style={{ color: "var(--blue)" }}>2026 portal pricing</Link> breakdowns.
          </p>
        </div>
      </section>

      <section className="lp-hero">
        <div className="fc-wrap" style={{ textAlign: "center", padding: "56px 40px" }}>
          <h2 style={{ color: "#fff", fontSize: "clamp(26px,3vw,34px)" }}>Your profile is already live. Claim the toolkit.</h2>
          <p className="lp-hero__sub" style={{ margin: "12px auto 22px" }}>
            Free, no credit card. {stats.total.toLocaleString()} agents profiled, {stats.scored.toLocaleString()} scored on real records.
          </p>
          <Link href="/search" className="fc-btn fc-btn--primary fc-btn--lg">Find and claim your profile</Link>
        </div>
      </section>
    </>
  );
}
