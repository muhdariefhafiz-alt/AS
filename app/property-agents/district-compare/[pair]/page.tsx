import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { getDistrictMarketData } from "../../../lib/districtData";
import { formatPrice, formatPsf } from "../../../lib/narrativeHelpers";
import EmailCapture from "../../../components/EmailCapture";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = true;

type Props = { params: Promise<{ pair: string }> };

const DISTRICTS: { code: string; slug: string; short: string }[] = [
  { code: "D01", slug: "d01-raffles-place", short: "Raffles Place" },
  { code: "D02", slug: "d02-anson", short: "Anson" },
  { code: "D03", slug: "d03-queenstown", short: "Queenstown" },
  { code: "D04", slug: "d04-telok-blangah", short: "Telok Blangah" },
  { code: "D05", slug: "d05-clementi", short: "Clementi" },
  { code: "D06", slug: "d06-high-street", short: "High Street" },
  { code: "D07", slug: "d07-beach-road", short: "Beach Road" },
  { code: "D08", slug: "d08-little-india", short: "Little India" },
  { code: "D09", slug: "d09-orchard", short: "Orchard" },
  { code: "D10", slug: "d10-bukit-timah", short: "Bukit Timah" },
  { code: "D11", slug: "d11-novena", short: "Novena" },
  { code: "D12", slug: "d12-balestier", short: "Balestier" },
  { code: "D13", slug: "d13-macpherson", short: "Macpherson" },
  { code: "D14", slug: "d14-geylang", short: "Geylang" },
  { code: "D15", slug: "d15-katong", short: "Katong" },
  { code: "D16", slug: "d16-bedok", short: "Bedok" },
  { code: "D17", slug: "d17-changi", short: "Changi" },
  { code: "D18", slug: "d18-tampines", short: "Tampines" },
  { code: "D19", slug: "d19-serangoon", short: "Serangoon" },
  { code: "D20", slug: "d20-bishan", short: "Bishan" },
  { code: "D21", slug: "d21-upper-bukit-timah", short: "Upper Bukit Timah" },
  { code: "D22", slug: "d22-jurong", short: "Jurong" },
  { code: "D23", slug: "d23-bukit-panjang", short: "Bukit Panjang" },
  { code: "D24", slug: "d24-lim-chu-kang", short: "Lim Chu Kang" },
  { code: "D25", slug: "d25-kranji", short: "Kranji" },
  { code: "D26", slug: "d26-upper-thomson", short: "Upper Thomson" },
  { code: "D27", slug: "d27-yishun", short: "Yishun" },
  { code: "D28", slug: "d28-seletar", short: "Seletar" },
];

// Generate popular comparison pairs (adjacent + popular vs popular)
function generatePairs() {
  const popular = ["D01", "D09", "D10", "D15", "D05", "D03", "D19", "D20", "D11", "D21"];
  const pairs: [string, string][] = [];

  // Adjacent districts
  for (let i = 0; i < DISTRICTS.length - 1; i++) {
    pairs.push([DISTRICTS[i].code, DISTRICTS[i + 1].code]);
  }

  // Popular cross-comparisons
  for (let i = 0; i < popular.length; i++) {
    for (let j = i + 1; j < popular.length; j++) {
      const existing = pairs.find(
        ([a, b]) => (a === popular[i] && b === popular[j]) || (a === popular[j] && b === popular[i])
      );
      if (!existing) pairs.push([popular[i], popular[j]]);
    }
  }

  return pairs;
}

function parseSlug(pair: string): { d1: string; d2: string } | null {
  const m = pair.match(/^d(\d{2})-vs-d(\d{2})$/);
  if (!m) return null;
  return { d1: `D${m[1]}`, d2: `D${m[2]}` };
}

function findDistrict(code: string) {
  return DISTRICTS.find((d) => d.code === code);
}

export async function generateStaticParams() {
  const pairs = generatePairs();
  return pairs.map(([a, b]) => ({
    pair: `${a.toLowerCase()}-vs-${b.toLowerCase()}`,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params;
  const parsed = parseSlug(pair);
  if (!parsed) return {};
  const a = findDistrict(parsed.d1);
  const b = findDistrict(parsed.d2);
  if (!a || !b) return {};
  return {
    title: `${a.short} vs ${b.short} - Property Price Comparison (${a.code} vs ${b.code})`,
    description: `Compare property prices in ${a.short} (${a.code}) and ${b.short} (${b.code}). Median condo prices, transaction volumes, top developments, rental yields, and agent activity. Based on URA data.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/district-compare/${pair}` },
  };
}

function pctDiff(a: number, b: number): string {
  if (!b) return "N/A";
  const p = Math.round(((a - b) / b) * 100);
  return p > 0 ? `+${p}%` : `${p}%`;
}

function winner(a: number, b: number, higherBetter = true): "a" | "b" | "tie" {
  if (Math.abs(a - b) < a * 0.02) return "tie";
  if (higherBetter) return a > b ? "a" : "b";
  return a < b ? "a" : "b";
}

export default async function DistrictComparePage({ params }: Props) {
  const { pair } = await params;
  const parsed = parseSlug(pair);
  if (!parsed) notFound();

  const distA = findDistrict(parsed.d1);
  const distB = findDistrict(parsed.d2);
  if (!distA || !distB) notFound();

  // Fetch district records from DB to get full names
  const [dbA, dbB] = await Promise.all([
    supabase.from("sg_districts").select("code, name, slug").eq("code", distA.code).single(),
    supabase.from("sg_districts").select("code, name, slug").eq("code", distB.code).single(),
  ]);

  if (!dbA.data || !dbB.data) notFound();

  const [dataA, dataB] = await Promise.all([
    getDistrictMarketData(distA.code),
    getDistrictMarketData(distB.code),
  ]);

  const nameA = dbA.data.name.split(",")[0].trim();
  const nameB = dbB.data.name.split(",")[0].trim();
  const slugA = dbA.data.slug;
  const slugB = dbB.data.slug;

  const freeholdA = dataA.tenureAnalysis.find((t) => t.tenure_type === "Freehold");
  const freeholdB = dataB.tenureAnalysis.find((t) => t.tenure_type === "Freehold");
  const leaseholdA = dataA.tenureAnalysis.find((t) => t.tenure_type === "99-year Leasehold");
  const leaseholdB = dataB.tenureAnalysis.find((t) => t.tenure_type === "99-year Leasehold");

  const metrics = [
    { label: "Median condo price", a: dataA.medianPrice, b: dataB.medianPrice, fmt: formatPrice, higher: "neutral" as const },
    { label: "Total transactions", a: dataA.totalTxns, b: dataB.totalTxns, fmt: (n: number) => n.toLocaleString(), higher: "better" as const },
    { label: "Average price", a: dataA.avgPrice, b: dataB.avgPrice, fmt: formatPrice, higher: "neutral" as const },
    { label: "Min price", a: dataA.minPrice, b: dataB.minPrice, fmt: formatPrice, higher: "neutral" as const },
    { label: "Max price", a: dataA.maxPrice, b: dataB.maxPrice, fmt: formatPrice, higher: "neutral" as const },
    ...(freeholdA && freeholdB ? [{ label: "Freehold median", a: freeholdA.median_price, b: freeholdB.median_price, fmt: formatPrice, higher: "neutral" as const }] : []),
    ...(leaseholdA && leaseholdB ? [{ label: "99-yr leasehold median", a: leaseholdA.median_price, b: leaseholdB.median_price, fmt: formatPrice, higher: "neutral" as const }] : []),
    ...(dataA.avgRentPsf && dataB.avgRentPsf ? [{ label: "Avg rental PSF", a: dataA.avgRentPsf, b: dataB.avgRentPsf, fmt: formatPsf, higher: "better" as const }] : []),
  ];

  const topA = dataA.topProjects.slice(0, 5);
  const topB = dataB.topProjects.slice(0, 5);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is ${nameA} or ${nameB} more expensive for condos?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: dataA.medianPrice > dataB.medianPrice
            ? `${nameA} (${distA.code}) has a higher median condo price of ${formatPrice(dataA.medianPrice)} compared to ${formatPrice(dataB.medianPrice)} in ${nameB} (${distB.code}), a difference of ${pctDiff(dataA.medianPrice, dataB.medianPrice)}.`
            : `${nameB} (${distB.code}) has a higher median condo price of ${formatPrice(dataB.medianPrice)} compared to ${formatPrice(dataA.medianPrice)} in ${nameA} (${distA.code}), a difference of ${pctDiff(dataB.medianPrice, dataA.medianPrice)}.`,
        },
      },
      {
        "@type": "Question",
        name: `Which district has more property transactions, ${distA.code} or ${distB.code}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${distA.code} ${nameA} has ${dataA.totalTxns.toLocaleString()} recorded transactions while ${distB.code} ${nameB} has ${dataB.totalTxns.toLocaleString()}. ${dataA.totalTxns > dataB.totalTxns ? nameA : nameB} is the more active market.`,
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
      { "@type": "ListItem", position: 3, name: `${distA.code} vs ${distB.code}` },
    ],
  };

  // Intro paragraph - unique per comparison
  const priceDiffPct = Math.abs(Math.round(((dataA.medianPrice - dataB.medianPrice) / dataB.medianPrice) * 100));
  const moreExpensive = dataA.medianPrice > dataB.medianPrice ? nameA : nameB;
  const lessExpensive = dataA.medianPrice > dataB.medianPrice ? nameB : nameA;
  const moreActive = dataA.totalTxns > dataB.totalTxns ? nameA : nameB;

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
          <span className="text-gray-600">{distA.code} vs {distB.code}</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8 md:py-20">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue)]">District Comparison</p>
          <h1 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
            {nameA} ({distA.code}) vs {nameB} ({distB.code})
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-400">
            Side-by-side property market comparison based on URA transaction records. Condo prices, transaction volumes, tenure analysis, and top developments.
          </p>

          {/* Quick stats */}
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{formatPrice(dataA.medianPrice)}</p>
              <p className="mt-1 text-xs text-slate-500">{distA.code} median</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{formatPrice(dataB.medianPrice)}</p>
              <p className="mt-1 text-xs text-slate-500">{distB.code} median</p>
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
        {/* Definition block for AI SEO */}
        <p className="text-[15px] leading-[1.75] text-gray-600">
          {nameA} ({distA.code}) and {nameB} ({distB.code}) are two of Singapore&apos;s 28 postal districts, each with distinct property market characteristics.
          {priceDiffPct > 5
            ? ` ${moreExpensive} is ${priceDiffPct}% more expensive than ${lessExpensive} based on median condo transaction prices from URA records.`
            : ` Both districts have similar median condo prices within 5% of each other.`}
          {` ${moreActive} is the more active market with ${dataA.totalTxns > dataB.totalTxns ? dataA.totalTxns.toLocaleString() : dataB.totalTxns.toLocaleString()} recorded transactions.`}
          {` This comparison is based on actual URA transaction data, not listing prices.`}
        </p>

        {/* Comparison table */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900">Price and volume comparison</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Metric</th>
                  <th className="px-4 py-3 text-center">
                    <Link href={`/property-agents/district/${slugA}`} className="font-semibold text-[var(--blue)] hover:underline">{distA.code} {nameA}</Link>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <Link href={`/property-agents/district/${slugB}`} className="font-semibold text-[var(--blue)] hover:underline">{distB.code} {nameB}</Link>
                  </th>
                  <th className="pl-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.map((m) => {
                  const w = winner(m.a, m.b, m.higher === "better");
                  return (
                    <tr key={m.label}>
                      <td className="py-3.5 pr-4 text-gray-700">{m.label}</td>
                      <td className={`px-4 py-3.5 text-center font-medium ${w === "a" ? "text-[var(--blue)]" : "text-gray-600"}`}>
                        {m.fmt(m.a)}
                      </td>
                      <td className={`px-4 py-3.5 text-center font-medium ${w === "b" ? "text-[var(--blue)]" : "text-gray-600"}`}>
                        {m.fmt(m.b)}
                      </td>
                      <td className="pl-4 py-3.5 text-center text-xs text-gray-400">
                        {pctDiff(m.a, m.b)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Property types */}
        <section className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{distA.code} {nameA} - property types</h3>
            <div className="mt-3 space-y-2">
              {dataA.propertyTypes.slice(0, 6).map((t) => (
                <div key={t.property_type} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3">
                  <span className="text-sm text-gray-700">{t.property_type}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{formatPrice(t.median_price)}</span>
                    <span className="ml-2 text-xs text-gray-400">({t.txns} txns)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{distB.code} {nameB} - property types</h3>
            <div className="mt-3 space-y-2">
              {dataB.propertyTypes.slice(0, 6).map((t) => (
                <div key={t.property_type} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3">
                  <span className="text-sm text-gray-700">{t.property_type}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{formatPrice(t.median_price)}</span>
                    <span className="ml-2 text-xs text-gray-400">({t.txns} txns)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Top developments */}
        <section className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Top developments in {nameA}</h3>
            <div className="mt-3 space-y-2">
              {topA.map((p) => (
                <div key={p.project} className="rounded-lg border border-gray-100 bg-white p-3">
                  <p className="text-sm font-medium text-gray-900">{p.project}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{p.street} - {formatPrice(p.median_price)} median - {p.txns} sales</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Top developments in {nameB}</h3>
            <div className="mt-3 space-y-2">
              {topB.map((p) => (
                <div key={p.project} className="rounded-lg border border-gray-100 bg-white p-3">
                  <p className="text-sm font-medium text-gray-900">{p.project}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{p.street} - {formatPrice(p.median_price)} median - {p.txns} sales</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Floor premium comparison */}
        {dataA.floorPremium.length >= 3 && dataB.floorPremium.length >= 3 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-gray-900">Floor-level price premium</h2>
            <p className="mt-2 text-sm text-gray-500">How prices change by storey level in each district.</p>
            <div className="mt-4 grid gap-8 md:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-700">{distA.code} {nameA}</p>
                {dataA.floorPremium.map((f) => (
                  <div key={f.floor_range} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{f.floor_range}</span>
                    <span className="font-medium text-gray-900">{formatPrice(f.median_price)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-700">{distB.code} {nameB}</p>
                {dataB.floorPremium.map((f) => (
                  <div key={f.floor_range} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{f.floor_range}</span>
                    <span className="font-medium text-gray-900">{formatPrice(f.median_price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Active agents */}
        {(dataA.activeAgents.length > 0 || dataB.activeAgents.length > 0) && (
          <section className="mt-10 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Active agents in {nameA}</h3>
              <div className="mt-3 space-y-2">
                {dataA.activeAgents.slice(0, 5).map((a) => (
                  <Link key={a.agent_license} href={`/property-agents/agent/${a.agent_license.toLowerCase()}`}
                    className="group block rounded-lg border border-gray-100 bg-white p-3 transition hover:border-[var(--line-2)]">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-[var(--blue)]">{a.agent_name}</p>
                    <p className="text-xs text-gray-400">{a.agency_name} - {a.listings} listings</p>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Active agents in {nameB}</h3>
              <div className="mt-3 space-y-2">
                {dataB.activeAgents.slice(0, 5).map((a) => (
                  <Link key={a.agent_license} href={`/property-agents/agent/${a.agent_license.toLowerCase()}`}
                    className="group block rounded-lg border border-gray-100 bg-white p-3 transition hover:border-[var(--line-2)]">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-[var(--blue)]">{a.agent_name}</p>
                    <p className="text-xs text-gray-400">{a.agency_name} - {a.listings} listings</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Other comparisons */}
        <section className="mt-10 border-t border-gray-100 pt-8">
          <h2 className="text-xl font-bold text-gray-900">More district comparisons</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {DISTRICTS.filter((d) => d.code !== distA.code && d.code !== distB.code)
              .slice(0, 6)
              .map((d) => (
                <Link
                  key={d.code}
                  href={`/property-agents/district-compare/${distA.code.toLowerCase()}-vs-${d.code.toLowerCase()}`}
                  className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 transition hover:border-[var(--line-2)] hover:text-[var(--blue)]"
                >
                  {distA.code} vs {d.code} {d.short}
                </Link>
              ))}
          </div>
        </section>

        {/* Email capture */}
        <div className="mt-10">
          <EmailCapture
            variant="inline"
            source="district-compare"
            pagePath={`/property-agents/district-compare/${pair}`}
            heading="Get district market updates"
            description="We'll notify you when new price data or district comparisons are published."
          />
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-xs text-gray-400">
          All data from URA (Urban Redevelopment Authority) transaction records. Prices are based on actual completed transactions,
          not listing or asking prices. This comparison is for informational purposes only and does not constitute investment advice.
        </p>
      </div>
    </>
  );
}
