import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { formatPrice, formatPriceFull } from "../../lib/narrativeHelpers";
import EmailCapture from "../../components/EmailCapture";
import type { Metadata } from "next";

export const revalidate = 43200; // 12h; daily cron also force-revalidates

export const metadata: Metadata = {
  title: "Singapore Freehold Premium by District - How Much More Does Freehold Cost?",
  description: "Data-driven analysis of the freehold vs leasehold price gap across all Singapore districts. District 20 has the highest premium at over 70%. Based on URA transaction data.",
  alternates: { canonical: "https://fair-comparisons.com/insights/freehold-premium" },
};

type DistrictTenure = {
  district: string;
  districtName: string;
  districtSlug: string;
  freeholdMedian: number;
  freeholdTxns: number;
  leaseholdMedian: number;
  leaseholdTxns: number;
  premiumPct: number;
  premiumAbs: number;
};

export default async function FreeholdPremiumPage() {
  const [rpcRes, districtsRes] = await Promise.all([
    supabase.rpc("get_freehold_premium_by_district"),
    supabase.from("sg_districts").select("code, name, slug").not("slug", "is", null),
  ]);

  const raw = rpcRes.data ?? [];
  const districtMap = new Map((districtsRes.data ?? []).map((d: { code: string; name: string; slug: string }) => [d.code.replace("D", ""), { name: d.name.split(",")[0].trim(), slug: d.slug }]));

  // Pair freehold + leasehold per district
  const byDistrict = new Map<string, { freehold?: { txns: number; median: number }; leasehold?: { txns: number; median: number } }>();
  for (const r of raw) {
    const d = byDistrict.get(r.district) ?? {};
    if (r.tenure === "Freehold") d.freehold = { txns: Number(r.txns), median: Number(r.median_price) };
    else d.leasehold = { txns: Number(r.txns), median: Number(r.median_price) };
    byDistrict.set(r.district, d);
  }

  const districtData: DistrictTenure[] = Array.from(byDistrict.entries())
    .filter(([, d]) => d.freehold && d.leasehold)
    .map(([code, d]) => {
      const fm = d.freehold!.median;
      const lm = d.leasehold!.median;
      const info = districtMap.get(code);
      return {
        district: `D${code}`,
        districtName: info?.name ?? `District ${code}`,
        districtSlug: info?.slug ?? `d${code}`,
        freeholdMedian: Math.round(fm),
        freeholdTxns: d.freehold!.txns,
        leaseholdMedian: Math.round(lm),
        leaseholdTxns: d.leasehold!.txns,
        premiumPct: Math.round(((fm - lm) / lm) * 100),
        premiumAbs: Math.round(fm - lm),
      };
    })
    .sort((a, b) => b.premiumPct - a.premiumPct);

  const totalFreehold = districtData.reduce((s, d) => s + d.freeholdTxns, 0);
  const totalLeasehold = districtData.reduce((s, d) => s + d.leaseholdTxns, 0);
  const avgPremium = districtData.length > 0 ? Math.round(districtData.reduce((s, d) => s + d.premiumPct, 0) / districtData.length) : 0;
  const highestPremium = districtData[0] ?? { district: "N/A", districtName: "N/A", districtSlug: "", freeholdMedian: 0, freeholdTxns: 0, leaseholdMedian: 0, leaseholdTxns: 0, premiumPct: 0, premiumAbs: 0 };
  const lowestPremium = districtData[districtData.length - 1] ?? highestPremium;

  const faqItems = [
    {
      q: "How much more does freehold cost vs leasehold in Singapore?",
      a: `On average, freehold properties cost ${avgPremium}% more than 99-year leasehold across all districts. The premium ranges from ${lowestPremium.premiumPct}% in ${lowestPremium.districtName} (${lowestPremium.district}) to ${highestPremium.premiumPct}% in ${highestPremium.districtName} (${highestPremium.district}). This is based on ${(totalFreehold + totalLeasehold).toLocaleString()} URA transactions.`,
    },
    {
      q: "Which district has the highest freehold premium?",
      a: `${highestPremium.districtName} (${highestPremium.district}) has the highest freehold premium at ${highestPremium.premiumPct}%. Freehold properties here cost a median of ${formatPriceFull(highestPremium.freeholdMedian)} versus ${formatPriceFull(highestPremium.leaseholdMedian)} for leasehold, a gap of ${formatPrice(highestPremium.premiumAbs)}.`,
    },
    {
      q: "Is freehold always worth the premium in Singapore?",
      a: `Not always. For a 5-10 year hold, the extra cost of freehold may not be recovered through appreciation alone. Freehold makes the most financial sense for long-term holds (20+ years) where lease decay on 99-year properties starts to accelerate. Newer 99-year leasehold developments often offer modern facilities at lower prices.`,
    },
  ];

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Insights", item: "https://fair-comparisons.com/insights" },
        { "@type": "ListItem", position: 3, name: "Freehold Premium", item: "https://fair-comparisons.com/insights/freehold-premium" },
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
          <span className="text-gray-600">Freehold Premium</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-teal-50/60 to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">Private Property</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Freehold Premium by District</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            How much more does freehold cost than leasehold in each Singapore district? A data-driven breakdown based on {(totalFreehold + totalLeasehold).toLocaleString()} URA transactions.
          </p>
        </div>
      </section>

      {/* Definition Block */}
      <div className="mx-auto max-w-[1120px] px-5 pt-8 md:px-8">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">How much more does freehold cost in Singapore?</h2>
          <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
            Across {districtData.length} districts with sufficient data, freehold properties cost an average of <strong>{avgPremium}% more</strong> than
            99-year leasehold equivalents. The premium varies widely: from {lowestPremium.premiumPct}% in {lowestPremium.districtName} to{" "}
            {highestPremium.premiumPct}% in {highestPremium.districtName}. This analysis is based on {totalFreehold.toLocaleString()} freehold
            and {totalLeasehold.toLocaleString()} leasehold transactions recorded by URA.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-10 lg:col-span-3">

            {/* Analysis */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">The Freehold Premium Explained</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  In Singapore, most private residential properties are either freehold (no expiry) or 99-year leasehold
                  (the land reverts to the state after 99 years). The price difference between these two tenure types
                  is called the freehold premium, and it varies significantly by district.
                </p>
                <p>
                  {highestPremium.districtName} ({highestPremium.district}) has the largest premium at {highestPremium.premiumPct}%.
                  Freehold properties here cost a median of {formatPriceFull(highestPremium.freeholdMedian)}, while leasehold
                  units cost {formatPriceFull(highestPremium.leaseholdMedian)}. That is a gap of{" "}
                  {formatPrice(highestPremium.premiumAbs)} per unit.
                </p>
                <p>
                  At the other end, {lowestPremium.districtName} ({lowestPremium.district}) has the smallest premium at just{" "}
                  {lowestPremium.premiumPct}%. In districts with newer leasehold stock (freshly launched 99-year developments),
                  the premium tends to be lower because the leasehold units still have nearly their full lease remaining.
                </p>
              </div>
            </section>

            {/* District Table */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Freehold vs Leasehold by District</h2>
              <div className="mt-4 space-y-2">
                {districtData.map((d, i) => {
                  const barW = Math.max(10, Math.min(100, Math.round((d.premiumPct / highestPremium.premiumPct) * 100)));
                  return (
                    <Link key={d.district} href={`/property-agents/district/${d.districtSlug}`}
                      className="block rounded-lg border border-gray-100 bg-white px-4 py-3 transition hover:border-teal-200 hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${i < 3 ? "bg-teal-600" : i < 10 ? "bg-teal-400" : "bg-gray-400"}`}>{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{d.district} {d.districtName}</p>
                            <p className="text-xs text-gray-400">
                              Freehold: {formatPrice(d.freeholdMedian)} ({d.freeholdTxns.toLocaleString()} txns) · Leasehold: {formatPrice(d.leaseholdMedian)} ({d.leaseholdTxns.toLocaleString()} txns)
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-extrabold text-teal-600">+{d.premiumPct}%</p>
                          <p className="text-xs text-gray-400">{formatPrice(d.premiumAbs)} gap</p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                        <div className="h-1.5 rounded-full bg-teal-200" style={{ width: `${barW}%` }} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Buyer advice */}
            <section className="rounded-xl border border-teal-100 bg-teal-50/50 p-6">
              <h2 className="text-lg font-bold text-gray-900">Should You Buy Freehold or Leasehold?</h2>
              <div className="mt-3 space-y-3 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  The answer depends on your holding period. For investors planning to sell within 5-10 years,
                  a newer 99-year leasehold development often delivers comparable returns at a lower entry price.
                  The lease decay effect is minimal in the first 30-40 years.
                </p>
                <p>
                  For buyers planning to hold for 20+ years or pass the property to the next generation,
                  freehold eliminates the uncertainty of lease decay and ensures the property retains its
                  full value indefinitely. The premium you pay today may be justified by stronger capital
                  preservation over decades.
                </p>
                <p>
                  In districts where the premium exceeds 50%, the entry cost difference is substantial.
                  Consider whether that extra {formatPrice(Math.round(districtData.filter(d => d.premiumPct >= 50).reduce((s, d) => s + d.premiumAbs, 0) / Math.max(1, districtData.filter(d => d.premiumPct >= 50).length)))} (average gap in high-premium districts)
                  could be better deployed elsewhere in your portfolio.
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

            <p className="text-[11px] text-gray-400">Source: URA Private Residential Property Transactions. Analysis by FairComparisons.</p>
          </div>

          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Key Numbers</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Avg premium</dt><dd className="font-bold text-teal-600">+{avgPremium}%</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Highest premium</dt><dd className="font-bold text-gray-900">{highestPremium.district} (+{highestPremium.premiumPct}%)</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Lowest premium</dt><dd className="font-bold text-gray-900">{lowestPremium.district} (+{lowestPremium.premiumPct}%)</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Districts analyzed</dt><dd className="font-bold text-gray-900">{districtData.length}</dd></div>
              </dl>
            </div>

            <EmailCapture
              variant="sidebar"
              source="insight-freehold"
              pagePath="/insights/freehold-premium"
              heading="Get market insights"
              description="New data analyses and market reports delivered to your inbox."
            />

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">More Insights</h3>
              <div className="mt-3 space-y-2">
                <Link href="/insights/million-dollar-hdb" className="block text-sm text-gray-600 hover:text-teal-600">Million-Dollar HDB Tracker</Link>
                <Link href="/insights/court-case-statistics" className="block text-sm text-gray-600 hover:text-teal-600">Court Case Statistics</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
