import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  HDB_TOWNS,
  townFromSlug,
  townDisplayName,
  flatTypeFromSlug,
  getHdbSegmentData,
  getQualifyingHdbSegments,
} from "../../../../lib/hdbData";
import { formatPrice, formatPriceFull } from "../../../../lib/narrativeHelpers";
import { seoTitle } from "../../../../lib/seoTitle";
import StatCard from "../../../../components/StatCard";
import SellCtaBand from "../../../../components/SellCtaBand";

export const revalidate = 43200; // 12h; matches the town pages.
export const dynamicParams = false; // Only the density-gated segments render; the rest 404.

type Props = { params: Promise<{ town: string; flatType: string }> };

const psm = (n: number) => `S$${Math.round(n).toLocaleString()} psm`;
const pctDiff = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);

export async function generateStaticParams() {
  const segments = await getQualifyingHdbSegments();
  return segments.map((s) => ({ town: s.townSlug, flatType: s.flatSlug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { town: townSlug, flatType: flatSlug } = await params;
  const town = townFromSlug(townSlug);
  const flat = flatTypeFromSlug(flatSlug);
  if (!town || !flat) return {};
  const data = await getHdbSegmentData(town.name, flat.name);
  if (!data) return {};
  const d = townDisplayName(town.name);
  return {
    title: seoTitle(`${flat.label} HDB Resale Prices in ${d}`),
    description: `How much is a ${flat.label.toLowerCase()} HDB flat in ${d}? Median ${formatPriceFull(
      data.summary.median_price,
    )} across ${data.summary.txns.toLocaleString()} recent resales, from ${formatPrice(
      data.summary.min_price,
    )} to ${formatPrice(data.summary.max_price)}. Prices by floor, flat age, model, and block.`,
    alternates: {
      canonical: `https://fair-comparisons.com/property-agents/hdb/${townSlug}/${flatSlug}`,
    },
  };
}

export default async function HdbSegmentPage({ params }: Props) {
  const { town: townSlug, flatType: flatSlug } = await params;
  const town = townFromSlug(townSlug);
  const flat = flatTypeFromSlug(flatSlug);
  if (!town || !flat) notFound();

  const [data, allSegments] = await Promise.all([
    getHdbSegmentData(town.name, flat.name),
    getQualifyingHdbSegments(),
  ]);
  if (!data) notFound();

  const display = townDisplayName(town.name);
  const { summary, storey, lease, models, blocks } = data;
  const label = flat.label;

  // Sibling flat types in the same town (silo linking + honest comparison).
  const siblings = allSegments
    .filter((s) => s.townSlug === townSlug && s.flatSlug !== flatSlug)
    .sort((a, b) => a.median - b.median);

  // Floor premium: highest vs lowest storey band that cleared the sample gate.
  const storeySorted = [...storey].sort((a, b) => a.storey_range.localeCompare(b.storey_range));
  const lowBand = storeySorted[0];
  const highBand = storeySorted[storeySorted.length - 1];
  const floorPremium = storey.length >= 2 && lowBand && highBand ? pctDiff(highBand.median_price, lowBand.median_price) : null;

  // Lease age: newest vs oldest era by price per sqm.
  const leaseSorted = [...lease].sort((a, b) => a.era.localeCompare(b.era));
  const oldestEra = leaseSorted[0];
  const newestEra = leaseSorted[leaseSorted.length - 1];
  const leaseSpread = lease.length >= 2 && oldestEra && newestEra ? pctDiff(newestEra.median_psm, oldestEra.median_psm) : null;

  const dominantModel = models[0];
  const priciestModel = [...models].sort((a, b) => b.median_price - a.median_price)[0];
  const topBlock = blocks[0];

  const faqItems = [
    {
      q: `How much does a ${label.toLowerCase()} HDB flat cost in ${display}?`,
      a: `The median ${label.toLowerCase()} HDB resale price in ${display} is ${formatPriceFull(
        summary.median_price,
      )}, based on ${summary.txns.toLocaleString()} recent transactions. Prices range from ${formatPriceFull(
        summary.min_price,
      )} to ${formatPriceFull(summary.max_price)} depending on floor level, remaining lease, flat model, and exact block.`,
    },
    floorPremium !== null && floorPremium > 3 && highBand && lowBand
      ? {
          q: `Does floor level affect ${label.toLowerCase()} prices in ${display}?`,
          a: `Yes. ${label} flats on higher floors (${highBand.storey_range}) sell for a median of ${formatPriceFull(
            highBand.median_price,
          )}, versus ${formatPriceFull(lowBand.median_price)} on lower floors (${lowBand.storey_range}). That is a ${floorPremium}% premium for height.`,
        }
      : null,
    leaseSpread !== null && Math.abs(leaseSpread) > 3 && newestEra && oldestEra
      ? {
          q: `Are newer ${label.toLowerCase()} flats in ${display} more expensive?`,
          a: `Per square metre, ${label.toLowerCase()} flats from the ${newestEra.era} trade at ${psm(
            newestEra.median_psm,
          )}, compared with ${psm(oldestEra.median_psm)} for ${oldestEra.era} stock, a ${Math.abs(
            leaseSpread,
          )}% ${leaseSpread > 0 ? "premium for the longer remaining lease" : "difference"}.`,
        }
      : null,
    topBlock
      ? {
          q: `Which blocks have the most ${label.toLowerCase()} resale activity in ${display}?`,
          a: `Over the recent window, ${topBlock.block} ${topBlock.street_name} recorded the most ${label.toLowerCase()} resales (${topBlock.txns}), at a median of ${formatPriceFull(
            topBlock.median_price,
          )}. Block-level medians vary with floor, unit size, and lease.`,
        }
      : null,
  ].filter(Boolean) as { q: string; a: string }[];

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Property Agents", item: "https://fair-comparisons.com/property-agents" },
        { "@type": "ListItem", position: 3, name: `HDB in ${display}`, item: `https://fair-comparisons.com/property-agents/hdb/${townSlug}` },
        { "@type": "ListItem", position: 4, name: `${label} in ${display}`, item: `https://fair-comparisons.com/property-agents/hdb/${townSlug}/${flatSlug}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/property-agents" className="hover:text-gray-600">Property Agents</Link>
          <span className="mx-1.5">/</span>
          <Link href={`/property-agents/hdb/${townSlug}`} className="hover:text-gray-600">HDB in {display}</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">{label}</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-[var(--line-2)] bg-[var(--blue-wash)] px-3 py-1 text-xs font-semibold text-[var(--blue-deep)]">HDB resale · {display}</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">{label} HDB Resale Prices in {display}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-600">
            The median {label.toLowerCase()} HDB resale price in {display} is {formatPriceFull(summary.median_price)}, based on {summary.txns.toLocaleString()} recent transactions. Actual prices run from {formatPriceFull(summary.min_price)} to {formatPriceFull(summary.max_price)} depending on floor, remaining lease, flat model and the exact block. Here is how each of those moves the price.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Median price" value={formatPrice(summary.median_price)} subtext={`${summary.txns.toLocaleString()} recent sales`} />
          <StatCard label="Price range" value={`${formatPrice(summary.min_price)}–${formatPrice(summary.max_price)}`} subtext="Low to high" />
          <StatCard label="Median per sqm" value={psm(summary.median_psm)} subtext={`~${summary.avg_sqm} sqm average size`} />
          <StatCard label="Recent transactions" value={summary.txns.toLocaleString()} subtext="Resales in this segment" />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_300px]">
          <article className="space-y-10">

            {storey.length >= 2 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">How floor level changes the price</h2>
                {floorPremium !== null && highBand && lowBand && (
                  <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                    {label} units on higher floors ({highBand.storey_range}) trade at a median of {formatPriceFull(highBand.median_price)}, while lower floors ({lowBand.storey_range}) sit at {formatPriceFull(lowBand.median_price)}. That is a {Math.abs(floorPremium)}% {floorPremium >= 0 ? "premium for height" : "difference"} in this segment.
                  </p>
                )}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        <th className="pb-2 pr-3">Floor band</th>
                        <th className="pb-2 pr-3 text-right">Median price</th>
                        <th className="pb-2 text-right">Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {storeySorted.map((s) => (
                        <tr key={s.storey_range}>
                          <td className="py-2.5 pr-3 font-medium text-gray-900">{s.storey_range}</td>
                          <td className="py-2.5 pr-3 text-right text-gray-900">{formatPriceFull(s.median_price)}</td>
                          <td className="py-2.5 text-right text-gray-500">{s.txns.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {lease.length >= 2 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">How flat age changes the price</h2>
                {leaseSpread !== null && newestEra && oldestEra && (
                  <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                    Comparing per-square-metre value strips out unit size. {label} flats built in the {newestEra.era} trade at {psm(newestEra.median_psm)}, against {psm(oldestEra.median_psm)} for {oldestEra.era} stock. Newer flats carry more remaining lease, which the market prices in.
                  </p>
                )}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        <th className="pb-2 pr-3">Built</th>
                        <th className="pb-2 pr-3 text-right">Median per sqm</th>
                        <th className="pb-2 text-right">Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leaseSorted.map((l) => (
                        <tr key={l.era}>
                          <td className="py-2.5 pr-3 font-medium text-gray-900">{l.era}</td>
                          <td className="py-2.5 pr-3 text-right text-gray-900">{psm(l.median_psm)}</td>
                          <td className="py-2.5 text-right text-gray-500">{l.txns.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {models.length >= 2 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Prices by flat model</h2>
                <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                  Most {label.toLowerCase()} resales in {display} are {dominantModel.flat_model} flats ({dominantModel.txns.toLocaleString()} sales, median {formatPriceFull(dominantModel.median_price)}).
                  {priciestModel && priciestModel.flat_model !== dominantModel.flat_model
                    ? ` ${priciestModel.flat_model} units command the top of the range at ${formatPriceFull(priciestModel.median_price)}.`
                    : ""}
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        <th className="pb-2 pr-3">Model</th>
                        <th className="pb-2 pr-3 text-right">Median price</th>
                        <th className="pb-2 text-right">Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {models.map((m) => (
                        <tr key={m.flat_model}>
                          <td className="py-2.5 pr-3 font-medium text-gray-900">{m.flat_model}</td>
                          <td className="py-2.5 pr-3 text-right text-gray-900">{formatPriceFull(m.median_price)}</td>
                          <td className="py-2.5 text-right text-gray-500">{m.txns.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {blocks.length >= 3 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Most-traded blocks</h2>
                <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                  The blocks with the most {label.toLowerCase()} resale activity give the clearest read on what buyers are actually paying, because each has enough sales to form a reliable median.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        <th className="pb-2 pr-3">Block</th>
                        <th className="pb-2 pr-3 text-right">Median price</th>
                        <th className="pb-2 text-right">Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {blocks.map((b) => (
                        <tr key={`${b.block}-${b.street_name}`}>
                          <td className="py-2.5 pr-3 font-medium text-gray-900">{b.block} {b.street_name}</td>
                          <td className="py-2.5 pr-3 text-right text-gray-900">{formatPriceFull(b.median_price)}</td>
                          <td className="py-2.5 text-right text-gray-500">{b.txns.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">Source: HDB resale transaction records. Medians shown for blocks with the most recent sales.</p>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold text-gray-900">Frequently asked questions</h2>
              <div className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
                {faqItems.map((f) => (
                  <details key={f.q} className="group py-4">
                    <summary className="cursor-pointer list-none font-semibold text-gray-900">{f.q}</summary>
                    <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </article>

          <aside className="space-y-6">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-gray-900">Selling a {label.toLowerCase()} in {display}?</p>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                See the agents with the strongest recent track record selling {label.toLowerCase()} flats in {display}, ranked on CEA transaction data.
              </p>
              <Link href={`/sell?utm_source=hdb-segment`} className="mt-3 inline-block rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--blue-deep)]">
                Compare agents &rarr;
              </Link>
            </div>

            {siblings.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900">Other flat types in {display}</p>
                <ul className="mt-3 space-y-2">
                  {siblings.map((s) => (
                    <li key={s.flatSlug} className="flex items-center justify-between gap-3 text-sm">
                      <Link href={`/property-agents/hdb/${townSlug}/${s.flatSlug}`} className="font-medium text-[var(--blue)] hover:underline">{s.flatLabel}</Link>
                      <span className="text-gray-500">{formatPrice(s.median)}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/property-agents/hdb/${townSlug}`} className="mt-3 inline-block text-sm font-medium text-[var(--blue)] hover:underline">
                  Full {display} HDB market &rarr;
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>

      <SellCtaBand
        source="hdb-segment"
        heading={`Selling a ${label.toLowerCase()} flat in ${display}?`}
        sub={`Compare the agents who actually close ${label.toLowerCase()} resales in ${display}, ranked on real CEA transaction records. Always free for sellers.`}
      />
    </>
  );
}
