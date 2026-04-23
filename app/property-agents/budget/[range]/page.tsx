import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { formatPrice, formatPriceFull } from "../../../lib/narrativeHelpers";
import type { Metadata } from "next";

export const revalidate = 43200; // 12h; daily cron also force-revalidates
export const dynamicParams = false;

type Props = { params: Promise<{ range: string }> };

const RANGES = [
  { slug: "under-500k", label: "Under S$500K", min: 0, max: 500000, desc: "affordable condos and HDB flats" },
  { slug: "500k-to-800k", label: "S$500K - S$800K", min: 500000, max: 800000, desc: "mid-range HDB and entry-level condos" },
  { slug: "800k-to-1m", label: "S$800K - S$1M", min: 800000, max: 1000000, desc: "premium HDB and suburban condos" },
  { slug: "1m-to-1-5m", label: "S$1M - S$1.5M", min: 1000000, max: 1500000, desc: "city-fringe condos and executive condominiums" },
  { slug: "1-5m-to-2m", label: "S$1.5M - S$2M", min: 1500000, max: 2000000, desc: "prime area condos" },
  { slug: "2m-to-3m", label: "S$2M - S$3M", min: 2000000, max: 3000000, desc: "premium condos in prime districts" },
  { slug: "3m-to-5m", label: "S$3M - S$5M", min: 3000000, max: 5000000, desc: "luxury condos and landed property" },
  { slug: "5m-to-10m", label: "S$5M - S$10M", min: 5000000, max: 10000000, desc: "ultra-luxury and Good Class Bungalows" },
  { slug: "above-10m", label: "Above S$10M", min: 10000000, max: 999999999, desc: "trophy properties and GCBs" },
];

export function generateStaticParams() {
  return RANGES.map(r => ({ range: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { range } = await params;
  const r = RANGES.find(x => x.slug === range);
  if (!r) return {};
  return {
    title: `What Can You Buy for ${r.label} in Singapore? - Property Price Guide`,
    description: `Explore Singapore property options in the ${r.label} price range. Districts, property types, and developments where ${r.desc} are available. Based on ${new Date().getFullYear()} URA and HDB transaction data.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/budget/${range}` },
  };
}

export default async function BudgetPage({ params }: Props) {
  const { range } = await params;
  const r = RANGES.find(x => x.slug === range);
  if (!r) notFound();

  // Fetch private transactions in range
  const { data: privateTxns } = await supabase
    .from("sg_private_transactions")
    .select("district, property_type, price, project, street, tenure")
    .gte("price", r.min)
    .lt("price", r.max)
    .order("price", { ascending: false })
    .limit(5000);

  // Fetch HDB transactions in range
  const { data: hdbTxns } = await supabase
    .from("sg_hdb_transactions")
    .select("town, flat_type, resale_price, block, street_name")
    .gte("resale_price", r.min)
    .lt("resale_price", r.max)
    .order("resale_price", { ascending: false })
    .limit(5000);

  const pvt = privateTxns ?? [];
  const hdb = hdbTxns ?? [];
  const totalTxns = pvt.length + hdb.length;

  // Aggregate by district
  const districtCounts: Record<string, { count: number; medianPrices: number[] }> = {};
  for (const t of pvt) {
    const d = `D${String(t.district).padStart(2, "0")}`;
    if (!districtCounts[d]) districtCounts[d] = { count: 0, medianPrices: [] };
    districtCounts[d].count++;
    districtCounts[d].medianPrices.push(Number(t.price));
  }
  const topDistricts = Object.entries(districtCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  // Aggregate HDB by town
  const townCounts: Record<string, { count: number; medianPrices: number[] }> = {};
  for (const t of hdb) {
    if (!townCounts[t.town]) townCounts[t.town] = { count: 0, medianPrices: [] };
    townCounts[t.town].count++;
    townCounts[t.town].medianPrices.push(Number(t.resale_price));
  }
  const topTowns = Object.entries(townCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  // Aggregate by property type
  const typeCounts: Record<string, number> = {};
  for (const t of pvt) {
    typeCounts[t.property_type] = (typeCounts[t.property_type] || 0) + 1;
  }
  if (hdb.length > 0) typeCounts["HDB Resale"] = hdb.length;
  const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  // Top developments
  const devCounts: Record<string, number> = {};
  for (const t of pvt) {
    if (t.project) devCounts[t.project] = (devCounts[t.project] || 0) + 1;
  }
  const topDevs = Object.entries(devCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What can you buy for ${r.label} in Singapore?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `In the ${r.label} price range, Singapore offers ${r.desc}. Based on recent URA and HDB transaction data, there are ${totalTxns.toLocaleString()} recorded transactions in this range across ${topDistricts.length} districts and ${topTowns.length} HDB towns.`,
        },
      },
      {
        "@type": "Question",
        name: `Which districts have properties ${r.label}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: topDistricts.length > 0
            ? `The most active districts for ${r.label} properties are ${topDistricts.slice(0, 5).map(([d, v]) => `${d} (${v.count} transactions)`).join(", ")}.`
            : `No private residential transactions in the ${r.label} range were found in this dataset. This budget may apply primarily to HDB resale flats.`,
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <section className="bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8 md:py-20">
          <nav className="text-xs text-teal-300/60">
            <Link href="/" className="hover:text-teal-200">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href="/property-agents" className="hover:text-teal-200">Property Agents</Link>
            <span className="mx-1.5">/</span>
            <span className="text-teal-200">Budget: {r.label}</span>
          </nav>
          <h1 className="mt-6 text-3xl font-extrabold text-white md:text-4xl">
            What can you buy for {r.label} in Singapore?
          </h1>
          <p className="mt-3 max-w-xl text-lg text-white/60">
            {totalTxns.toLocaleString()} recent transactions in this price range. Here is where your budget goes furthest.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        {/* Definition block for AI SEO */}
        <p className="text-[15px] leading-[1.75] text-gray-600">
          In the {r.label} price range, Singapore property buyers can find {r.desc}.
          Based on {totalTxns.toLocaleString()} URA and HDB transactions, this guide shows which districts,
          property types, and developments fall within this budget.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-10">
            {/* Property types */}
            {topTypes.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Property types in this range</h2>
                <div className="mt-4 space-y-2">
                  {topTypes.map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3">
                      <span className="text-sm font-medium text-gray-700">{type}</span>
                      <span className="text-sm text-gray-400">{count.toLocaleString()} transactions</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Top districts */}
            {topDistricts.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Top districts for {r.label}</h2>
                <div className="mt-4 space-y-2">
                  {topDistricts.map(([d, v]) => {
                    const slug = `d${d.replace("D", "").toLowerCase()}`;
                    return (
                      <div key={d} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3">
                        <span className="text-sm font-medium text-teal-700">{d}</span>
                        <span className="text-sm text-gray-400">{v.count} transactions</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Top HDB towns */}
            {topTowns.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">HDB towns in this range</h2>
                <div className="mt-4 space-y-2">
                  {topTowns.map(([town, v]) => {
                    const slug = town.toLowerCase().replace(/\s+/g, "-").replace(/\//g, "-");
                    return (
                      <Link key={town} href={`/property-agents/hdb/${slug}`}
                        className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 transition hover:border-teal-200">
                        <span className="text-sm font-medium text-gray-700">{town}</span>
                        <span className="text-sm text-gray-400">{v.count} transactions</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Top developments */}
            {topDevs.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Popular developments</h2>
                <div className="mt-4 space-y-2">
                  {topDevs.map(([dev, count]) => (
                    <div key={dev} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3">
                      <span className="text-sm font-medium text-gray-700">{dev}</span>
                      <span className="text-sm text-gray-400">{count} transactions</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Need an agent?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Find the top-performing agents for your budget and area.
              </p>
              <Link href="/property-agents" className="mt-3 inline-block text-sm font-semibold text-teal-600 hover:text-teal-700">
                Compare agents
              </Link>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Other budgets</h3>
              <div className="mt-3 space-y-2">
                {RANGES.filter(x => x.slug !== range).map(x => (
                  <Link key={x.slug} href={`/property-agents/budget/${x.slug}`}
                    className="block text-sm text-gray-600 hover:text-teal-600">{x.label}</Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
