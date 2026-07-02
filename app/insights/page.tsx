import Link from "next/link";
import type { Metadata } from "next";
import SellCtaBand from "../components/SellCtaBand";

export const metadata: Metadata = {
  title: "Property Market Insights - Data-Driven Analysis",
  description: "Data-driven insights on Singapore's property market: property agent statistics, freehold premiums, million-dollar HDB flats, and more. Based on CEA, URA, and HDB data.",
  alternates: { canonical: "https://fair-comparisons.com/insights" },
};

const articles = [
  {
    slug: "property-agent-statistics-singapore",
    title: "Singapore Property Agent Statistics",
    description: "What 730,000 CEA transactions reveal: most registered agents have no record on file, 63% of activity is rentals, and the top 20% handle 70% of home sales.",
    tag: "Agent Market Study",
    tagColor: "bg-[var(--blue-wash)] text-[var(--blue-deep)] border-[var(--line-2)]",
  },
  {
    slug: "best-property-agency-singapore",
    title: "Which Property Agency Is Best in Singapore?",
    description: "The agency league table from the CEA record: the biggest brands win on volume, small focused agencies sell several times more per agent, and most big-brand rosters recorded no home sale at all.",
    tag: "Agency Market Study",
    tagColor: "bg-[var(--blue-wash)] text-[var(--blue-deep)] border-[var(--line-2)]",
  },
  {
    slug: "property-agent-league-tables-singapore",
    title: "Why the 'Top Producer' May Not Have Sold a Flat in Your Block",
    description: "The top 20% of agents do 70% of home sales, but the names at the very top are teams logging deals under one leader, credited across 23 of 26 HDB towns at once.",
    tag: "Agent Market Study",
    tagColor: "bg-[var(--blue-wash)] text-[var(--blue-deep)] border-[var(--line-2)]",
  },
  {
    slug: "top-agents-2026",
    title: "The Actual Top Property Agents in Singapore",
    description: "Ranked on real CEA sale transactions instead of self-declared titles: who genuinely sells, where, and how recently.",
    tag: "Agent Rankings",
    tagColor: "bg-[var(--blue-wash)] text-[var(--blue-deep)] border-[var(--line-2)]",
  },
  {
    slug: "million-dollar-hdb",
    title: "Million-Dollar HDB Tracker",
    description: "Which towns have the most million-dollar HDB flats? Tracking every S$1M+ resale transaction across Singapore.",
    tag: "HDB Market",
    tagColor: "bg-green-50 text-green-700 border-green-200",
  },
  {
    slug: "freehold-premium",
    title: "Singapore Freehold Premium by District",
    description: "How much more does freehold cost vs leasehold in each district? A data-driven breakdown of the tenure premium.",
    tag: "Private Property",
    tagColor: "bg-[var(--blue-wash)] text-[var(--blue-deep)] border-[var(--line-2)]",
  },
  // Court case statistics hidden while focusing on property agents vertical
];

export default function InsightsPage() {
  return (
    <>
      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">Insights</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--cloud)] to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Property Market Insights</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Data-driven analysis of Singapore's property market, HDB resale trends, and legal landscape. Every number is sourced from public records: URA transactions, HDB resale data, and eLitigation.sg court judgments.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/insights/${a.slug}`}
              className="group rounded-xl border border-gray-100 bg-white p-6 transition hover:border-[var(--line-2)] hover:shadow-md"
            >
              <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${a.tagColor}`}>{a.tag}</span>
              <h2 className="mt-3 text-lg font-bold text-gray-900 group-hover:text-[var(--blue)]">{a.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{a.description}</p>
              <span className="mt-4 inline-block text-sm font-medium text-[var(--blue)]">Read analysis &rarr;</span>
            </Link>
          ))}
        </div>
      </div>

      <SellCtaBand source="insights" heading="Know the market. Now pick the right agent." sub="Get a free shortlist of the agents who actually sell properties like yours, ranked on the same government data behind these insights." />
    </>
  );
}
