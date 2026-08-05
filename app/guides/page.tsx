import Link from "next/link";
import type { Metadata } from "next";
import SellCtaBand from "../components/SellCtaBand";
import ScrollReveal from "../components/ScrollReveal";
import { KeyLine } from "../components/LineArt";

export const metadata: Metadata = {
  title: "Property Guides - Singapore Buyer & Seller Resources",
  description: "Practical guides for buying and selling property in Singapore. HDB resale process, agent commissions, how to choose an agent, and more. Based on public data and regulatory sources.",
  alternates: { canonical: "https://fair-comparisons.com/guides" },
};

const guides = [
  {
    slug: "how-to-choose-property-agent",
    title: "How to Check and Choose a Property Agent",
    description: "Verify CEA registration, read an agent's real transaction record, spot the red flags, and know the questions to ask before you sign.",
    tag: "Agent Selection",
    tagColor: "bg-[var(--blue-wash)] text-[var(--blue-deep)] border-[var(--line-2)]",
  },
  {
    slug: "how-to-check-property-agent-record",
    title: "How to Check if a Property Agent Is Good",
    description: "The 5-step record check: verify the CEA registration, count recent local seller-side sales, and apply the team test. Plus the four things the record hides.",
    tag: "Due Diligence",
    tagColor: "bg-[var(--blue-wash)] text-[var(--blue-deep)] border-[var(--line-2)]",
  },
  {
    slug: "hdb-resale-process",
    title: "HDB Resale Process: Step-by-Step Guide",
    description: "The full timeline from eligibility check to key collection. Costs, documents, and where an agent fits in.",
    tag: "HDB",
    tagColor: "bg-green-50 text-green-700 border-green-200",
  },
  {
    slug: "property-agent-commission",
    title: "Property Agent Commission Rates in Singapore",
    description: "How much agents charge for HDB, condo, and landed transactions. Buyer vs seller commission, and what is included.",
    tag: "Costs",
    tagColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    slug: "who-pays-agent-commission",
    title: "Who Pays Agent Commission in Singapore?",
    description: "Each side pays their own agent. When buyers pay nothing, how co-broking splits work, and the HDB vs private differences, with worked examples.",
    tag: "Costs",
    tagColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    slug: "hdb-resale-agent-fee",
    title: "HDB Resale Agent Fee: The 1% Norm Explained",
    description: "What about 1% per side comes to at real 2026 HDB prices, GST on top, when the fee is paid, and what it includes. Norms, not regulation.",
    tag: "Costs",
    tagColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    slug: "condo-vs-hdb-investment",
    title: "Condo vs HDB as an Investment in Singapore",
    description: "Key differences for investment: ABSD rules, rental yield, capital appreciation, MOP restrictions, and ownership limits.",
    tag: "Investment",
    tagColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    slug: "property-agent-vs-diy",
    title: "Selling Property Without an Agent in Singapore",
    description: "What an agent actually does, when DIY makes sense, legal requirements, and the real cost of going solo.",
    tag: "DIY",
    tagColor: "bg-slate-50 text-slate-700 border-slate-200",
  },
];

export default function GuidesPage() {
  return (
    <>
      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">Guides</span>
        </div>
      </nav>

      <ScrollReveal />
      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--cloud)] to-white" style={{ position: "relative", overflow: "hidden" }}>
        <KeyLine className="fc-lineart fc-float" width={88} style={{ position: "absolute", right: "6%", top: 24, color: "var(--line-2)" }} />
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8" style={{ position: "relative" }}>
          <h1 className="fc-hero-in fc-hero-in--1 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Property Guides</h1>
          <p className="fc-hero-in fc-hero-in--2 mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Practical, Singapore-specific guides for buyers, sellers, and investors. No fluff, no sales pitch. Every guide is based on public regulations, CEA rules, and actual market data.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((g, i) => (
            <Link
              key={g.slug}
              href={`/guides/${g.slug}`}
              className="fc-reveal group rounded-xl border border-gray-100 bg-white p-6 transition hover:border-[var(--line-2)] hover:shadow-md"
              style={{ ["--reveal-delay" as string]: `${Math.min(i * 0.06, 0.42)}s` }}
            >
              <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${g.tagColor}`}>{g.tag}</span>
              <h2 className="mt-3 text-lg font-bold text-gray-900 group-hover:text-[var(--blue)]">{g.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{g.description}</p>
              <span className="mt-4 inline-block text-sm font-medium text-[var(--blue)]">Read guide &rarr;</span>
            </Link>
          ))}
        </div>
      </div>

      <SellCtaBand source="guides" heading="Reading up before you sell?" sub="When you're ready, get a free shortlist of the agents who actually sell homes like yours, ranked on real transaction data." />
    </>
  );
}
