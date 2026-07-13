import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { formatPrice, formatPriceFull } from "../../../lib/narrativeHelpers";
import PriceTrendChart from "../../../components/PriceTrendChart";
import StatCard from "../../../components/StatCard";
import EmailCapture from "../../../components/EmailCapture";
import { seoTitle } from "../../../lib/seoTitle";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = true;
type Props = { params: Promise<{ slug: string }> };

type FloorData = { floor_range: string; txns: number; median_price: number; median_psm: number };
type SizeData = { size_band: string; txns: number; median_price: number; avg_sqm: number };
type TrendData = { contract_date: string; txns: number; median_price: number };

function districtName(code: string): string {
  const map: Record<string, string> = {
    "01": "Raffles Place/Marina", "02": "Tanjong Pagar", "03": "Queenstown", "04": "Harbourfront",
    "05": "Clementi/West Coast", "06": "Beach Road", "07": "Golden Mile", "08": "Little India",
    "09": "Orchard", "10": "Bukit Timah", "11": "Newton/Novena", "12": "Balestier/Toa Payoh",
    "13": "Macpherson", "14": "Geylang/Paya Lebar", "15": "East Coast", "16": "Bedok",
    "17": "Changi", "18": "Tampines/Pasir Ris", "19": "Serangoon/Hougang", "20": "Bishan/Ang Mo Kio",
    "21": "Upper Bukit Timah", "22": "Jurong", "23": "Bukit Panjang", "24": "Lim Chu Kang",
    "25": "Woodlands", "26": "Upper Thomson", "27": "Yishun/Sembawang", "28": "Seletar",
  };
  return map[code] ?? `District ${code}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: project } = await supabase.from("sg_projects").select("*").eq("slug", slug).single();
  if (!project) return {};

  const isThin = (project.txn_count ?? 0) < 20;

  return {
    title: seoTitle(`${project.name} Price History & Market Data`),
    description: `${project.name} on ${project.street}, District ${project.district}. ${project.txn_count} URA transactions, median ${formatPrice(project.median_price)}. Floor-level pricing, unit size analysis, and price trends.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/development/${slug}` },
    ...(isThin && { robots: { index: false, follow: true } }),
  };
}

export async function generateStaticParams() {
  // Pre-render all developments with transactions (dynamicParams = false).
  const all: { slug: string }[] = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("sg_projects")
      .select("slug")
      .gt("txn_count", 0)
      .order("txn_count", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all.map((p) => ({ slug: p.slug }));
}

export default async function DevelopmentPage({ params }: Props) {
  const { slug } = await params;
  const { data: project } = await supabase.from("sg_projects").select("*").eq("slug", slug).single();
  if (!project) notFound();

  const { data: districtRow } = await supabase.from("sg_districts").select("slug, name").eq("code", `D${project.district}`).single();
  const districtSlug = districtRow?.slug ?? `d${project.district}`;
  const areaName = (districtRow?.name ?? districtName(project.district)).split(",")[0].trim();

  const [trendRes, floorRes, sizeRes, tenureRes, rentalRes, listingsRes, topAgentsRes, spotlightRes] = await Promise.all([
    supabase.rpc("get_project_price_trend", { p_name: project.name }),
    supabase.rpc("get_project_floor_analysis", { p_name: project.name }),
    supabase.rpc("get_project_size_analysis", { p_name: project.name }),
    supabase.rpc("get_project_tenure", { p_name: project.name }),
    supabase.from("sg_rental_medians").select("*").eq("project", project.name).order("ref_period", { ascending: false }).limit(12),
    supabase.from("sg_listings").select("title, price, agent_name, agent_license, agency_name, listing_type, bedrooms").ilike("title", `%${project.name.split(" ").slice(0, 2).join(" ")}%`).limit(5),
    supabase.rpc("get_top_agents_in_area_rich", { area_name: areaName, lim: 8 }),
    // Agent-owned building spotlight (RLS: only published rows are readable).
    supabase
      .from("sg_building_pages")
      .select("headline, commentary, published_at, updated_at, sg_agents(name, slug, photo_url, score, agency_name, cea_registration)")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle(),
  ]);

  const trends = (trendRes.data ?? []) as TrendData[];
  const floors = (floorRes.data ?? []) as FloorData[];
  const sizes = (sizeRes.data ?? []) as SizeData[];
  const tenures = (tenureRes.data ?? []) as Array<{ tenure: string; txns: number }>;
  const rentals = rentalRes.data ?? [];
  const listings = listingsRes.data ?? [];
  const topAgents = (topAgentsRes.data ?? []) as Array<{
    agent_name: string; agent_slug: string; agency_name: string; score: number; area_txns: number;
  }>;
  const spotlightRow = spotlightRes.data as {
    headline: string; commentary: string; published_at: string | null; updated_at: string;
    sg_agents: { name: string; slug: string | null; photo_url: string | null; score: number | null; agency_name: string | null; cea_registration: string | null } | null;
  } | null;
  const spotlight = spotlightRow?.sg_agents ? { ...spotlightRow, agent: spotlightRow.sg_agents } : null;

  const chartData = trends.map((t) => ({
    month: t.contract_date,
    price: t.median_price,
    transactions: t.txns,
  }));

  const highFloor = floors[0];
  const lowFloor = floors[floors.length - 1];
  const floorPremPct = highFloor && lowFloor && floors.length >= 3
    ? Math.round(((highFloor.median_price - lowFloor.median_price) / lowFloor.median_price) * 100)
    : null;

  const primaryTenure = tenures[0]?.tenure ?? "";
  const isFreehold = primaryTenure === "Freehold";
  const distName = districtName(project.district);
  const avgRent = rentals.length > 0
    ? (rentals.reduce((s: number, r: { median_psf: number }) => s + Number(r.median_psf), 0) / rentals.length)
    : null;

  // FAQ
  const faqItems = [
    { q: `What is the average price of ${project.name}?`, a: `The median transaction price at ${project.name} is ${formatPriceFull(project.median_price)}, based on ${project.txn_count} URA-recorded transactions. Prices range from ${formatPrice(project.min_price)} to ${formatPrice(project.max_price)}.` },
    ...(floorPremPct && floorPremPct > 5 ? [{
      q: `Does floor level affect prices at ${project.name}?`,
      a: `Yes. High-floor units (${highFloor.floor_range}) sell for a median of ${formatPriceFull(highFloor.median_price)}, while low-floor units (${lowFloor.floor_range}) sell for ${formatPriceFull(lowFloor.median_price)}. That is a ${floorPremPct}% premium for higher floors.`,
    }] : []),
    ...(avgRent ? [{
      q: `What is the rental rate at ${project.name}?`,
      a: `The average rental rate at ${project.name} is approximately S$${avgRent.toFixed(2)} per square foot per month, based on URA median rental data.`,
    }] : []),
  ];

  const schemas = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: `D${project.district} ${distName}`, item: `https://fair-comparisons.com/property-agents/district/${districtSlug}` },
      { "@type": "ListItem", position: 3, name: project.name, item: `https://fair-comparisons.com/property-agents/development/${slug}` },
    ]},
    ...(faqItems.length > 0 ? [{
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: faqItems.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    }] : []),
    ...(spotlight ? [{
      "@context": "https://schema.org", "@type": "WebPage",
      name: `${project.name} Price History & Market Data`,
      url: `https://fair-comparisons.com/property-agents/development/${slug}`,
      dateModified: (spotlight.updated_at ?? spotlight.published_at ?? "").slice(0, 10),
      isPartOf: { "@type": "WebSite", name: "FairComparisons", url: "https://fair-comparisons.com" },
    }] : []),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href={`/property-agents/district/${districtSlug}`} className="hover:text-gray-600">D{project.district} {distName}</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">{project.name}</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600">
            D{project.district} {distName}
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">{project.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{project.street} · District {project.district} · {isFreehold ? "Freehold" : primaryTenure}</p>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Median Price" value={formatPrice(project.median_price)} subtext={`${project.txn_count} transactions`} />
            <StatCard label="Price Range" value={`${formatPrice(project.min_price)} - ${formatPrice(project.max_price)}`} />
            <StatCard label="Tenure" value={isFreehold ? "Freehold" : "Leasehold"} subtext={isFreehold ? "" : primaryTenure} />
            {avgRent && <StatCard label="Avg Rent" value={`S$${avgRent.toFixed(2)} psf`} subtext="per month" />}
          </div>
        </div>
      </section>

      {/* Definition Block - optimized for featured snippets and AI extraction */}
      <div className="mx-auto max-w-[1120px] px-5 pt-8 md:px-8">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">What is the price of {project.name}?</h2>
          <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
            The median transaction price at {project.name} is <strong>{formatPriceFull(project.median_price)}</strong>,
            based on {project.txn_count} URA-recorded transactions. Prices range from {formatPrice(project.min_price)} to {formatPrice(project.max_price)}.
            {` ${project.name} is a ${isFreehold ? "freehold" : "leasehold"} development on ${project.street} in District ${project.district} (${distName}).`}
            {floorPremPct && floorPremPct > 5 && ` High-floor units cost ${floorPremPct}% more than low-floor units.`}
            {avgRent && ` Average rent is S$${avgRent.toFixed(2)} per square foot per month.`}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-10 lg:col-span-3">

            {/* Market Overview */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">{project.name} Price Analysis</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  {project.name} is a {isFreehold ? "freehold" : "leasehold"} development on {project.street} in
                  District {project.district} ({distName}). According to URA transaction records,{" "}
                  <strong>{project.txn_count} private residential transactions</strong> have been recorded at this
                  development, with a median price of <strong>{formatPriceFull(project.median_price)}</strong>.
                  Prices range from {formatPrice(project.min_price)} for the smallest units to{" "}
                  {formatPrice(project.max_price)} for premium configurations.
                </p>

                {sizes.length >= 2 && (
                  <p>
                    The development offers units across {sizes.length} size categories.
                    {sizes[0] && ` The most traded segment is ${sizes[0].size_band.toLowerCase()} at a median of ${formatPriceFull(sizes[0].median_price)}.`}
                    {sizes.length >= 3 && sizes[sizes.length - 1] && ` Larger units (${sizes[sizes.length - 1].size_band.toLowerCase()}) trade at ${formatPriceFull(sizes[sizes.length - 1].median_price)}, reflecting the premium for additional space.`}
                  </p>
                )}

                {floorPremPct && floorPremPct > 5 && (
                  <p>
                    Floor level significantly impacts pricing at {project.name}. High-floor units ({highFloor.floor_range})
                    command a median of {formatPriceFull(highFloor.median_price)}, while low-floor units ({lowFloor.floor_range})
                    sell for {formatPriceFull(lowFloor.median_price)}. That is a <strong>{floorPremPct}% premium</strong> for
                    higher floors, worth {formatPrice(highFloor.median_price - lowFloor.median_price)} in absolute terms.
                    Buyers with flexibility on floor preference can save significantly by choosing mid-range levels.
                  </p>
                )}

                {avgRent && (
                  <p>
                    On the rental side, {project.name} commands an average of S${avgRent.toFixed(2)} per square foot per month.
                    {project.median_price > 0 && avgRent > 0 && (() => {
                      const annualRentPerSqm = avgRent * 10.764 * 12;
                      const grossYield = (annualRentPerSqm / (project.median_price / 80)) * 100; // assume 80sqm avg
                      return grossYield > 0 ? ` At the median purchase price, this implies a gross rental yield of approximately ${grossYield.toFixed(1)}%.` : "";
                    })()}
                  </p>
                )}
              </div>
            </section>

            {/* Price Trend */}
            {chartData.length >= 4 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Price Trend</h2>
                <p className="mt-1 text-sm text-gray-500">Median transaction price by contract month.</p>
                <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
                  <PriceTrendChart data={chartData} />
                </div>
                <p className="mt-2 text-[11px] text-gray-400">Source: URA Private Residential Property Transactions</p>
              </section>
            )}

            {/* Floor Analysis */}
            {floors.length >= 3 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Price by Floor Level</h2>
                <div className="mt-4 space-y-1.5">
                  {floors.map((f) => {
                    const w = Math.max(30, Math.round((f.median_price / highFloor.median_price) * 100));
                    return (
                      <div key={f.floor_range} className="flex items-center gap-3 text-sm">
                        <span className="w-16 text-xs text-gray-500">{f.floor_range}</span>
                        <div className="flex-1">
                          <div className="h-5 rounded bg-gray-100">
                            <div className="h-5 rounded bg-[var(--blue-wash)] flex items-center px-2" style={{ width: `${w}%` }}>
                              <span className="text-xs font-medium text-[var(--blue-deep)]">{formatPrice(f.median_price)}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">{f.txns} txns</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Unit Size Analysis */}
            {sizes.length >= 2 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Price by Unit Size</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        <th className="pb-2 pr-4">Size Band</th>
                        <th className="pb-2 pr-4 text-right">Median Price</th>
                        <th className="pb-2 pr-4 text-right">Avg Size</th>
                        <th className="pb-2 text-right">Transactions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sizes.map((s) => (
                        <tr key={s.size_band}>
                          <td className="py-2.5 pr-4 font-medium text-gray-900">{s.size_band}</td>
                          <td className="py-2.5 pr-4 text-right">{formatPrice(s.median_price)}</td>
                          <td className="py-2.5 pr-4 text-right text-gray-500">{s.avg_sqm} sqm</td>
                          <td className="py-2.5 text-right text-gray-500">{s.txns}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Active Listings */}
            {listings.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Current Listings</h2>
                <div className="mt-4 space-y-2">
                  {listings.map((l: { title: string; price: number; agent_name: string; agency_name: string; listing_type: string; bedrooms: number }, idx: number) => (
                    <div key={idx}
                      className="rounded-lg border border-gray-100 bg-white px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{l.bedrooms > 0 ? `${l.bedrooms}-Bed` : ""} {l.listing_type}</p>
                          <p className="text-xs text-gray-500">{l.agent_name} · {l.agency_name}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{formatPrice(l.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Top agents in the development's district (CEA transaction data) */}
            {topAgents.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Top agents in {distName}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Highest-scoring agents active in D{project.district} {distName}, the district where {project.name} is
                  located. Rankings come from CEA transaction records for the wider district, not from activity at this
                  specific development.
                </p>
                <div className="mt-4 space-y-2">
                  {topAgents.map((a) => (
                    <Link
                      key={a.agent_slug}
                      href={`/property-agents/agent/${a.agent_slug}`}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3 hover:border-gray-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{a.agent_name}</p>
                        <p className="text-xs text-gray-500">{a.agency_name} · {a.area_txns} recorded deals in {distName}</p>
                      </div>
                      <span className="text-sm font-bold text-[var(--blue-deep)]">{Math.round(a.score)}</span>
                    </Link>
                  ))}
                </div>
                <div className="mt-3">
                  <Link href={`/property-agents/district/${districtSlug}`} className="text-sm text-[var(--blue)] hover:text-[var(--blue-deep)]">
                    All agents in {distName} →
                  </Link>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">Source: CEA salesperson transaction records (data.gov.sg). AgentScore by FairComparisons.</p>
              </section>
            )}

            {/* Agent-owned building spotlight: marketing content, clearly
                attributed, next to the neutral URA data. Never a ranking. */}
            {spotlight && (
              <section className="rounded-xl border border-[var(--blue-wash)] bg-gradient-to-b from-[var(--blue-wash)]/40 to-white p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">Agent spotlight</p>
                <h2 className="mt-2 text-xl font-bold text-gray-900">{spotlight.headline}</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-[1.75] text-gray-600">
                  {spotlight.commentary.split(/\n{2,}/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{spotlight.agent.name}</p>
                    <p className="text-xs text-gray-500">
                      {spotlight.agent.agency_name}{spotlight.agent.cea_registration ? ` · CEA ${spotlight.agent.cea_registration}` : ""}
                    </p>
                  </div>
                  {spotlight.agent.slug && (
                    <>
                      <Link href={`/book/${spotlight.agent.slug}`} className="rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--blue-deep)]">
                        Book a viewing consult
                      </Link>
                      <Link href={`/property-agents/agent/${spotlight.agent.slug}`} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300">
                        Full profile
                      </Link>
                    </>
                  )}
                </div>
                <p className="mt-4 text-[11px] text-gray-400">
                  Commentary is marketing content by the presenting agent, not FairComparisons editorial. Market
                  data above comes from URA records. Presenting a page never changes any agent&#39;s AgentScore or
                  ranking; compare all agents for this district in the list below.
                </p>
              </section>
            )}

            {/* FAQ */}
            {faqItems.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">FAQ</h2>
                <div className="mt-4 space-y-5">
                  {faqItems.map((f, i) => (
                    <div key={i}>
                      <h3 className="font-semibold text-gray-900">{f.q}</h3>
                      <p className="mt-1.5 text-[15px] leading-[1.75] text-gray-600">{f.a}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-gray-400">Source: URA Private Residential Property Transactions. Analysis by FairComparisons.</p>
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Quick Answer</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
                A unit at {project.name} costs around <strong>{formatPrice(project.median_price)}</strong>.
                {floorPremPct && floorPremPct > 10 && ` High floors cost ${floorPremPct}% more than low floors.`}
                {avgRent && ` Rental rate: ~S$${avgRent.toFixed(2)} psf/month.`}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Development Details</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Street</dt><dd className="font-medium text-gray-900 text-right">{project.street}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">District</dt><dd className="font-medium text-gray-900"><Link href={`/property-agents/district/${districtSlug}`} className="text-[var(--blue)] hover:text-[var(--blue-deep)]">D{project.district} {distName}</Link></dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Tenure</dt><dd className="font-medium text-gray-900">{isFreehold ? "Freehold" : "Leasehold"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Transactions</dt><dd className="font-medium text-gray-900">{project.txn_count}</dd></div>
              </dl>
            </div>

            <EmailCapture
              variant="sidebar"
              source="development"
              pagePath={`/property-agents/development/${slug}`}
              heading="Price alerts"
              description="Get notified when new transactions are recorded for this development."
            />

            {sizes.length >= 2 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Unit Sizes</h3>
                <div className="mt-4 space-y-3">
                  {sizes.map((s) => (
                    <div key={s.size_band} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{s.size_band}</span>
                      <span className="text-xs font-bold text-gray-900">{formatPrice(s.median_price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
