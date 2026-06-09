import Link from "next/link";
import { notFound } from "next/navigation";
import { HDB_TOWNS, townFromSlug, townDisplayName, getHdbTownData } from "../../../lib/hdbData";
import { formatPrice } from "../../../lib/narrativeHelpers";
import EmailCapture from "../../../components/EmailCapture";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = true;

type Props = { params: Promise<{ pair: string }> };

function generatePairs() {
  const popular = ["ANG MO KIO", "BEDOK", "TAMPINES", "WOODLANDS", "PUNGGOL", "SENGKANG", "BISHAN", "QUEENSTOWN", "BUKIT MERAH", "TOA PAYOH"];
  const pairs: [string, string][] = [];

  // Sequential pairs
  for (let i = 0; i < HDB_TOWNS.length - 1; i++) {
    pairs.push([HDB_TOWNS[i].name, HDB_TOWNS[i + 1].name]);
  }

  // Popular cross-pairs
  for (let i = 0; i < popular.length; i++) {
    for (let j = i + 1; j < popular.length; j++) {
      const exists = pairs.find(
        ([a, b]) => (a === popular[i] && b === popular[j]) || (a === popular[j] && b === popular[i])
      );
      if (!exists) pairs.push([popular[i], popular[j]]);
    }
  }

  return pairs;
}

function parsePairSlug(pair: string): { t1: string; t2: string } | null {
  const parts = pair.split("-vs-");
  if (parts.length !== 2) return null;
  const town1 = HDB_TOWNS.find((t) => t.slug === parts[0]);
  const town2 = HDB_TOWNS.find((t) => t.slug === parts[1]);
  if (!town1 || !town2) return null;
  return { t1: town1.name, t2: town2.name };
}

function townSlug(name: string): string {
  return HDB_TOWNS.find((t) => t.name === name)?.slug ?? name.toLowerCase().replace(/[\s/]+/g, "-");
}

export async function generateStaticParams() {
  const pairs = generatePairs();
  return pairs.map(([a, b]) => ({
    pair: `${townSlug(a)}-vs-${townSlug(b)}`,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params;
  const parsed = parsePairSlug(pair);
  if (!parsed) return {};
  const nameA = townDisplayName(parsed.t1);
  const nameB = townDisplayName(parsed.t2);
  return {
    title: `HDB Prices: ${nameA} vs ${nameB} - Resale Price Comparison`,
    description: `Compare HDB resale prices in ${nameA} and ${nameB}. Median prices by flat type, price trends, storey premiums, and transaction volumes. Based on HDB resale transaction data.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/hdb-compare/${pair}` },
    // Low-demand permutation page: crawlable for users + internal links
    // (follow), but kept out of the index to focus equity on demand pages.
    robots: { index: false, follow: true },
  };
}

function pctDiff(a: number, b: number): string {
  if (!b) return "N/A";
  const p = Math.round(((a - b) / b) * 100);
  return p > 0 ? `+${p}%` : `${p}%`;
}

export default async function HdbComparePage({ params }: Props) {
  const { pair } = await params;
  const parsed = parsePairSlug(pair);
  if (!parsed) notFound();

  const [dataA, dataB] = await Promise.all([
    getHdbTownData(parsed.t1),
    getHdbTownData(parsed.t2),
  ]);

  const nameA = townDisplayName(parsed.t1);
  const nameB = townDisplayName(parsed.t2);
  const slugA = townSlug(parsed.t1);
  const slugB = townSlug(parsed.t2);

  const priceDiffPct = Math.abs(Math.round(((dataA.medianPrice - dataB.medianPrice) / dataB.medianPrice) * 100));
  const moreExpensive = dataA.medianPrice > dataB.medianPrice ? nameA : nameB;
  const moreActive = dataA.totalTxns > dataB.totalTxns ? nameA : nameB;

  // Match flat types for side-by-side
  const allFlatTypes = [...new Set([...dataA.flatTypes.map((f) => f.flat_type), ...dataB.flatTypes.map((f) => f.flat_type)])];
  const flatTypeOrder = ["1 ROOM", "2 ROOM", "3 ROOM", "4 ROOM", "5 ROOM", "EXECUTIVE", "MULTI-GENERATION"];
  allFlatTypes.sort((a, b) => flatTypeOrder.indexOf(a) - flatTypeOrder.indexOf(b));

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is ${nameA} or ${nameB} more expensive for HDB flats?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${moreExpensive} has higher median HDB resale prices. ${nameA} median is ${formatPrice(dataA.medianPrice)} while ${nameB} median is ${formatPrice(dataB.medianPrice)}, a difference of ${priceDiffPct}%.`,
        },
      },
      {
        "@type": "Question",
        name: `How many HDB resale transactions are there in ${nameA} vs ${nameB}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${nameA} has ${dataA.totalTxns.toLocaleString()} recorded HDB resale transactions and ${nameB} has ${dataB.totalTxns.toLocaleString()}. ${moreActive} is the more active resale market.`,
        },
      },
    ],
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "Property Agents", item: "https://fair-comparisons.com/property-agents" },
      { "@type": "ListItem", position: 3, name: `${nameA} vs ${nameB}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/property-agents" className="hover:text-gray-600">Property Agents</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">{nameA} vs {nameB}</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8 md:py-20">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue)]">HDB Resale Comparison</p>
          <h1 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
            {nameA} vs {nameB}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-400">
            HDB resale market comparison based on actual transaction data. Prices by flat type, storey premiums, and market activity.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{formatPrice(dataA.medianPrice)}</p>
              <p className="mt-1 text-xs text-slate-500">{nameA} median</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{formatPrice(dataB.medianPrice)}</p>
              <p className="mt-1 text-xs text-slate-500">{nameB} median</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-[var(--slate-2)]">{pctDiff(dataA.medianPrice, dataB.medianPrice)}</p>
              <p className="mt-1 text-xs text-slate-500">price difference</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{(dataA.totalTxns + dataB.totalTxns).toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">combined transactions</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        {/* Definition block */}
        <p className="text-[15px] leading-[1.75] text-gray-600">
          {nameA} and {nameB} are two of Singapore&apos;s 26 HDB towns.
          {priceDiffPct > 5
            ? ` ${moreExpensive} is ${priceDiffPct}% more expensive based on median HDB resale transaction prices.`
            : ` Both towns have similar median resale prices within 5% of each other.`}
          {` ${moreActive} has more resale activity with ${dataA.totalTxns > dataB.totalTxns ? dataA.totalTxns.toLocaleString() : dataB.totalTxns.toLocaleString()} transactions recorded.`}
          {dataA.maxPrice >= 1_000_000 || dataB.maxPrice >= 1_000_000
            ? ` ${dataA.maxPrice >= 1_000_000 && dataB.maxPrice >= 1_000_000 ? "Both towns" : dataA.maxPrice >= 1_000_000 ? nameA : nameB} ${dataA.maxPrice >= 1_000_000 && dataB.maxPrice >= 1_000_000 ? "have" : "has"} recorded million-dollar HDB transactions.`
            : ""}
          {" All data from HDB resale transaction records."}
        </p>

        {/* Flat type comparison */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900">Prices by flat type</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Flat Type</th>
                  <th className="px-4 py-3 text-center">
                    <Link href={`/property-agents/hdb/${slugA}`} className="font-semibold text-[var(--blue)] hover:underline">{nameA}</Link>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <Link href={`/property-agents/hdb/${slugB}`} className="font-semibold text-[var(--blue)] hover:underline">{nameB}</Link>
                  </th>
                  <th className="pl-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3.5 pr-4 font-medium text-gray-900">Overall median</td>
                  <td className={`px-4 py-3.5 text-center font-medium ${dataA.medianPrice >= dataB.medianPrice ? "text-[var(--blue)]" : "text-gray-600"}`}>
                    {formatPrice(dataA.medianPrice)}
                  </td>
                  <td className={`px-4 py-3.5 text-center font-medium ${dataB.medianPrice >= dataA.medianPrice ? "text-[var(--blue)]" : "text-gray-600"}`}>
                    {formatPrice(dataB.medianPrice)}
                  </td>
                  <td className="pl-4 py-3.5 text-center text-xs text-gray-400">{pctDiff(dataA.medianPrice, dataB.medianPrice)}</td>
                </tr>
                {allFlatTypes.map((ft) => {
                  const a = dataA.flatTypes.find((f) => f.flat_type === ft);
                  const b = dataB.flatTypes.find((f) => f.flat_type === ft);
                  if (!a && !b) return null;
                  const aPrice = a?.median_price ?? 0;
                  const bPrice = b?.median_price ?? 0;
                  return (
                    <tr key={ft}>
                      <td className="py-3.5 pr-4 text-gray-700">{ft}</td>
                      <td className="px-4 py-3.5 text-center text-gray-600">
                        {a ? formatPrice(a.median_price) : "-"}
                        {a && <span className="ml-1 text-xs text-gray-400">({a.txns})</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center text-gray-600">
                        {b ? formatPrice(b.median_price) : "-"}
                        {b && <span className="ml-1 text-xs text-gray-400">({b.txns})</span>}
                      </td>
                      <td className="pl-4 py-3.5 text-center text-xs text-gray-400">
                        {aPrice && bPrice ? pctDiff(aPrice, bPrice) : "-"}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="py-3.5 pr-4 font-medium text-gray-900">Total transactions</td>
                  <td className={`px-4 py-3.5 text-center font-medium ${dataA.totalTxns >= dataB.totalTxns ? "text-[var(--blue)]" : "text-gray-600"}`}>
                    {dataA.totalTxns.toLocaleString()}
                  </td>
                  <td className={`px-4 py-3.5 text-center font-medium ${dataB.totalTxns >= dataA.totalTxns ? "text-[var(--blue)]" : "text-gray-600"}`}>
                    {dataB.totalTxns.toLocaleString()}
                  </td>
                  <td className="pl-4 py-3.5 text-center text-xs text-gray-400">{pctDiff(dataA.totalTxns, dataB.totalTxns)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Storey premium */}
        {dataA.storeyPremium.length >= 2 && dataB.storeyPremium.length >= 2 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-gray-900">Storey premium comparison</h2>
            <p className="mt-2 text-sm text-gray-500">How HDB resale prices change by floor level.</p>
            <div className="mt-4 grid gap-8 md:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-700">{nameA}</p>
                {dataA.storeyPremium.map((s) => (
                  <div key={s.storey_range} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{s.storey_range}</span>
                    <span className="font-medium text-gray-900">{formatPrice(s.median_price)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-700">{nameB}</p>
                {dataB.storeyPremium.map((s) => (
                  <div key={s.storey_range} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{s.storey_range}</span>
                    <span className="font-medium text-gray-900">{formatPrice(s.median_price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Top streets */}
        <section className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Most traded streets in {nameA}</h3>
            <div className="mt-3 space-y-2">
              {dataA.topStreets.slice(0, 5).map((s) => (
                <div key={s.street_name} className="rounded-lg border border-gray-100 bg-white p-3">
                  <p className="text-sm font-medium text-gray-900">{s.street_name}</p>
                  <p className="text-xs text-gray-400">{formatPrice(s.median_price)} median - {s.txns} sales</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Most traded streets in {nameB}</h3>
            <div className="mt-3 space-y-2">
              {dataB.topStreets.slice(0, 5).map((s) => (
                <div key={s.street_name} className="rounded-lg border border-gray-100 bg-white p-3">
                  <p className="text-sm font-medium text-gray-900">{s.street_name}</p>
                  <p className="text-xs text-gray-400">{formatPrice(s.median_price)} median - {s.txns} sales</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Other comparisons */}
        <section className="mt-10 border-t border-gray-100 pt-8">
          <h2 className="text-xl font-bold text-gray-900">More HDB town comparisons</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {HDB_TOWNS.filter((t) => t.name !== parsed.t1 && t.name !== parsed.t2)
              .slice(0, 6)
              .map((t) => (
                <Link
                  key={t.slug}
                  href={`/property-agents/hdb-compare/${slugA}-vs-${t.slug}`}
                  className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 transition hover:border-[var(--line-2)] hover:text-[var(--blue)]"
                >
                  {nameA} vs {townDisplayName(t.name)}
                </Link>
              ))}
          </div>
        </section>

        {/* Email capture */}
        <div className="mt-10">
          <EmailCapture
            variant="inline"
            source="hdb-compare"
            pagePath={`/property-agents/hdb-compare/${pair}`}
            heading="Get HDB market updates"
            description="We'll notify you when new HDB resale data or town comparisons are published."
          />
        </div>

        <p className="mt-8 text-xs text-gray-400">
          All data from HDB resale transaction records. Prices reflect actual completed transactions.
          This comparison is for informational purposes only and does not constitute property advice.
        </p>
      </div>
    </>
  );
}
