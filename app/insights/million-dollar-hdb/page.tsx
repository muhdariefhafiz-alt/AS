import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { HDB_TOWNS, townDisplayName } from "../../lib/hdbData";
import { formatPrice, formatPriceFull } from "../../lib/narrativeHelpers";
import EmailCapture from "../../components/EmailCapture";
import type { Metadata } from "next";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Million-Dollar HDB Tracker - Every S$1M+ Resale Transaction in Singapore",
  description: "Track every million-dollar HDB flat in Singapore. Which towns have the most S$1M+ transactions? Bukit Merah leads with 597. Data from HDB resale records.",
  alternates: { canonical: "https://fair-comparisons.com/insights/million-dollar-hdb" },
};

type TownMillionData = {
  town: string;
  count: number;
  maxPrice: number;
  avgPrice: number;
  latestYear: number;
  topStreet: string;
  topStreetCount: number;
};

type YearlyTrend = { year: number; count: number; avgPrice: number };

export default async function MillionDollarHdbPage() {
  // Town-level million-dollar stats - direct query
  let towns: TownMillionData[] = [];
  {
    const { data: raw } = await supabase
      .from("sg_hdb_transactions")
      .select("town, resale_price, street_name, month")
      .gte("resale_price", 1000000)
      .order("resale_price", { ascending: false });

    const byTown = new Map<string, { prices: number[]; streets: Map<string, number>; years: number[] }>();
    for (const r of raw ?? []) {
      const t = byTown.get(r.town) ?? { prices: [] as number[], streets: new Map<string, number>(), years: [] as number[] };
      t.prices.push(Number(r.resale_price));
      t.streets.set(r.street_name, (t.streets.get(r.street_name) ?? 0) + 1);
      const yr = parseInt(r.month?.slice(0, 4) ?? "0");
      if (yr) t.years.push(yr);
      byTown.set(r.town, t);
    }

    towns = Array.from(byTown.entries())
      .map(([town, d]) => {
        const topStreetEntry = Array.from(d.streets.entries()).sort((a, b) => b[1] - a[1])[0];
        return {
          town,
          count: d.prices.length,
          maxPrice: Math.max(...d.prices),
          avgPrice: Math.round(d.prices.reduce((s, p) => s + p, 0) / d.prices.length),
          latestYear: Math.max(...d.years),
          topStreet: topStreetEntry?.[0] ?? "",
          topStreetCount: topStreetEntry?.[1] ?? 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  // Yearly trend
  const { data: allMillionTxns } = await supabase
    .from("sg_hdb_transactions")
    .select("month, resale_price")
    .gte("resale_price", 1000000);

  const yearMap = new Map<number, { count: number; total: number }>();
  for (const r of allMillionTxns ?? []) {
    const yr = parseInt(r.month?.slice(0, 4) ?? "0");
    if (!yr) continue;
    const existing = yearMap.get(yr) ?? { count: 0, total: 0 };
    existing.count++;
    existing.total += Number(r.resale_price);
    yearMap.set(yr, existing);
  }
  const yearlyTrend: YearlyTrend[] = Array.from(yearMap.entries())
    .map(([year, d]) => ({ year, count: d.count, avgPrice: Math.round(d.total / d.count) }))
    .sort((a, b) => a.year - b.year);

  const totalMillionFlats = towns.reduce((s, t) => s + t.count, 0);
  const overallMax = Math.max(...towns.map((t) => t.maxPrice));
  const maxTown = towns.find((t) => t.maxPrice === overallMax);
  const topTown = towns[0];

  function townSlug(name: string): string {
    return HDB_TOWNS.find((t) => t.name === name)?.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  const faqItems = [
    {
      q: "How many million-dollar HDB flats are there in Singapore?",
      a: `As of our latest data, ${totalMillionFlats.toLocaleString()} HDB resale transactions have crossed the S$1 million mark. ${topTown.town} leads with ${topTown.count} transactions, followed by ${towns[1]?.town ?? "other towns"} with ${towns[1]?.count ?? 0}.`,
    },
    {
      q: "What is the most expensive HDB flat ever sold?",
      a: `The highest recorded HDB resale price is ${formatPriceFull(overallMax)} in ${maxTown?.town ?? "Singapore"}. Million-dollar flats are typically large units (maisonettes, DBSS, or executive flats) with long remaining leases, on high floors, in mature estates.`,
    },
    {
      q: "Which HDB towns have the most million-dollar flats?",
      a: `The top 5 towns are: ${towns.slice(0, 5).map((t) => `${townDisplayName(t.town)} (${t.count})`).join(", ")}. Central, mature towns with good MRT connectivity dominate the million-dollar segment.`,
    },
  ];

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Insights", item: "https://fair-comparisons.com/insights" },
        { "@type": "ListItem", position: 3, name: "Million-Dollar HDB", item: "https://fair-comparisons.com/insights/million-dollar-hdb" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/insights" className="hover:text-gray-600">Insights</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">Million-Dollar HDB</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-green-50/60 to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">HDB Market</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Million-Dollar HDB Tracker</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Tracking every HDB resale transaction above S$1,000,000 in Singapore. {totalMillionFlats.toLocaleString()} flats and counting.
          </p>
        </div>
      </section>

      {/* Definition Block */}
      <div className="mx-auto max-w-[1120px] px-5 pt-8 md:px-8">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">How many million-dollar HDB flats are there?</h2>
          <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
            There are <strong>{totalMillionFlats.toLocaleString()} recorded HDB resale transactions</strong> at S$1 million or above in Singapore.
            {topTown && ` ${townDisplayName(topTown.town)} leads all towns with ${topTown.count} million-dollar transactions.`}
            {` The highest price ever recorded is ${formatPriceFull(overallMax)}`}
            {maxTown && ` in ${townDisplayName(maxTown.town)}`}.
            {yearlyTrend.length >= 2 && ` In ${yearlyTrend[yearlyTrend.length - 1].year}, there were ${yearlyTrend[yearlyTrend.length - 1].count} million-dollar transactions, ${yearlyTrend[yearlyTrend.length - 1].count > yearlyTrend[yearlyTrend.length - 2].count ? "up" : "down"} from ${yearlyTrend[yearlyTrend.length - 2].count} in ${yearlyTrend[yearlyTrend.length - 2].year}.`}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-10 lg:col-span-3">

            {/* Yearly Trend */}
            {yearlyTrend.length >= 3 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Year-by-Year Trend</h2>
                <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                  The million-dollar HDB phenomenon has accelerated sharply. In {yearlyTrend[0].year}, only {yearlyTrend[0].count} flats
                  crossed the S$1M mark. By {yearlyTrend[yearlyTrend.length - 1].year}, that number had grown to{" "}
                  {yearlyTrend[yearlyTrend.length - 1].count}. The average price of a million-dollar flat has also risen, from{" "}
                  {formatPrice(yearlyTrend[0].avgPrice)} in {yearlyTrend[0].year} to{" "}
                  {formatPrice(yearlyTrend[yearlyTrend.length - 1].avgPrice)} in {yearlyTrend[yearlyTrend.length - 1].year}.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        <th className="pb-2 pr-4">Year</th>
                        <th className="pb-2 pr-4 text-right">Transactions</th>
                        <th className="pb-2 text-right">Avg Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {yearlyTrend.map((y) => (
                        <tr key={y.year}>
                          <td className="py-2.5 pr-4 font-medium text-gray-900">{y.year}</td>
                          <td className="py-2.5 pr-4 text-right font-bold text-gray-900">{y.count.toLocaleString()}</td>
                          <td className="py-2.5 text-right text-gray-600">{formatPrice(y.avgPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Town Rankings */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Million-Dollar HDB Flats by Town</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                {townDisplayName(topTown.town)} leads all HDB towns with {topTown.count} million-dollar transactions and a record
                price of {formatPriceFull(topTown.maxPrice)}. Central, mature estates dominate this list because they combine
                large flat types (maisonettes, DBSS), long remaining leases, and proximity to MRT stations and the CBD.
              </p>
              <div className="mt-4 space-y-2">
                {towns.slice(0, 20).map((t, i) => {
                  const w = Math.max(15, Math.round((t.count / topTown.count) * 100));
                  const slug = townSlug(t.town);
                  return (
                    <Link key={t.town} href={`/property-agents/hdb/${slug}`}
                      className="block rounded-lg border border-gray-100 bg-white px-4 py-3 transition hover:border-teal-200 hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${i < 3 ? "bg-green-600" : i < 10 ? "bg-green-400" : "bg-gray-400"}`}>{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{townDisplayName(t.town)}</p>
                            <p className="text-xs text-gray-400">Top street: {t.topStreet} ({t.topStreetCount} txns)</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{t.count} flats</p>
                          <p className="text-xs text-gray-400">Max: {formatPrice(t.maxPrice)}</p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                        <div className="h-1.5 rounded-full bg-green-300" style={{ width: `${w}%` }} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* What drives prices */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">What Makes an HDB Flat Worth S$1 Million?</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  Million-dollar HDB flats share several common characteristics. The most important factor is size:
                  maisonettes (two-storey HDB units no longer built since 1995), DBSS flats (developed by private
                  developers with higher-spec finishes), and executive flats make up the majority of S$1M+ transactions.
                </p>
                <p>
                  Remaining lease matters significantly. Flats with 80+ years of remaining lease command higher prices
                  because they allow full CPF usage and bank financing. Location is the third factor: mature estates
                  near MRT stations, within walking distance of the CBD or popular schools, consistently achieve
                  higher valuations.
                </p>
                <p>
                  Floor level also plays a role. High-floor units with unobstructed views can command premiums of
                  15-25% over low-floor units in the same block. Renovation quality, while subjective, can add
                  S$50,000-S$100,000 for extensively renovated units.
                </p>
              </div>
            </section>

            {/* FAQ */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h2>
              <div className="mt-4 space-y-5">
                {faqItems.map((f, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-gray-900">{f.q}</h3>
                    <p className="mt-1.5 text-[15px] leading-[1.75] text-gray-600">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-6">
              <h3 className="text-lg font-bold text-gray-900">Explore HDB prices by town</h3>
              <p className="mt-2 text-[15px] text-gray-600">
                View detailed HDB resale analysis for every town in Singapore, including prices by flat type, floor premiums, and lease age impact.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {towns.slice(0, 8).map((t) => (
                  <Link key={t.town} href={`/property-agents/hdb/${townSlug(t.town)}`}
                    className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-50">
                    {townDisplayName(t.town)}
                  </Link>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-gray-400">Source: HDB Resale Flat Prices via data.gov.sg. Analysis by FairComparisons.</p>
          </div>

          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Key Numbers</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Total S$1M+ flats</dt><dd className="font-bold text-gray-900">{totalMillionFlats.toLocaleString()}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Highest price</dt><dd className="font-bold text-gray-900">{formatPrice(overallMax)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Towns with S$1M+</dt><dd className="font-bold text-gray-900">{towns.length}</dd></div>
                {yearlyTrend.length > 0 && <div className="flex justify-between"><dt className="text-gray-500">{yearlyTrend[yearlyTrend.length - 1].year} count</dt><dd className="font-bold text-gray-900">{yearlyTrend[yearlyTrend.length - 1].count}</dd></div>}
              </dl>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Top 5 Towns</h3>
              <div className="mt-4 space-y-3">
                {towns.slice(0, 5).map((t) => (
                  <Link key={t.town} href={`/property-agents/hdb/${townSlug(t.town)}`}
                    className="flex items-center justify-between text-sm hover:text-teal-600">
                    <span className="text-gray-600">{townDisplayName(t.town)}</span>
                    <span className="font-bold text-gray-900">{t.count}</span>
                  </Link>
                ))}
              </div>
            </div>

            <EmailCapture
              variant="sidebar"
              source="insight-million-hdb"
              pagePath="/insights/million-dollar-hdb"
              heading="Get market insights"
              description="New data analyses and market reports delivered to your inbox."
            />

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">More Insights</h3>
              <div className="mt-3 space-y-2">
                <Link href="/insights/freehold-premium" className="block text-sm text-gray-600 hover:text-teal-600">Freehold Premium by District</Link>
                <Link href="/insights/court-case-statistics" className="block text-sm text-gray-600 hover:text-teal-600">Court Case Statistics</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
