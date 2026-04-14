import Link from "next/link";
import { notFound } from "next/navigation";
import { HDB_TOWNS, townFromSlug, townDisplayName, getHdbTownData } from "../../../lib/hdbData";
import { formatPrice, formatPriceFull } from "../../../lib/narrativeHelpers";
import PriceTrendChart from "../../../components/PriceTrendChart";
import FlatTypeBars from "../../../components/FlatTypeBars";
import StatCard from "../../../components/StatCard";
import EmailCapture from "../../../components/EmailCapture";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = false;
type Props = { params: Promise<{ town: string }> };

// --- Helpers ---
function pctChange(a: number, b: number) {
  if (!b) return { pct: 0, dir: "neutral" as const };
  const p = Math.round(((a - b) / b) * 100);
  return { pct: Math.abs(p), dir: p > 2 ? ("up" as const) : p < -2 ? ("down" as const) : ("neutral" as const) };
}

function affordBadge(median: number) {
  if (median >= 800_000) return { label: "Premium", css: "text-amber-700 bg-amber-50 border-amber-200" };
  if (median >= 600_000) return { label: "Above Average", css: "text-teal-700 bg-teal-50 border-teal-200" };
  if (median >= 450_000) return { label: "Mid-range", css: "text-gray-700 bg-gray-50 border-gray-200" };
  return { label: "Affordable", css: "text-green-700 bg-green-50 border-green-200" };
}

// --- Meta ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { town: slug } = await params;
  const t = townFromSlug(slug);
  if (!t) return {};
  const d = townDisplayName(t.name);
  return {
    title: `HDB Resale Prices in ${d} (2024-2026) - Trends, Analysis & Data`,
    description: `How much does an HDB flat cost in ${d}? Detailed analysis of ${d} resale prices by flat type, floor level, lease age, and flat model. Based on actual HDB transaction data.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/hdb/${slug}` },
  };
}

export async function generateStaticParams() {
  return HDB_TOWNS.map((t) => ({ town: t.slug }));
}

// --- Page ---
export default async function HdbTownPage({ params }: Props) {
  const { town: slug } = await params;
  const town = townFromSlug(slug);
  if (!town) notFound();

  const display = townDisplayName(town.name);
  const data = await getHdbTownData(town.name);

  const trend = data.priceTrend;
  const recentPrice = trend[0]?.median_price ?? 0;
  const yearAgoPrice = trend[11]?.median_price ?? trend[trend.length - 1]?.median_price ?? 0;
  const yoy = pctChange(recentPrice, yearAgoPrice);
  const badge = affordBadge(data.medianPrice);
  const fourRoom = data.flatTypes.find((t) => t.flat_type === "4 ROOM");
  const fiveRoom = data.flatTypes.find((t) => t.flat_type === "5 ROOM");
  const threeRoom = data.flatTypes.find((t) => t.flat_type === "3 ROOM");
  const hasMillionDollar = data.maxPrice >= 1_000_000;

  const vsSg = pctChange(data.medianPrice, data.sgMedianHdb);
  const highFloor = data.storeyPremium[0];
  const lowFloor = data.storeyPremium[data.storeyPremium.length - 1];
  const storeyPremiumPct = highFloor && lowFloor ? pctChange(highFloor.median_price, lowFloor.median_price) : null;

  const newestEra = data.leaseAnalysis.find((e) => e.era.includes("New"));
  const oldestEra = data.leaseAnalysis.find((e) => e.era.includes("Old"));
  const leaseSpread = newestEra && oldestEra ? pctChange(newestEra.price_per_sqm, oldestEra.price_per_sqm) : null;

  const dbss = data.flatModels.find((m) => m.flat_model === "DBSS");
  const maisonette = data.flatModels.find((m) => m.flat_model === "Maisonette");
  const dominant = data.flatModels[0];

  // Nearby towns for comparison (closest in price)
  const nearbyTowns = data.townComparison
    .map((t) => ({ ...t, diff: Math.abs(t.median_price - data.medianPrice) }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 3);

  const cheaperTown = data.townComparison.filter((t) => t.median_price < data.medianPrice * 0.85).slice(-1)[0];
  const pricierTown = data.townComparison.filter((t) => t.median_price > data.medianPrice * 1.15)[0];

  // Charts
  const chartData = trend.map((t) => ({ month: t.year_month.slice(2), price: t.median_price, transactions: t.txns }));
  const barData = data.flatTypes.slice(0, 6).map((t) => ({
    name: t.flat_type.replace(" ROOM", "rm").replace("EXECUTIVE", "Exec"),
    median: t.median_price,
    count: t.txns,
  }));

  // Schema
  const faqItems = [
    fourRoom && {
      q: `How much does a 4-room HDB flat cost in ${display}?`,
      a: `The median 4-room HDB resale price in ${display} is ${formatPriceFull(fourRoom.median_price)}, based on ${fourRoom.txns.toLocaleString()} transactions. Prices range from ${formatPrice(fourRoom.min_price)} to ${formatPrice(fourRoom.max_price)} depending on floor level, remaining lease, and flat model.`,
    },
    fiveRoom && {
      q: `How much does a 5-room HDB flat cost in ${display}?`,
      a: `A 5-room flat in ${display} trades at a median of ${formatPriceFull(fiveRoom.median_price)} (${fiveRoom.txns.toLocaleString()} transactions). This is ${Math.round(((fiveRoom.median_price - (fourRoom?.median_price ?? 0)) / (fourRoom?.median_price ?? 1)) * 100)}% more than a 4-room.`,
    },
    storeyPremiumPct && storeyPremiumPct.pct > 5 && {
      q: `Does floor level affect HDB prices in ${display}?`,
      a: `Yes. For 4-room flats in ${display}, high-floor units (${highFloor.storey_range}) sell for a median of ${formatPriceFull(highFloor.median_price)}, while low-floor units (${lowFloor.storey_range}) sell for ${formatPriceFull(lowFloor.median_price)}. That is a ${storeyPremiumPct.pct}% premium for higher floors.`,
    },
    hasMillionDollar && {
      q: `Are there million-dollar HDB flats in ${display}?`,
      a: `Yes. The highest recorded HDB resale price in ${display} is ${formatPriceFull(data.maxPrice)}. Million-dollar flats in this town are typically large units (maisonettes or 5-room) with long remaining lease, on high floors, and in sought-after blocks.`,
    },
    {
      q: `Is ${display} a good town to buy an HDB flat?`,
      a: `${display}'s median resale price of ${formatPrice(data.medianPrice)} is ${vsSg.dir === "up" ? `${vsSg.pct}% above` : vsSg.dir === "down" ? `${vsSg.pct}% below` : "roughly in line with"} the national median. ${yoy.dir === "up" ? `Prices have risen ${yoy.pct}% year-on-year, signalling strong demand.` : yoy.dir === "down" ? `Prices have softened ${yoy.pct}% year-on-year.` : "Prices have been stable."} ${nearbyTowns.length > 0 ? `Comparable alternatives include ${nearbyTowns.map((t) => townDisplayName(t.town)).join(", ")}.` : ""}`,
    },
  ].filter(Boolean) as Array<{ q: string; a: string }>;

  const schemas = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: `${display} HDB`, item: `https://fair-comparisons.com/property-agents/hdb/${slug}` },
    ]},
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map((f) => ({
      "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a },
    }))},
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">{display}</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-teal-50/60 to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${badge.css}`}>{badge.label}</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">{display} HDB Resale Prices</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Comprehensive analysis of {data.totalTxns.toLocaleString()} HDB resale transactions in {display}, covering prices by flat type, floor level premiums, lease age impact, and flat model valuations. All data from HDB via data.gov.sg.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Median Price" value={formatPrice(data.medianPrice)} trend={vsSg.dir} trendValue={`${vsSg.pct}% vs avg`} />
            <StatCard label="12-Month Trend" value={`${yoy.dir === "up" ? "+" : yoy.dir === "down" ? "-" : ""}${yoy.pct}%`} trend={yoy.dir} subtext="year on year" />
            <StatCard label="Transactions" value={data.totalTxns.toLocaleString()} subtext="since 2017" />
            <StatCard label="Price Range" value={`${formatPrice(data.minPrice)} - ${formatPrice(data.maxPrice)}`} subtext={hasMillionDollar ? "incl. million-dollar flats" : ""} />
          </div>
        </div>
      </section>

      {/* Definition Block - optimized for featured snippets and AI extraction */}
      <div className="mx-auto max-w-[1120px] px-5 pt-8 md:px-8">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">How much does an HDB flat cost in {display}?</h2>
          <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
            The median HDB resale price in {display} is <strong>{formatPrice(data.medianPrice)}</strong>,
            based on {data.totalTxns.toLocaleString()} transactions recorded since July 2017.
            {fourRoom && ` A 4-room flat costs ${formatPrice(fourRoom.median_price)}.`}
            {fiveRoom && ` A 5-room flat costs ${formatPrice(fiveRoom.median_price)}.`}
            {` This is ${vsSg.dir === "up" ? `${vsSg.pct}% above` : vsSg.dir === "down" ? `${vsSg.pct}% below` : "in line with"} the national HDB median of ${formatPrice(data.sgMedianHdb)}.`}
            {yoy.dir === "up" ? ` Prices have risen ${yoy.pct}% year-on-year.` : yoy.dir === "down" ? ` Prices have dropped ${yoy.pct}% year-on-year.` : " Prices have been stable over the past year."}
            {hasMillionDollar && ` ${display} has million-dollar HDB flats, with the highest recorded price at ${formatPrice(data.maxPrice)}.`}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-10 lg:col-span-3">

            {/* 1. Market Overview - Deep Text */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">{display} HDB Market in 2026</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  The HDB resale market in {display} has recorded {data.totalTxns.toLocaleString()} transactions
                  between July 2017 and April 2026. At a median resale price of {formatPrice(data.medianPrice)},
                  {display} is {vsSg.dir === "up" ? `${vsSg.pct}% more expensive than` : vsSg.dir === "down" ? `${vsSg.pct}% cheaper than` : "priced similarly to"} the
                  Singapore-wide HDB median of {formatPrice(data.sgMedianHdb)}.
                </p>

                <p>
                  {yoy.dir === "up"
                    ? `Prices have climbed ${yoy.pct}% over the past twelve months, from ${formatPrice(yearAgoPrice)} to ${formatPrice(recentPrice)}. This rate of appreciation outpaces general inflation and reflects sustained buyer demand in ${display}. Buyers who purchased a year ago have already seen paper gains of approximately ${formatPrice(recentPrice - yearAgoPrice)} on a typical unit.`
                    : yoy.dir === "down"
                    ? `Prices have softened ${yoy.pct}% year-on-year, from ${formatPrice(yearAgoPrice)} to ${formatPrice(recentPrice)}. This cooling may present opportunities for buyers who have been priced out in recent quarters.`
                    : `Prices have remained stable over the past year, hovering between ${formatPrice(yearAgoPrice)} and ${formatPrice(recentPrice)}. This stability suggests the market has found an equilibrium after the sharp rises of 2022-2023.`}
                </p>

                {fourRoom && fiveRoom && (
                  <p>
                    The most commonly transacted flat type in {display} is the {data.flatTypes[0].flat_type.toLowerCase()},
                    with {data.flatTypes[0].txns.toLocaleString()} recorded resales. A 4-room flat in {display} costs
                    a median of {formatPriceFull(fourRoom.median_price)}, while a 5-room flat costs {formatPriceFull(fiveRoom.median_price)}.
                    {threeRoom && ` Buyers on a tighter budget can consider 3-room flats at ${formatPriceFull(threeRoom.median_price)}, though supply is limited with only ${threeRoom.txns.toLocaleString()} transactions in the data set.`}
                  </p>
                )}

                {hasMillionDollar && (
                  <p>
                    {display} has entered the million-dollar HDB club. The highest recorded resale price is{" "}
                    {formatPriceFull(data.maxPrice)}, placing it among the growing number of towns where HDB flats
                    have breached the seven-figure mark. These transactions typically involve large executive or
                    maisonette units with 80+ years of remaining lease, located in mature blocks with unobstructed views.
                  </p>
                )}
              </div>
            </section>

            {/* 2. Price Trend Chart */}
            {chartData.length >= 6 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Monthly Price Trend</h2>
                <p className="mt-1 text-sm text-gray-500">Median resale price per month in {display}.</p>
                <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
                  <PriceTrendChart data={chartData} />
                </div>
                <p className="mt-2 text-[11px] text-gray-400">Source: HDB Resale Flat Prices, data.gov.sg</p>
              </section>
            )}

            {/* 3. Floor Level Premium - Deep Text */}
            {storeyPremiumPct && storeyPremiumPct.pct > 5 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">The High-Floor Premium in {display}</h2>
                <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                  <p>
                    Floor level is one of the most significant price factors in {display}&apos;s HDB market. For 4-room
                    flats, the data shows a clear staircase pattern: units on floors {highFloor.storey_range} sell for a
                    median of {formatPriceFull(highFloor.median_price)}, while ground-floor units ({lowFloor.storey_range})
                    sell for {formatPriceFull(lowFloor.median_price)}. That is a{" "}
                    <strong>{storeyPremiumPct.pct}% premium</strong> for higher floors, or roughly{" "}
                    {formatPrice(highFloor.median_price - lowFloor.median_price)} more in absolute terms.
                  </p>
                  <p>
                    This premium reflects several factors: better ventilation and natural light, reduced noise from
                    ground-level activity, improved views (especially for blocks near parks or open areas), and
                    a perception of privacy. For buyers on a budget, choosing a lower floor in a preferred block can
                    save {formatPrice(highFloor.median_price - lowFloor.median_price)} while keeping the same address.
                  </p>
                  {data.storeyPremium.length >= 3 && (
                    <div className="mt-2 space-y-1.5">
                      {data.storeyPremium.map((s) => {
                        const w = Math.max(30, Math.round((s.median_price / highFloor.median_price) * 100));
                        return (
                          <div key={s.storey_range} className="flex items-center gap-3 text-sm">
                            <span className="w-16 text-xs text-gray-500">{s.storey_range}</span>
                            <div className="flex-1">
                              <div className="h-5 rounded bg-gray-100">
                                <div className="h-5 rounded bg-teal-200 flex items-center px-2" style={{ width: `${w}%` }}>
                                  <span className="text-xs font-medium text-teal-800">{formatPrice(s.median_price)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 4. Lease Age Analysis - Deep Text */}
            {data.leaseAnalysis.length >= 3 && leaseSpread && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Lease Age and Price in {display}</h2>
                <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                  <p>
                    Remaining lease is arguably the most important factor for long-term value. In {display},
                    the price per square metre tells a clear story about how the market values newer versus older flats.
                    {newestEra && oldestEra && (
                      <> Newer flats (built 2015 onwards) trade at {formatPriceFull(newestEra.price_per_sqm)}/sqm,
                      while pre-1990 flats trade at {formatPriceFull(oldestEra.price_per_sqm)}/sqm. That is a{" "}
                      <strong>{leaseSpread.pct}% premium</strong> for newer stock on a per-square-metre basis.</>
                    )}
                  </p>
                  <p>
                    However, older flats in {display} are not always the worse deal. Pre-1990 flats tend to be
                    significantly larger (averaging {oldestEra?.avg_sqm ?? 0} sqm versus {newestEra?.avg_sqm ?? 0} sqm
                    for new builds). Buyers who prioritise space over remaining lease may find better value in mature
                    blocks, especially if they plan to live in the flat rather than sell it within a decade.
                  </p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                          <th className="pb-2 pr-4">Lease Era</th>
                          <th className="pb-2 pr-4 text-right">Avg Price</th>
                          <th className="pb-2 pr-4 text-right">Per sqm</th>
                          <th className="pb-2 pr-4 text-right">Avg Size</th>
                          <th className="pb-2 text-right">Txns</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.leaseAnalysis.map((e) => (
                          <tr key={e.era}>
                            <td className="py-2.5 pr-4 font-medium text-gray-900">{e.era}</td>
                            <td className="py-2.5 pr-4 text-right">{formatPrice(e.avg_price)}</td>
                            <td className="py-2.5 pr-4 text-right font-medium text-gray-900">{formatPriceFull(e.price_per_sqm)}/sqm</td>
                            <td className="py-2.5 pr-4 text-right">{e.avg_sqm} sqm</td>
                            <td className="py-2.5 text-right text-gray-500">{e.txns.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* 5. Flat Model Analysis */}
            {data.flatModels.length >= 4 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Flat Models in {display}</h2>
                <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                  <p>
                    {display} has {data.flatModels.length} distinct flat models in its resale stock.
                    The most common is the {dominant.flat_model} ({dominant.txns.toLocaleString()} transactions,
                    average {formatPrice(dominant.avg_price)}).
                    {dbss && (
                      <> DBSS (Design, Build and Sell Scheme) flats command a significant premium at{" "}
                      {formatPriceFull(dbss.price_per_sqm)}/sqm, which is{" "}
                      {Math.round(((dbss.price_per_sqm - dominant.price_per_sqm) / dominant.price_per_sqm) * 100)}%
                      higher than the standard {dominant.flat_model} at {formatPriceFull(dominant.price_per_sqm)}/sqm.
                      DBSS flats were developed by private developers with higher-spec finishes, which explains the premium even years after completion.</>
                    )}
                  </p>
                  {maisonette && (
                    <p>
                      Maisonettes, the two-storey HDB units that are no longer built, trade at an average of{" "}
                      {formatPrice(maisonette.avg_price)} in {display}. With {maisonette.txns} transactions in the
                      data set, they represent a niche but sought-after segment. Their scarcity (HDB stopped building
                      maisonettes in 1995) and generous floor area make them popular with families who want landed-style
                      living at HDB prices.
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* 6. Flat Type Comparison Chart */}
            {barData.length >= 2 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Price by Flat Type</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Median resale price across {data.flatTypes.length} flat categories.
                  {fourRoom && fiveRoom && ` A 5-room costs ${Math.round(((fiveRoom.median_price - fourRoom.median_price) / fourRoom.median_price) * 100)}% more than a 4-room.`}
                </p>
                <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
                  <FlatTypeBars data={barData} />
                </div>
              </section>
            )}

            {/* 7. Popular Streets */}
            {data.topStreets.length >= 3 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Most Traded Streets in {display}</h2>
                <div className="mt-4 space-y-3 text-[15px] leading-[1.75] text-gray-600">
                  <p>
                    The most actively traded address in {display} is {data.topStreets[0].street_name}, with{" "}
                    {data.topStreets[0].txns} recorded transactions at a median of {formatPriceFull(data.topStreets[0].median_price)}.
                    {data.topStreets[1] && data.topStreets[1].median_price > data.topStreets[0].median_price * 1.15 && (
                      <> Interestingly, {data.topStreets[1].street_name} commands a higher median of{" "}
                      {formatPriceFull(data.topStreets[1].median_price)} despite fewer transactions, suggesting
                      it is a more sought-after address within {display}.</>
                    )}
                    {data.topStreets.length >= 4 && (
                      <> The price spread across the top streets ranges from {formatPrice(Math.min(...data.topStreets.slice(0, 5).map(s => s.median_price)))} to{" "}
                      {formatPrice(Math.max(...data.topStreets.slice(0, 5).map(s => s.median_price)))}, reflecting
                      differences in block age, proximity to MRT stations, and proximity to amenities.</>
                    )}
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  {data.topStreets.map((s, i) => {
                    const w = Math.max(20, Math.round((s.txns / data.topStreets[0].txns) * 100));
                    return (
                      <div key={s.street_name} className="rounded-lg border border-gray-100 bg-white px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">{i + 1}</span>
                            <span className="text-sm font-medium text-gray-900">{s.street_name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900">{formatPrice(s.median_price)}</span>
                            <span className="ml-2 text-xs text-gray-400">{s.txns} txns</span>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                          <div className="h-1.5 rounded-full bg-teal-200" style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 8. How {display} Compares */}
            {nearbyTowns.length >= 2 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">How {display} Compares to Other Towns</h2>
                <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                  <p>
                    In terms of pricing, {display} sits closest to{" "}
                    {nearbyTowns.map((t) => `${townDisplayName(t.town)} (${formatPrice(t.median_price)})`).join(", ")}.
                    {cheaperTown && (
                      <> Buyers looking for a more affordable alternative might consider {townDisplayName(cheaperTown.town)} at{" "}
                      {formatPrice(cheaperTown.median_price)}, which is {pctChange(data.medianPrice, cheaperTown.median_price).pct}% cheaper.</>
                    )}
                    {pricierTown && (
                      <> Those willing to pay more for centrality or prestige could look at {townDisplayName(pricierTown.town)} at{" "}
                      {formatPrice(pricierTown.median_price)}.</>
                    )}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {nearbyTowns.map((t) => {
                    const otherSlug = HDB_TOWNS.find((h) => h.name === t.town)?.slug;
                    if (!otherSlug) return null;
                    const pair = slug < otherSlug ? `${slug}-vs-${otherSlug}` : `${otherSlug}-vs-${slug}`;
                    return (
                      <Link key={t.town} href={`/property-agents/hdb-compare/${pair}`}
                        className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100">
                        {display} vs {townDisplayName(t.town)}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 9. Buyer Insight Box */}
            <section className="rounded-xl border border-teal-100 bg-teal-50/50 p-6">
              <h2 className="text-lg font-bold text-gray-900">What This Means If You Are Buying in {display}</h2>
              <div className="mt-3 space-y-3 text-[15px] leading-[1.75] text-gray-600">
                {data.medianPrice > data.sgMedianHdb * 1.1 ? (
                  <p>
                    {display} is a premium HDB town. Expect to pay more here than in most other locations.
                    The premium reflects{" "}
                    {display === "Bishan" || display === "Queenstown" || display === "Bukit Merah"
                      ? "its central location and excellent MRT connectivity"
                      : display === "Bukit Timah"
                      ? "the Bukit Timah address and limited HDB supply in this area"
                      : display === "Central Area"
                      ? "city-centre living with walkable access to the CBD"
                      : "strong demand driven by mature amenities and transport links"}.
                    {storeyPremiumPct && storeyPremiumPct.pct > 15 && ` Budget-conscious buyers should note that choosing a lower floor can save up to ${formatPrice(highFloor.median_price - lowFloor.median_price)}.`}
                  </p>
                ) : data.medianPrice < data.sgMedianHdb * 0.9 ? (
                  <p>
                    {display} is one of the more affordable HDB towns, making it accessible for first-time buyers
                    and those working within HDB loan limits. At {formatPrice(data.medianPrice)}, a typical flat here
                    falls comfortably within the CPF-serviced range for dual-income households.
                    {fourRoom && ` A 4-room flat at ${formatPrice(fourRoom.median_price)} leaves room for renovation without stretching the budget.`}
                  </p>
                ) : (
                  <p>
                    {display} offers middle-ground pricing at {formatPrice(data.medianPrice)}. It is neither
                    the cheapest nor the most expensive option, which means buyers get reasonable value without
                    compromising too much on location or amenities.
                  </p>
                )}

                {yoy.dir === "up" && yoy.pct > 8 && (
                  <p>
                    With prices up {yoy.pct}% year-on-year, {display} is appreciating faster than average.
                    Buyers who are waiting for prices to drop may find themselves paying more in six months.
                    That said, past performance does not guarantee future trends.
                  </p>
                )}

                {oldestEra && newestEra && (
                  <p>
                    Consider the trade-off between space and lease. Older flats in {display} average {oldestEra.avg_sqm} sqm
                    at {formatPrice(oldestEra.avg_price)}, while newer flats average {newestEra.avg_sqm} sqm at{" "}
                    {formatPrice(newestEra.avg_price)}. Older flats give you more room per dollar but come with shorter leases,
                    which can affect future resale value and CPF usage eligibility.
                  </p>
                )}
              </div>
            </section>

            {/* 10. FAQ */}
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
              <p className="mt-4 text-[11px] text-gray-400">Source: HDB Resale Flat Prices via data.gov.sg. Analysis by FairComparisons.</p>
            </section>

            {/* Best agents CTA */}
            <div className="mt-8 rounded-xl border border-teal-200 bg-teal-50 p-6">
              <h3 className="text-lg font-bold text-gray-900">Looking for an HDB agent in {display}?</h3>
              <p className="mt-2 text-[15px] text-gray-600">
                We ranked the top-performing agents for HDB resale transactions in {display} based on actual transaction records.
              </p>
              <Link href={`/property-agents/best/hdb/${slug}`} className="mt-4 inline-block rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">
                View best HDB agents in {display} &rarr;
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Quick Answer</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
                A typical HDB resale flat in {display} costs around <strong>{formatPrice(data.medianPrice)}</strong>.
                {fourRoom && ` 4-room: ${formatPrice(fourRoom.median_price)}.`}
                {fiveRoom && ` 5-room: ${formatPrice(fiveRoom.median_price)}.`}
                {storeyPremiumPct && storeyPremiumPct.pct > 10 && ` High floors cost ${storeyPremiumPct.pct}% more than low floors.`}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Prices by Type</h3>
              <div className="mt-4 space-y-3">
                {data.flatTypes.slice(0, 5).map((t) => (
                  <div key={t.flat_type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t.flat_type}</span>
                    <span className="text-sm font-bold text-gray-900">{formatPrice(t.median_price)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-xl border p-5 ${vsSg.dir === "up" ? "border-amber-200 bg-amber-50" : vsSg.dir === "down" ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">vs National Median</h3>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">{formatPrice(data.medianPrice)}</p>
              <p className="mt-1 text-sm text-gray-600">
                {vsSg.dir === "up" ? `${vsSg.pct}% above` : vsSg.dir === "down" ? `${vsSg.pct}% below` : "In line with"} national median of {formatPrice(data.sgMedianHdb)}
              </p>
            </div>

            <EmailCapture
              variant="sidebar"
              source="hdb-town"
              pagePath={`/property-agents/hdb/${slug}`}
              heading="HDB price alerts"
              description={`Get notified when new resale data is available for ${display}.`}
            />

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Compare Other Towns</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {HDB_TOWNS.filter((t) => t.slug !== slug).slice(0, 12).map((t) => (
                  <Link key={t.slug} href={`/property-agents/hdb/${t.slug}`}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition hover:border-teal-300 hover:text-teal-600">
                    {townDisplayName(t.name)}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
