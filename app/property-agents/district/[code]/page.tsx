import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { getDistrictMarketData } from "../../../lib/districtData";
import { formatPrice, formatPriceFull, formatPsf, pricePosition, pricePositionPhrase, priceVsSgAverage, transactionInsight, rentalYieldInsight } from "../../../lib/narrativeHelpers";
import PriceTrendChart from "../../../components/PriceTrendChart";
import StatCard from "../../../components/StatCard";
import DistrictFAQ from "../../../components/DistrictFAQ";
import EmailCapture from "../../../components/EmailCapture";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = false;
type Props = { params: Promise<{ code: string }> };

const DISTRICT_TO_BEST: Record<string, string> = {
  D01: "raffles-place-marina", D02: "chinatown-tanjong-pagar", D03: "queenstown-tiong-bahru",
  D04: "harbourfront-telok-blangah", D05: "clementi-west-coast", D06: "high-street",
  D07: "beach-road-golden-mile", D08: "little-india", D09: "orchard-river-valley",
  D10: "bukit-timah-holland", D11: "novena-thomson", D12: "balestier-toa-payoh",
  D13: "macpherson-braddell", D14: "geylang-eunos", D15: "katong-joo-chiat",
  D16: "bedok-east-coast", D17: "changi-loyang", D18: "tampines-pasir-ris",
  D19: "serangoon-hougang-punggol", D20: "bishan-ang-mo-kio", D21: "upper-bukit-timah",
  D22: "jurong", D23: "bukit-panjang-choa-chu-kang", D24: "lim-chu-kang",
  D25: "kranji-woodlands", D26: "upper-thomson", D27: "yishun-sembawang", D28: "seletar",
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function pct(a: number, b: number) {
  if (!b) return { v: 0, d: "neutral" as const };
  const p = Math.round(((a - b) / b) * 100);
  return { v: Math.abs(p), d: p > 2 ? ("up" as const) : p < -2 ? ("down" as const) : ("neutral" as const) };
}

async function getWikipediaContext(name: string): Promise<string | null> {
  const area = name.split(",")[0].trim().replace(/\s+/g, "_");
  const searches = [
    `${area},_Singapore`,
    `${area}_(Singapore)`,
    `${area}_Road`,
    `${area}_planning_area`,
    area,
  ];
  for (const s of searches) {
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(s)}`, { cache: "force-cache" });
      if (!r.ok) continue;
      const d = await r.json();
      if (d.extract?.length > 50 && d.type !== "disambiguation") {
        const text = (d.extract as string).toLowerCase();
        if (text.includes("singapore") || text.includes("district") || text.includes("residential") || text.includes("mrt") || text.includes("hdb")) {
          return d.extract;
        }
      }
    } catch { continue; }
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const { data: district } = await supabase.from("sg_districts").select("code, name").eq("slug", code).single();
  if (!district) return {};
  const area = district.name.split(",")[0].trim();
  return {
    title: `Property Prices in ${area} (${district.code}) - Condo, Landed & Rental Analysis`,
    description: `${area} property market analysis. Condo and apartment prices, freehold vs leasehold comparison, floor-level premiums, rental yields, and top developments. Based on URA transaction data.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/district/${code}` },
  };
}

export async function generateStaticParams() {
  const { data } = await supabase.from("sg_districts").select("slug").not("slug", "is", null);
  return (data ?? []).map((d) => ({ code: d.slug }));
}

export default async function DistrictPage({ params }: Props) {
  const { code } = await params;
  const { data: district } = await supabase.from("sg_districts").select("*").eq("slug", code).single();
  if (!district) notFound();

  const area = district.name.split(",")[0].trim();
  const [data, wiki, allDistricts] = await Promise.all([
    getDistrictMarketData(district.code),
    getWikipediaContext(district.name),
    supabase.from("sg_districts").select("code, name, slug").not("slug", "is", null).order("code"),
  ]);

  const pos = pricePosition(data.medianPrice);
  const vsSg = pct(data.medianPrice, data.sgMedianPrice);

  const condoTypes = data.propertyTypes.filter(t => t.property_type === "Apartment" || t.property_type === "Condominium");
  const hasLanded = data.propertyTypes.some(t => ["Terrace", "Semi-detached", "Detached"].includes(t.property_type));
  const landedTypes = data.propertyTypes.filter(t => ["Terrace", "Semi-detached", "Detached"].includes(t.property_type));
  const hasRental = data.rentalData.length >= 3;

  const freehold = data.tenureAnalysis.find(t => t.tenure_type === "Freehold");
  const leasehold = data.tenureAnalysis.find(t => t.tenure_type === "99-year Leasehold");
  const tenurePremium = freehold && leasehold ? pct(freehold.median_price, leasehold.median_price) : null;

  const highFloor = data.floorPremium[0];
  const lowFloor = data.floorPremium[data.floorPremium.length - 1];
  const floorPrem = highFloor && lowFloor && data.floorPremium.length >= 3 ? pct(highFloor.median_price, lowFloor.median_price) : null;

  const nearbyDistricts = data.districtComparison
    .map(d => ({ ...d, diff: Math.abs(d.median_price - data.medianPrice) }))
    .sort((a, b) => a.diff - b.diff).slice(0, 3);
  const cheaperDistrict = data.districtComparison.filter(d => d.median_price < data.medianPrice * 0.85).slice(-1)[0];
  const pricierDistrict = data.districtComparison.filter(d => d.median_price > data.medianPrice * 1.15)[0];

  const schemas = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: `${district.code} ${area}`, item: `https://fair-comparisons.com/property-agents/district/${code}` },
    ]},
    { "@context": "https://schema.org", "@type": "Place", name: `${district.code} ${area}, Singapore`,
      address: { "@type": "PostalAddress", addressLocality: area, addressCountry: "SG" },
      ...(wiki && { description: wiki.slice(0, 300) }),
    },
  ];

  const badge = pos === "ultra-premium" || pos === "premium"
    ? { label: "Prime District", css: "text-amber-700 bg-amber-50 border-amber-200" }
    : pos === "above-average"
    ? { label: "Above Average", css: "text-teal-700 bg-teal-50 border-teal-200" }
    : pos === "mid-range"
    ? { label: "Mid-range", css: "text-gray-700 bg-gray-50 border-gray-200" }
    : { label: "Accessible", css: "text-green-700 bg-green-50 border-green-200" };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">{district.code} {area}</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-teal-50/60 to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${badge.css}`}>{badge.label}</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Property Market in {area}</h1>
          <p className="mt-1 text-sm text-gray-400">{district.code} · {district.name}</p>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Analysis of {data.totalTxns.toLocaleString()} private property transactions in {area}, covering condos, apartments{hasLanded ? ", and landed property" : ""}. Prices, tenure splits, floor-level premiums, rental yields, and top developments. All data from URA.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Median Condo Price" value={formatPrice(data.medianPrice)} trend={vsSg.d} trendValue={`${vsSg.v}% vs avg`} />
            <StatCard label="Transactions" value={data.totalTxns.toLocaleString()} subtext="URA 2022-2025" />
            {data.avgRentPsf && <StatCard label="Avg Rent PSF" value={formatPsf(data.avgRentPsf)} subtext="per month" />}
            <StatCard label="Property Types" value={String(data.propertyTypes.length)} subtext={hasLanded ? "incl. landed" : "condo & apt"} />
          </div>
        </div>
      </section>

      {/* Definition Block - optimized for featured snippets and AI extraction */}
      <div className="mx-auto max-w-[1120px] px-5 pt-8 md:px-8">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">What are property prices in {area} ({district.code})?</h2>
          <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
            The median private residential property price in {area} ({district.code}) is <strong>{formatPrice(data.medianPrice)}</strong>,
            based on {data.totalTxns.toLocaleString()} URA-recorded transactions from 2022 to 2025.
            {freehold && leasehold && ` Freehold properties trade at ${formatPrice(freehold.median_price)} while 99-year leasehold units cost ${formatPrice(leasehold.median_price)}, a ${tenurePremium?.v ?? 0}% tenure premium.`}
            {data.avgRentPsf && ` Average monthly rent in ${area} is ${formatPsf(data.avgRentPsf)} per square foot.`}
            {` ${area} is ${priceVsSgAverage(data.medianPrice)} of ${formatPrice(data.sgMedianPrice)}.`}
            {data.topProjects[0] && ` The most actively traded development is ${data.topProjects[0].project} with ${data.topProjects[0].txns} transactions.`}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-10 lg:col-span-3">

            {/* 1. Market Overview */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">{area} Property Market in 2026</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  {pricePositionPhrase(pos, area)}. According to URA transaction records from 2022 to 2025,
                  {district.code} has recorded <strong>{data.totalTxns.toLocaleString()} private residential transactions</strong>,
                  making it {transactionInsight(data.totalTxns)}. The median condominium and apartment price stands at{" "}
                  <strong>{formatPrice(data.medianPrice)}</strong>, which is {priceVsSgAverage(data.medianPrice)} of{" "}
                  {formatPrice(data.sgMedianPrice)}.
                </p>

                {wiki && <p>{wiki}</p>}

                {condoTypes.length >= 2 && (
                  <p>
                    The private residential market in {area} spans {data.propertyTypes.length} property categories.
                    {condoTypes[0].property_type === "Apartment"
                      ? ` Apartments dominate with ${condoTypes[0].txns.toLocaleString()} transactions at a median of ${formatPrice(condoTypes[0].median_price)}, while condominiums trade at ${formatPrice(condoTypes.find(t => t.property_type === "Condominium")?.median_price ?? 0)}.`
                      : ` Condominiums lead with ${condoTypes[0].txns.toLocaleString()} transactions at a median of ${formatPrice(condoTypes[0].median_price)}.`}
                    {" "}The distinction between condominiums and apartments in Singapore is largely regulatory (condominiums must meet a minimum land area of 4,000 sqm and include recreational facilities), but prices also reflect differences in unit size and development scale.
                  </p>
                )}

                {hasLanded && landedTypes.length > 0 && (
                  <p>
                    {area} also has an active landed property segment. Terrace houses trade at a median of{" "}
                    {formatPrice(landedTypes.find(t => t.property_type === "Terrace")?.median_price ?? 0)}
                    {landedTypes.find(t => t.property_type === "Semi-detached") && `, semi-detached homes at ${formatPrice(landedTypes.find(t => t.property_type === "Semi-detached")?.median_price ?? 0)}`}
                    {landedTypes.find(t => t.property_type === "Detached") && `, and detached houses at ${formatPrice(landedTypes.find(t => t.property_type === "Detached")?.median_price ?? 0)}`}.
                    Landed properties in {area} {pos === "premium" || pos === "ultra-premium" ? "attract buyers seeking generational homes in one of Singapore's established residential enclaves" : "offer an alternative to high-rise living at prices that vary significantly with plot size and condition"}.
                  </p>
                )}
              </div>
            </section>

            {/* 2. Freehold vs Leasehold */}
            {tenurePremium && tenurePremium.v > 5 && freehold && leasehold && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Freehold vs Leasehold in {area}</h2>
                <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                  <p>
                    Tenure is a defining factor in {area}&apos;s property pricing. Freehold properties trade at a median
                    of <strong>{formatPrice(freehold.median_price)}</strong>, while 99-year leasehold units trade at{" "}
                    <strong>{formatPrice(leasehold.median_price)}</strong>. That is a <strong>{tenurePremium.v}% premium</strong> for
                    freehold, or approximately {formatPrice(freehold.median_price - leasehold.median_price)} more in absolute terms.
                  </p>
                  <p>
                    On a per-square-metre basis, the gap {freehold.price_per_sqm > leasehold.price_per_sqm * 1.1
                      ? `persists: freehold properties cost ${formatPriceFull(freehold.price_per_sqm)}/sqm versus ${formatPriceFull(leasehold.price_per_sqm)}/sqm for leasehold`
                      : `narrows somewhat: freehold at ${formatPriceFull(freehold.price_per_sqm)}/sqm versus leasehold at ${formatPriceFull(leasehold.price_per_sqm)}/sqm`}.
                    For buyers weighing freehold versus leasehold in {area}, the key question is time horizon.
                    Freehold properties hold value over decades and face no lease decay, but new 99-year leasehold
                    developments often offer modern facilities and layouts at a lower entry price.
                    {freehold.txns > leasehold.txns
                      ? ` In ${area}, freehold transactions outnumber leasehold ${freehold.txns.toLocaleString()} to ${leasehold.txns.toLocaleString()}, reflecting the district's established freehold stock.`
                      : ` New leasehold launches have been active in ${area}, with ${leasehold.txns.toLocaleString()} transactions versus ${freehold.txns.toLocaleString()} freehold.`}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {data.tenureAnalysis.filter(t => t.tenure_type !== "Other").map(t => (
                      <div key={t.tenure_type} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{t.tenure_type}</p>
                        <p className="mt-1 text-xl font-bold text-gray-900">{formatPrice(t.median_price)}</p>
                        <p className="text-xs text-gray-500">{t.txns.toLocaleString()} transactions · {formatPriceFull(t.price_per_sqm)}/sqm</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* 3. Floor Level Premium */}
            {floorPrem && floorPrem.v > 5 && data.floorPremium.length >= 3 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Floor-Level Pricing in {area}</h2>
                <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                  <p>
                    For condominiums and apartments in {area}, floor level creates a measurable price gradient.
                    Units on floors {highFloor.floor_range} sell for a median of {formatPrice(highFloor.median_price)},
                    while units on floors {lowFloor.floor_range} sell for {formatPrice(lowFloor.median_price)}.
                    That is a <strong>{floorPrem.v}% premium</strong> for higher floors, worth approximately{" "}
                    {formatPrice(highFloor.median_price - lowFloor.median_price)} per unit.
                  </p>
                  <p>
                    In {area}, the high-floor premium reflects{" "}
                    {pos === "premium" || pos === "ultra-premium"
                      ? "views of the city skyline, improved privacy in dense neighbourhoods, and the status associated with penthouse-level living"
                      : "better ventilation, natural light, reduced noise, and improved views"}.
                    Buyers targeting a specific development can use this gradient to estimate how much they save
                    by choosing a mid-floor unit instead of a top-floor one.
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {data.floorPremium.map(f => {
                      const w = Math.max(30, Math.round((f.median_price / highFloor.median_price) * 100));
                      return (
                        <div key={f.floor_range} className="flex items-center gap-3 text-sm">
                          <span className="w-16 text-xs text-gray-500">{f.floor_range}</span>
                          <div className="flex-1">
                            <div className="h-5 rounded bg-gray-100">
                              <div className="h-5 rounded bg-teal-200 flex items-center px-2" style={{ width: `${w}%` }}>
                                <span className="text-xs font-medium text-teal-800">{formatPrice(f.median_price)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* 4. Rental Market */}
            {hasRental && data.avgRentPsf && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Rental Market in {area}</h2>
                <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                  <p>
                    Rental rates in {area} average {formatPsf(data.avgRentPsf)} per square foot per month,
                    placing the district {rentalYieldInsight(data.avgRentPsf)}.
                    {data.rentalData[0] && (
                      <> The highest rents are commanded by <strong>{data.rentalData[0].project}</strong> at {formatPsf(data.rentalData[0].avg_rent_psf)}.</>
                    )}
                  </p>
                  {data.rentalData.length >= 3 && (
                    <p>
                      The rental spread within {area} runs from {formatPsf(data.rentalData[data.rentalData.length - 1].avg_rent_psf)} at{" "}
                      {data.rentalData[data.rentalData.length - 1].project} to {formatPsf(data.rentalData[0].avg_rent_psf)} at{" "}
                      {data.rentalData[0].project}. This range reflects differences in development age, finish quality, proximity to MRT,
                      and whether the unit is furnished. Investors evaluating gross rental yield in {area} should compare these rates
                      against the purchase price per square foot to assess returns.
                    </p>
                  )}
                  <div className="mt-3 space-y-2">
                    {data.rentalData.slice(0, 6).map(r => (
                      <Link key={r.project} href={`/property-agents/development/${slugify(r.project)}`} className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 px-4 py-2.5 transition hover:border-teal-200">
                        <span className="text-sm font-medium text-gray-900">{r.project}</span>
                        <span className="text-sm font-bold text-teal-600">{formatPsf(r.avg_rent_psf)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* 5. Top Projects */}
            {data.topProjects.length >= 3 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Most Traded Developments in {area}</h2>
                <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                  <p>
                    The most actively traded development in {area} is <strong>{data.topProjects[0].project}</strong> on{" "}
                    {data.topProjects[0].street}, with {data.topProjects[0].txns} URA-recorded transactions at a median
                    of {formatPriceFull(data.topProjects[0].median_price)}.
                    {data.topProjects[1] && (
                      <> {data.topProjects[1].project} follows with {data.topProjects[1].txns} transactions at {formatPriceFull(data.topProjects[1].median_price)}.</>
                    )}
                    {data.topProjects.length >= 3 && data.topProjects[2].median_price > data.topProjects[0].median_price * 1.5 && (
                      <> {data.topProjects[2].project} stands out at a considerably higher median of {formatPriceFull(data.topProjects[2].median_price)}, suggesting it occupies a different market segment within {area}.</>
                    )}
                  </p>
                  <p>
                    High transaction volumes typically indicate active secondary markets with good liquidity.
                    Buyers who may need to sell within a few years should consider developments with proven resale
                    activity, as these tend to attract a broader pool of buyers when the time comes.
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  {data.topProjects.map((p, i) => {
                    const w = Math.max(20, Math.round((p.txns / data.topProjects[0].txns) * 100));
                    return (
                      <Link key={p.project} href={`/property-agents/development/${slugify(p.project)}`} className="block rounded-lg border border-gray-100 bg-white px-4 py-3 transition hover:border-teal-200 hover:shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${i < 3 ? "bg-teal-600" : "bg-gray-400"}`}>{i + 1}</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{p.project}</p>
                              <p className="text-xs text-gray-400">{p.street}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{formatPrice(p.median_price)}</p>
                            <p className="text-xs text-gray-400">{p.txns} txns</p>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                          <div className="h-1.5 rounded-full bg-teal-200" style={{ width: `${w}%` }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 6. District Comparison */}
            {nearbyDistricts.length >= 2 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">How {area} Compares</h2>
                <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                  <p>
                    In pricing terms, {area} sits closest to{" "}
                    {nearbyDistricts.map(d => `${d.district_name} (${formatPrice(d.median_price)})`).join(", ")}.
                    {cheaperDistrict && (
                      <> Buyers looking for a lower entry point could consider {cheaperDistrict.district_name} at {formatPrice(cheaperDistrict.median_price)}, which is {pct(data.medianPrice, cheaperDistrict.median_price).v}% cheaper.</>
                    )}
                    {pricierDistrict && (
                      <> Those with a larger budget might look at {pricierDistrict.district_name} at {formatPrice(pricierDistrict.median_price)}.</>
                    )}
                  </p>
                </div>
              </section>
            )}

            {/* 7. Buyer Insight */}
            <section className="rounded-xl border border-teal-100 bg-teal-50/50 p-6">
              <h2 className="text-lg font-bold text-gray-900">What This Means for Buyers in {area}</h2>
              <div className="mt-3 space-y-3 text-[15px] leading-[1.75] text-gray-600">
                {pos === "ultra-premium" || pos === "premium" ? (
                  <p>
                    {area} is a prime district. Properties here carry a premium that reflects location, prestige,
                    and access to the Orchard Road shopping belt, the CBD, or top-tier schools (depending on the
                    specific area). At a median of {formatPrice(data.medianPrice)}, this is not a market for
                    budget-conscious buyers. It is a market for those who value address, long-term capital preservation,
                    and tenant demand from the expatriate community.
                  </p>
                ) : pos === "accessible" || pos === "budget" ? (
                  <p>
                    {area} offers some of the more accessible private property in Singapore at a median of{" "}
                    {formatPrice(data.medianPrice)}. For buyers stepping up from HDB or looking for investment
                    properties with lower entry costs, this district provides options without the premium attached
                    to central locations.
                  </p>
                ) : (
                  <p>
                    At {formatPrice(data.medianPrice)}, {area} occupies the middle ground of Singapore&apos;s
                    private property market. Buyers here get a balance between accessibility and established
                    residential character without the premiums of prime districts.
                  </p>
                )}

                {tenurePremium && tenurePremium.v > 15 && (
                  <p>
                    The freehold premium in {area} is {tenurePremium.v}%. If you plan to hold for 20+ years,
                    freehold may justify the extra cost through lease decay protection. For a 5-10 year horizon,
                    a newer 99-year leasehold development may deliver similar returns at a lower entry price.
                  </p>
                )}

                {floorPrem && floorPrem.v > 15 && (
                  <p>
                    Floor level matters here: high floors cost {floorPrem.v}% more than low floors.
                    Budget-conscious buyers can save {formatPrice(highFloor.median_price - lowFloor.median_price)} by
                    choosing a lower floor in the same development.
                  </p>
                )}
              </div>
            </section>

            {/* 8. Amenities */}
            {(data.amenities.schools.length > 0 || data.amenities.mrt.length > 0) && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Schools and Transport near {area}</h2>
                {data.amenities.mrt.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-bold text-gray-700">MRT Stations</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {data.amenities.mrt.map(a => (
                        <span key={a.name} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">{a.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {data.amenities.schools.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-bold text-gray-700">Schools ({data.amenities.schools.length})</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {data.amenities.schools.slice(0, 12).map(a => (
                        <span key={a.name} className="rounded bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{a.name}</span>
                      ))}
                      {data.amenities.schools.length > 12 && (
                        <span className="rounded bg-gray-100 px-2.5 py-1 text-xs text-gray-400">+{data.amenities.schools.length - 12} more</span>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* 9. FAQ */}
            <DistrictFAQ areaName={area} districtCode={district.code} data={data} />

            {/* Best agents CTA */}
            {DISTRICT_TO_BEST[district.code] && (
              <div className="mt-8 rounded-xl border border-teal-200 bg-teal-50 p-6">
                <h3 className="text-lg font-bold text-gray-900">Looking for a property agent in {area}?</h3>
                <p className="mt-2 text-[15px] text-gray-600">
                  We ranked the top-performing agents in {district.code} based on transaction records, area expertise, and client reviews.
                </p>
                <Link href={`/property-agents/best/${DISTRICT_TO_BEST[district.code]}`} className="mt-4 inline-block rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">
                  View best agents in {area} &rarr;
                </Link>
              </div>
            )}

            <p className="text-[11px] text-gray-400">Source: URA Private Residential Property Transactions, URA Median Rental Data. Analysis by FairComparisons.</p>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Quick Answer</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
                A typical condo in {area} costs around <strong>{formatPrice(data.medianPrice)}</strong>.
                {freehold && leasehold && ` Freehold: ${formatPrice(freehold.median_price)}. Leasehold: ${formatPrice(leasehold.median_price)}.`}
                {data.avgRentPsf && ` Average rent: ${formatPsf(data.avgRentPsf)}/month.`}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Prices by Type</h3>
              <div className="mt-4 space-y-3">
                {data.propertyTypes.slice(0, 5).map(t => (
                  <div key={t.property_type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t.property_type}</span>
                    <span className="text-sm font-bold text-gray-900">{formatPrice(t.median_price)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-xl border p-5 ${vsSg.d === "up" ? "border-amber-200 bg-amber-50" : vsSg.d === "down" ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">vs Singapore Average</h3>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">{formatPrice(data.medianPrice)}</p>
              <p className="mt-1 text-sm text-gray-600">
                {vsSg.d === "up" ? `${vsSg.v}% above` : vsSg.d === "down" ? `${vsSg.v}% below` : "In line with"} national median of {formatPrice(data.sgMedianPrice)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Property Lawyers</h3>
              <p className="mt-2 text-sm text-gray-600">
                Buying or selling in {area}? Find lawyers experienced in property transactions.
              </p>
              <div className="mt-3 space-y-1.5">
                <Link href="/lawyers/practice/land-strata-titles-collective-sales" className="block text-sm text-teal-600 hover:underline">Collective Sale Lawyers</Link>
                <Link href="/lawyers/practice/land-sale-of-land-sale-under-court-order" className="block text-sm text-teal-600 hover:underline">Property Sale Lawyers</Link>
                <Link href="/lawyers/practice/land-interest-in-land" className="block text-sm text-teal-600 hover:underline">Land Interest Lawyers</Link>
              </div>
              <Link href="/lawyers" className="mt-3 block text-xs font-semibold text-slate-600 hover:text-slate-800">Browse all lawyers &rarr;</Link>
            </div>

            <EmailCapture
              variant="sidebar"
              source="district"
              pagePath={`/property-agents/district/${district.slug}`}
              districtTag={district.code}
              heading="District price alerts"
              description={`Get notified when new market data is available for ${area}.`}
            />

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Other Districts</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {(allDistricts.data ?? []).filter(d => d.code !== district.code).slice(0, 10).map(d => (
                  <Link key={d.code} href={`/property-agents/district/${d.slug}`}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition hover:border-teal-300 hover:text-teal-600">
                    {d.code}
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
