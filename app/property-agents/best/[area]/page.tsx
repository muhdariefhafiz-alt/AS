import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { formatPrice } from "../../../lib/narrativeHelpers";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = false;
type Props = { params: Promise<{ area: string }> };

// Names MUST match sg_area_top_agents.area_name exactly
const AREAS = [
  { name: "Serangoon Garden/ Hougang/ Punggol", slug: "serangoon-hougang-punggol", district: "D19" },
  { name: "Katong/ Joo Chiat/ Amber Road", slug: "katong-joo-chiat", district: "D15" },
  { name: "Ardmore/ Bukit Timah/ Holland Road/ Tanglin", slug: "bukit-timah-holland", district: "D10" },
  { name: "Orchard/ Cairnhill/ River Valley", slug: "orchard-river-valley", district: "D09" },
  { name: "Tampines/ Pasir Ris", slug: "tampines-pasir-ris", district: "D18" },
  { name: "Pasir Panjang/ Hong Leong Garden/ Clementi New Town", slug: "clementi-west-coast", district: "D05" },
  { name: "Hillview/ Dairy Farm/ Bukit Panjang/ Choa Chu Kang", slug: "bukit-panjang-choa-chu-kang", district: "D23" },
  { name: "Bedok/ Upper East Coast/ Eastwood/ Kew Drive", slug: "bedok-east-coast", district: "D16" },
  { name: "Geylang/ Eunos", slug: "geylang-eunos", district: "D14" },
  { name: "Queenstown/ Tiong Bahru", slug: "queenstown-tiong-bahru", district: "D03" },
  { name: "Bishan/ Ang Mo Kio", slug: "bishan-ang-mo-kio", district: "D20" },
  { name: "Balestier/ Toa Payoh/ Serangoon", slug: "balestier-toa-payoh", district: "D12" },
  { name: "Upper Bukit Timah/ Clementi Park/ Ulu Pandan", slug: "upper-bukit-timah", district: "D21" },
  { name: "Watten Estate/ Novena/ Thomson", slug: "novena-thomson", district: "D11" },
  { name: "Jurong", slug: "jurong", district: "D22" },
  { name: "Yishun/ Sembawang", slug: "yishun-sembawang", district: "D27" },
  { name: "Upper Thomson/ Springleaf", slug: "upper-thomson", district: "D26" },
  { name: "Seletar", slug: "seletar", district: "D28" },
  { name: "Kranji/ Woodgrove", slug: "kranji-woodlands", district: "D25" },
  { name: "Raffles Place/ Cecil/ Marina/ People's Park", slug: "raffles-place-marina", district: "D01" },
  { name: "Anson/ Tanjong Pagar", slug: "chinatown-tanjong-pagar", district: "D02" },
  { name: "Telok Blangah/ Harbourfront", slug: "harbourfront-telok-blangah", district: "D04" },
  { name: "Middle Road/ Golden Mile", slug: "beach-road-golden-mile", district: "D07" },
  { name: "Little India", slug: "little-india", district: "D08" },
  { name: "Macpherson/ Braddell", slug: "macpherson-braddell", district: "D13" },
  { name: "Loyang/ Changi", slug: "changi-loyang", district: "D17" },
  { name: "Lim Chu Kang/ Tengah", slug: "lim-chu-kang", district: "D24" },
  { name: "High Street/ Beach Road (part)", slug: "high-street", district: "D06" },
];

function areaFromSlug(slug: string) { return AREAS.find(a => a.slug === slug); }
function shortName(name: string) { return name.split("/")[0].trim(); }

type RichAgent = {
  agent_name: string;
  agent_slug: string;
  cea_reg: string;
  agency_name: string;
  score: number;
  total_txns: number;
  area_txns: number;
  area_focus_pct: number;
  area_property_types: string;
  area_roles: string;
  area_txn_types: string;
};

function formatTypes(types: string): string {
  return types.replace(/CONDOMINIUM_APARTMENTS/g, "condo").replace(/LANDED/g, "landed").replace(/HDB/g, "HDB").replace(/EXECUTIVE_CONDOMINIUM/g, "EC").replace(/, /g, ", ");
}

function formatRoles(roles: string): string {
  return roles.toLowerCase().replace(/, /g, ", ");
}

function focusLabel(pct: number): string {
  if (pct >= 60) return "specialist";
  if (pct >= 30) return "frequently active";
  return "active";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area: slug } = await params;
  const area = areaFromSlug(slug);
  if (!area) return {};
  const s = shortName(area.name);
  return {
    title: `Best Property Agents in ${s} (${area.district}) - Ranked by Transaction Record`,
    description: `Top property agents in ${area.name}, ranked by AgentScore. Detailed analysis of each agent's transaction history, specialization, and area focus in ${s}.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/best/${slug}` },
  };
}

export async function generateStaticParams() {
  return AREAS.map(a => ({ area: a.slug }));
}

export default async function BestAgentsPage({ params }: Props) {
  const { area: slug } = await params;
  const area = areaFromSlug(slug);
  if (!area) notFound();

  const short = shortName(area.name);
  // Read from pre-computed table (fast, no timeout)
  const { data: agents } = await supabase
    .from("sg_area_top_agents")
    .select("*")
    .eq("area_type", "district")
    .eq("area_name", area.name)
    .order("rank", { ascending: true })
    .limit(20);
  const topAgents = (agents ?? []).map((a): RichAgent => ({
    agent_name: a.agent_name, agent_slug: a.agent_slug, cea_reg: a.cea_reg,
    agency_name: a.agency_name, score: Number(a.score), total_txns: a.total_txns,
    area_txns: a.area_txns, area_focus_pct: a.area_focus_pct,
    area_property_types: a.area_property_types || "", area_roles: a.area_roles || "",
    area_txn_types: a.area_txn_types || "",
  }));

  const districtNum = area.district.replace("D", "").padStart(2, "0");
  const { data: marketData } = await supabase.rpc("get_district_property_types", { d_code: districtNum });
  const totalTxns = (marketData ?? []).reduce((s: number, r: { txns: number }) => s + Number(r.txns), 0);
  const condoRow = (marketData ?? []).find((r: { property_type: string }) => r.property_type === "Apartment" || r.property_type === "Condominium");
  const medianPrice = condoRow ? Number(condoRow.median_price) : 0;

  // Derive insights
  const topAgency = topAgents.length > 0
    ? (() => {
        const counts: Record<string, number> = {};
        topAgents.forEach(a => { counts[a.agency_name] = (counts[a.agency_name] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      })()
    : null;

  const specialists = topAgents.filter(a => a.area_focus_pct >= 40);
  const generalists = topAgents.filter(a => a.area_focus_pct < 20);
  const avgAreaTxns = topAgents.length > 0 ? Math.round(topAgents.reduce((s, a) => s + a.area_txns, 0) / topAgents.length) : 0;

  const schemas = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: `Best Agents ${short}`, item: `https://fair-comparisons.com/property-agents/best/${slug}` },
    ]},
    ...(topAgents.length > 0 ? [{ "@context": "https://schema.org", "@type": "ItemList", name: `Best Property Agents in ${short}`,
      itemListElement: topAgents.slice(0, 10).map((a, i) => ({
        "@type": "ListItem", position: i + 1, name: a.agent_name,
        item: { "@type": "RealEstateAgent", name: a.agent_name, url: `https://fair-comparisons.com/property-agents/agent/${a.agent_slug}` },
      })),
    }] : []),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">Best Agents in {short}</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-teal-50/60 to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-8 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">{area.district}</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
            Best Property Agents in {short}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            {topAgents.length} agents ranked by AgentScore with detailed transaction analysis per agent.
            {medianPrice > 0 && ` Median condo price: ${formatPrice(medianPrice)}.`}
            {totalTxns > 0 && ` ${totalTxns.toLocaleString()} URA transactions in ${area.district}.`}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-8 lg:col-span-3">

            {/* Market context narrative */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">The Agent Market in {short}</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  {area.name} ({area.district}) is served by a deep pool of property agents.
                  {topAgents.length > 0 && ` Of the agents with recorded CEA transaction data in this area, the top ${topAgents.length} are ranked below based on AgentScore.`}
                  {medianPrice > 0 && ` With a median condo price of ${formatPrice(medianPrice)}, the stakes are high. Choosing the wrong agent can cost tens of thousands of dollars in missed opportunities or pricing errors.`}
                </p>

                {topAgency && (
                  <p>
                    {topAgency[0]} places {topAgency[1]} agents in the top {topAgents.length}, making it the most
                    represented agency in {short}.
                    {specialists.length > 0 && ` ${specialists.length} of the top ${topAgents.length} agents dedicate 40% or more of their practice to this area, suggesting deep local knowledge.`}
                    {generalists.length > 0 && ` ${generalists.length} agents operate across many districts, bringing broader market perspective but less area-specific focus.`}
                  </p>
                )}

                {topAgents.length >= 3 && (
                  <p>
                    The top-ranked agent, <strong>{topAgents[0].agent_name}</strong>, has completed{" "}
                    {topAgents[0].area_txns} transactions in {short} alone ({topAgents[0].area_focus_pct}% of their
                    total {topAgents[0].total_txns} career transactions). They handle {formatTypes(topAgents[0].area_property_types)} properties
                    and represent {formatRoles(topAgents[0].area_roles)}.
                    {topAgents[1].area_focus_pct > topAgents[0].area_focus_pct && (
                      ` However, ${topAgents[1].agent_name} shows stronger area focus at ${topAgents[1].area_focus_pct}% of their business in ${short}, making them a deeper specialist despite fewer total transactions.`
                    )}
                  </p>
                )}
              </div>
            </section>

            {/* Agent list with rich data */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Top {topAgents.length} Agents in {short}</h2>
              <div className="mt-4 space-y-4">
                {topAgents.map((a, i) => {
                  const types = formatTypes(a.area_property_types);
                  const focus = focusLabel(a.area_focus_pct);
                  return (
                    <div key={a.cea_reg} className="rounded-xl border border-gray-100 bg-white p-5">
                      <div className="flex items-start gap-4">
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                          i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-teal-600"
                        }`}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <Link href={`/property-agents/agent/${a.agent_slug}`} className="font-semibold text-gray-900 hover:text-teal-600">
                              {a.agent_name}
                            </Link>
                            <div className="flex flex-col items-center rounded-lg border border-teal-100 bg-teal-50 px-3 py-1">
                              <span className="text-lg font-extrabold text-teal-600">{Math.round(a.score)}</span>
                              <span className="text-[7px] uppercase tracking-widest text-gray-400">Score</span>
                            </div>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">{a.agency_name} · CEA {a.cea_reg}</p>

                          {/* Rich narrative per agent */}
                          <p className="mt-3 text-sm leading-relaxed text-gray-600">
                            {a.agent_name} is {focus} in {short} with <strong>{a.area_txns} transactions</strong> in
                            this area ({a.area_focus_pct}% of their {a.total_txns} total career deals).
                            {" "}Handles {types} properties.
                            {a.area_txn_types.includes("NEW SALE") && a.area_txn_types.includes("RESALE") && (
                              " Works across both new launches and resale, giving buyers exposure to the full market."
                            )}
                            {a.area_txn_types.includes("WHOLE RENTAL") && !a.area_txn_types.includes("RESALE") && (
                              " Primarily focused on the rental market, connecting landlords with tenants."
                            )}
                            {a.area_roles.includes("BUYER") && a.area_roles.includes("SELLER") && (
                              " Represents both buyers and sellers, providing perspective from both sides of the negotiation."
                            )}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{a.area_txns} local txns</span>
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{a.area_focus_pct}% area focus</span>
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{a.total_txns} career total</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] text-gray-400">Source: CEA Public Register via data.gov.sg. AgentScore by FairComparisons.</p>
            </section>

            {/* How to choose */}
            <section className="rounded-xl border border-teal-100 bg-teal-50/50 p-6">
              <h2 className="text-lg font-bold text-gray-900">How to Choose an Agent in {short}</h2>
              <div className="mt-3 space-y-3 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  A high AgentScore indicates a strong overall track record, but the best agent for you depends
                  on your specific needs. Consider these factors when reviewing the agents above:
                </p>
                <p>
                  <strong>Area focus percentage.</strong> An agent who dedicates 50%+ of their business to {short} likely
                  knows the local pricing dynamics, the best blocks, and which developments are gaining value.
                  {specialists.length > 0 && ` ${specialists.length} agents above qualify as area specialists.`}
                </p>
                <p>
                  <strong>Transaction type match.</strong> If you are selling a resale condo, look for agents with
                  strong resale experience. If you are renting out, prioritize agents with rental transaction history.
                  The breakdowns above show each agent's transaction mix.
                </p>
                <p>
                  <strong>Representation experience.</strong> Agents who have represented both buyers and sellers
                  understand both sides of the negotiation. This can be an advantage in pricing strategy and deal
                  structuring.
                </p>
              </div>
            </section>

            {/* FAQ */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h2>
              <div className="mt-4 space-y-4">
                {topAgents.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900">Who is the best property agent in {short}?</h3>
                    <p className="mt-1 text-[15px] leading-[1.75] text-gray-600">
                      Based on AgentScore, the highest-ranked agent in {area.name} is {topAgents[0].agent_name} from{" "}
                      {topAgents[0].agency_name}, with {topAgents[0].area_txns} transactions in this area and a score
                      of {Math.round(topAgents[0].score)}. {topAgents[0].agent_name} is {focusLabel(topAgents[0].area_focus_pct)} in {short},
                      dedicating {topAgents[0].area_focus_pct}% of their practice to this area.
                    </p>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">How many active agents are there in {short}?</h3>
                  <p className="mt-1 text-[15px] leading-[1.75] text-gray-600">
                    {topAgents.length} agents have CEA-recorded transactions and an AgentScore for {area.name}. The average
                    agent in this ranking has completed {avgAreaTxns} transactions in the area.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Can agents pay for a higher ranking?</h3>
                  <p className="mt-1 text-[15px] leading-[1.75] text-gray-600">
                    No. AgentScore is calculated algorithmically from CEA public data. Payment does not influence ranking position.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">{area.district} Market</h3>
              <p className="mt-2 font-medium text-gray-900">{area.name}</p>
              {totalTxns > 0 && <p className="mt-1 text-sm text-gray-500">{totalTxns.toLocaleString()} URA transactions</p>}
              {medianPrice > 0 && <p className="text-sm text-gray-500">Median condo: {formatPrice(medianPrice)}</p>}
              {topAgents.length > 0 && <p className="text-sm text-gray-500">{topAgents.length} ranked agents</p>}
            </div>

            {specialists.length > 0 && (
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-teal-700">Area Specialists</h3>
                <p className="mt-2 text-sm text-teal-800">
                  {specialists.length} agents dedicate 40%+ of their practice to {short}:
                </p>
                <div className="mt-2 space-y-1">
                  {specialists.slice(0, 5).map(a => (
                    <Link key={a.cea_reg} href={`/property-agents/agent/${a.agent_slug}`}
                      className="block text-sm text-teal-700 hover:text-teal-900">
                      {a.agent_name} ({a.area_focus_pct}% focus)
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Other Areas</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {AREAS.filter(a => a.slug !== slug).slice(0, 10).map(a => (
                  <Link key={a.slug} href={`/property-agents/best/${a.slug}`}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition hover:border-teal-300 hover:text-teal-600">
                    {shortName(a.name)}
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
// v2 1775826185
