import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Property Market Insights - Data-Driven Analysis",
  description: "Data-driven insights on Singapore's property market. Freehold premiums, million-dollar HDB flats, court case statistics, and more. Based on URA, HDB, and eLitigation data.",
  alternates: { canonical: "https://fair-comparisons.com/insights" },
};

const articles = [
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
    tagColor: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    slug: "court-case-statistics",
    title: "Singapore Court Case Statistics",
    description: "5,200+ published judgments analyzed. Which practice areas dominate? Which firms appear most often?",
    tag: "Legal",
    tagColor: "bg-slate-50 text-slate-700 border-slate-200",
  },
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

      <section className="border-b border-gray-100 bg-gradient-to-b from-teal-50/60 to-white">
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
              className="group rounded-xl border border-gray-100 bg-white p-6 transition hover:border-teal-200 hover:shadow-md"
            >
              <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${a.tagColor}`}>{a.tag}</span>
              <h2 className="mt-3 text-lg font-bold text-gray-900 group-hover:text-teal-600">{a.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{a.description}</p>
              <span className="mt-4 inline-block text-sm font-medium text-teal-600">Read analysis &rarr;</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
