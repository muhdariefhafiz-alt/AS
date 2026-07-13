import type { Metadata } from "next";
import Link from "next/link";
import { getAgentStats } from "../../lib/agentStats";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "PropertyGuru Agent Pricing 2026 & SG Portal Costs",
  description:
    "PropertyGuru agent packages run S$1,949-S$34,322/yr. 99.co-SRX runs S$980-S$3,814. See the sourced price table and compare a S$0 rank-neutral alternative.",
  alternates: { canonical: "https://fair-comparisons.com/for-agents/portal-pricing" },
  openGraph: {
    title: "PropertyGuru Agent Pricing 2026 & SG Portal Costs",
    description: "The sourced portal price table, side by side with a rank-neutral alternative: free to be listed and ranked.",
    url: "https://fair-comparisons.com/for-agents/portal-pricing",
    siteName: "FairComparisons", locale: "en_SG", type: "website",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "PropertyGuru Agent Pricing 2026 & SG Portal Costs",
    description: "PropertyGuru agent packages run S$1,949-S$34,322/yr. 99.co-SRX runs S$980-S$3,814. Compare a S$0 rank-neutral alternative.",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

// Every figure below is a published price card or investor-disclosed number,
// verified 2026-07-13. No motive characterization: facts, a comparison, and
// what FairComparisons offers TODAY (no promised features).
const PG_TIERS: [string, string, string][] = [
  ["Bronze", "S$1,949", "≈S$162/mo · 5 concurrent listings"],
  ["Silver", "S$5,873", "≈S$489/mo"],
  ["Silver+", "S$7,072", "≈S$589/mo"],
  ["Gold", "S$11,650", "≈S$971/mo"],
  ["Gold+", "S$17,100", "≈S$1,425/mo"],
  ["Platinum", "S$27,455", "≈S$2,288/mo"],
  ["Platinum+", "S$34,322", "≈S$2,860/mo · 150 concurrent listings"],
];
const SRX_TIERS: [string, string, string][] = [
  ["Elementary", "S$980", "≈S$82/mo · 20 listings, cross-posted to 99.co + SRX"],
  ["Performer", "S$1,852", "≈S$154/mo · 50 listings"],
  ["Elite Starter", "S$2,833", "≈S$236/mo · 125 listings"],
  ["Elite Expert", "S$3,814", "≈S$318/mo · 225 listings"],
];

const FAQ: [string, string][] = [
  [
    "How much does PropertyGuru cost an agent in 2026?",
    "PropertyGuru's published agent package card (October 2025, including 9% GST) runs from S$1,949/yr for Bronze (5 concurrent listings) to S$34,322/yr for Platinum+ (150 concurrent listings), with ad-credit top-ups on top. Its last investor disclosures reported around 16,600 paying agents in Singapore at an average revenue per agent of about S$5,000/yr.",
  ],
  [
    "How much do 99.co and SRX cost?",
    "The 99 Group's published agent packages (billed annually, including GST) run from about S$980/yr (Elementary, 20 listings cross-posted to 99.co and SRX) to S$3,814/yr (Elite Expert, 225 listings), plus credits for boosting and optional paid Featured Agent placements.",
  ],
  [
    "What does FairComparisons cost an agent?",
    "Being listed, ranked and found by sellers is free forever, and receiving seller invites is free. Optional tool subscriptions are Verified S$29/mo, Professional S$69/mo and Elite S$149/mo, and they never change your rank: AgentScore is computed from official CEA, URA and HDB records and cannot be bought.",
  ],
  [
    "Is FairComparisons a replacement for a portal?",
    "No. Portals are where buyers browse listings; many agents will keep a portal package for listing reach. FairComparisons is a different layer: an independent record of your actual transactions and a marketplace where sellers compare agents and invite you to quote. Agents priced out of portal packages still appear and rank here at no cost.",
  ],
  [
    "Why is being ranked free here?",
    "Because the ranking is the product for sellers, and it only works if it cannot be bought. Every CEA-registered agent is scored on official transaction records whether or not they pay. We are paid by optional tool subscriptions, never by placement, and we never take a cut of any sale.",
  ],
];

export default async function PortalPricingPage() {
  const stats = await getAgentStats();

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
      { "@type": "ListItem", position: 2, name: "For Agents", item: "https://fair-comparisons.com/for-agents" },
      { "@type": "ListItem", position: 3, name: "Portal pricing 2026", item: "https://fair-comparisons.com/for-agents/portal-pricing" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-[1120px] px-5 pt-6 md:px-8">
        <ol className="flex flex-wrap gap-2 text-xs text-gray-400">
          <li><Link href="/" className="hover:text-gray-600">Home</Link></li>
          <li>/</li>
          <li><Link href="/for-agents" className="hover:text-gray-600">For Agents</Link></li>
          <li>/</li>
          <li className="text-gray-600">Portal pricing 2026</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[var(--ink)] via-[var(--ink-2)] to-[var(--ink)] mt-4">
        <div className="mx-auto max-w-[900px] px-5 py-16 text-center md:px-8 md:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--slate-2)]">For Property Agents</p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white md:text-5xl">
            What agents really pay for portals in 2026.
            <br />
            <span className="text-[var(--slate-2)]">And what being ranked on merit costs: S$0.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/60">
            The published price cards, side by side. PropertyGuru packages now run S$1,949 to S$34,322 a year. On FairComparisons, every CEA agent is listed and ranked on official transaction records for free, and sellers invite you to quote.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/search" className="inline-block rounded-lg bg-[var(--blue)] px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-[var(--blue-deep)]">
              Find your free profile
            </Link>
            <Link href="/for-agents" className="inline-block rounded-lg border border-white/20 px-8 py-4 font-semibold text-white transition hover:bg-white/10">
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Price tables */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">PropertyGuru agent pricing vs 99.co-SRX packages: the published cards</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-gray-500">
          Annual prices including GST, from each platform&#39;s published agent package card, verified July 2026. Per-month equivalents shown for comparison. Ad credits and boosts cost extra on both portals.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="overflow-x-auto">
            <h3 className="font-bold text-gray-900">PropertyGuru (Oct 2025 card)</h3>
            <table className="mt-3 w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {PG_TIERS.map(([name, yr, note]) => (
                  <tr key={name}>
                    <td className="px-3 py-2.5 font-medium text-gray-900">{name}</td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{yr}/yr</td>
                    <td className="px-3 py-2.5 text-gray-500">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto">
            <h3 className="font-bold text-gray-900">99.co + SRX (99 Group card)</h3>
            <table className="mt-3 w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {SRX_TIERS.map(([name, yr, note]) => (
                  <tr key={name}>
                    <td className="px-3 py-2.5 font-medium text-gray-900">{name}</td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{yr}/yr</td>
                    <td className="px-3 py-2.5 text-gray-500">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-gray-400">Plus optional paid Featured Agent placements, priced via account managers.</p>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-[720px] rounded-xl border-2 border-[var(--line-2)] bg-[var(--blue-wash)] p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue)]">FairComparisons</p>
          <p className="mt-2 text-2xl font-extrabold text-gray-900">S$0 to be listed, ranked and found</p>
          <p className="mt-2 text-sm text-gray-600">
            Every CEA-registered agent is scored on official CEA, URA and HDB transaction records, whether or not they pay. Sellers compare agents and invite up to 3 to quote, free. Optional tools (Deal Radar prospecting, seller reports, a lead widget, demand analytics) are S$29 to S$149/mo and never change your rank.
          </p>
        </div>
      </section>

      {/* Context */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[860px] px-5 py-14 md:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">The maths for a typical agent</h2>
          <p className="mt-6 text-sm leading-relaxed text-gray-600">
            Singapore has about 36,800 CEA-registered agents. PropertyGuru&#39;s last investor disclosures reported roughly 16,600 of them paying, at an average of about S$5,000 per agent per year. That leaves around 20,000 registered agents who pay for no portal package at all, most commonly because the entry price does not pay back on their volume.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            FairComparisons exists for both groups. If you run portal packages, your FairComparisons profile is a free, independent record that works alongside them: sellers checking you find your verified transactions, not your ad spend. If you have stepped away from portal spend, you still appear, still rank on your record, and still receive seller invites at no cost. The optional S$29 to S$149 tools exist to help you convert that demand, and one closed deal at a typical 1% commission covers years of any tier.
          </p>
        </div>
      </section>

      {/* Live stats */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[900px] px-5 py-14 text-center md:px-8">
          <h2 className="text-2xl font-bold text-gray-900">Already live on FairComparisons</h2>
          <div className="mt-8 flex justify-center gap-10">
            <div className="text-center">
              <span className="text-3xl font-extrabold text-[var(--blue)]">{stats.total.toLocaleString()}</span>
              <p className="mt-1 text-xs text-gray-400">agents profiled</p>
            </div>
            <div className="text-center">
              <span className="text-3xl font-extrabold text-[var(--blue)]">{stats.scored.toLocaleString()}</span>
              <p className="mt-1 text-xs text-gray-400">agents scored</p>
            </div>
            <div className="text-center">
              <span className="text-3xl font-extrabold text-[var(--blue)]">{stats.agencies.toLocaleString()}</span>
              <p className="mt-1 text-xs text-gray-400">agencies</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">Frequently asked questions</h2>
        <div className="mx-auto mt-8 max-w-[720px] divide-y divide-gray-200">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-gray-900">
                {q}
                <span className="ml-4 text-gray-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">{a}</p>
            </details>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-[720px] text-center text-xs text-gray-400">
          Sources: PropertyGuru published agent package card (October 2025) and PropertyGuru Group investor disclosures; 99 Group published Agent Property Hub packages. Figures include GST where the price card does. See also the full{" "}
          <Link href="/for-agents/propertyguru-alternative" className="text-[var(--blue)]">PropertyGuru comparison</Link>{" "}and{" "}
          <Link href="/for-agents/99co-alternative" className="text-[var(--blue)]">99.co comparison</Link>.
        </p>
      </section>

      {/* Final CTA */}
      <section className="border-t border-gray-100 bg-gradient-to-br from-[var(--ink)] via-[var(--ink-2)] to-[var(--ink)]">
        <div className="mx-auto max-w-[600px] px-5 py-16 text-center md:px-8">
          <h2 className="text-2xl font-bold text-white">Your record is already ranked here. Claim it free.</h2>
          <p className="mt-3 text-white/60">No packages, no credits, no pay-to-rank. Just your verified transactions, working for you.</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/search" className="inline-block rounded-lg bg-[var(--blue)] px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-[var(--blue-deep)]">
              Find your profile
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
