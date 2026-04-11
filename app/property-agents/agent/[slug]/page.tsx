import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { formatPrice } from "../../../lib/narrativeHelpers";
import StatCard from "../../../components/StatCard";
import ClaimBanner from "../../../components/ClaimBanner";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = true;
type Props = { params: Promise<{ slug: string }> };

// --- Types ---
type TrackRecord = {
  total_txns: number;
  earliest_txn: string;
  latest_txn: string;
  property_types: Record<string, number>;
  transaction_types: Record<string, number>;
  represented_roles: Record<string, number>;
  top_towns: Array<{ town: string; count: number }> | null;
  top_districts: Array<{ district: string; count: number }> | null;
};

type Listing = {
  title: string;
  address: string;
  price: number;
  property_type: string;
  district_code: string;
  listing_type: string;
};

// --- Helpers ---
function specialization(propTypes: Record<string, number>): string {
  const total = Object.values(propTypes).reduce((s, v) => s + v, 0);
  const entries = Object.entries(propTypes).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "";
  const [top, topCount] = entries[0];
  const pct = Math.round((topCount / total) * 100);

  const label = top === "HDB" ? "HDB" : top === "CONDOMINIUM_APARTMENTS" ? "condominium and apartment" : top === "LANDED_PROPERTIES" ? "landed property" : top === "EXECUTIVE_CONDOMINIUM" ? "executive condominium" : top.toLowerCase();

  if (pct >= 80) return `specialises in ${label} transactions (${pct}% of deals)`;
  if (pct >= 50) return `primarily handles ${label} transactions (${pct}%)`;
  return `works across property types, with ${label} being the most common (${pct}%)`;
}

function roleInsight(roles: Record<string, number>): string {
  const total = Object.values(roles).reduce((s, v) => s + v, 0);
  const entries = Object.entries(roles).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "";
  const parts = entries.map(([role, count]) => {
    const pct = Math.round((count / total) * 100);
    return `${role.toLowerCase()} (${pct}%)`;
  });
  return parts.join(", ");
}

function txnTypeInsight(types: Record<string, number>): string {
  const total = Object.values(types).reduce((s, v) => s + v, 0);
  const entries = Object.entries(types).sort((a, b) => b[1] - a[1]);
  return entries.map(([type, count]) => {
    const pct = Math.round((count / total) * 100);
    return `${type.toLowerCase().replace("_", " ")} (${pct}%)`;
  }).join(", ");
}

function yearsActive(earliest: string, latest: string): string {
  // Format: "OCT-2017"
  const parseDate = (d: string) => {
    const months: Record<string, number> = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
    const [m, y] = d.split("-");
    return new Date(parseInt(y), months[m] ?? 0);
  };
  try {
    const start = parseDate(earliest);
    const end = parseDate(latest);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (diff < 1) return "less than a year";
    return `${Math.round(diff)} years`;
  } catch {
    return "";
  }
}

// --- Metadata ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: agent } = await supabase
    .from("sg_agents")
    .select("name, agency_name, cea_registration, google_rating, score, transaction_count, claimed")
    .eq("slug", slug)
    .single();
  if (!agent) return {};

  const hasTxns = (agent.transaction_count ?? 0) > 0;
  const txnDesc = hasTxns
    ? ` ${agent.transaction_count} recorded transactions.`
    : "";

  // Only noindex if no score AND no google_rating AND no transactions AND not claimed
  const isThin = !agent.score && !agent.google_rating && !hasTxns && !agent.claimed;

  return {
    title: `${agent.name} - Property Agent at ${agent.agency_name} | Track Record & Profile`,
    description: `${agent.name} (CEA ${agent.cea_registration}) at ${agent.agency_name}.${txnDesc} View full transaction history and profile on FairComparisons.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/agent/${slug}` },
    ...(isThin && { robots: { index: false, follow: true } }),
  };
}

export async function generateStaticParams() {
  // Pre-render top 500 agents by score to stay within Vercel limits.
  // Other agents render on-demand via ISR (dynamicParams = true).
  const { data } = await supabase
    .from("sg_agents")
    .select("slug")
    .not("score", "is", null)
    .order("score", { ascending: false })
    .limit(500);
  return (data ?? []).map((a) => ({ slug: a.slug }));
}

// --- Page ---
export default async function AgentPage({ params }: Props) {
  const { slug } = await params;
  const { data: agent } = await supabase.from("sg_agents").select("*").eq("slug", slug).single();
  if (!agent) notFound();

  const [agencyRes, trackRes, listingsRes, colleaguesRes] = await Promise.all([
    agent.agency_id
      ? supabase.from("sg_agencies").select("name, slug, agent_count, google_rating, google_review_count, address, website").eq("id", agent.agency_id).single()
      : Promise.resolve({ data: null }),
    supabase.rpc("get_agent_track_record", { reg_num: agent.cea_registration }),
    supabase.from("sg_listings").select("title, address, price, property_type, district_code, listing_type").eq("agent_license", agent.cea_registration).limit(10),
    agent.agency_id
      ? supabase.from("sg_agents").select("name, slug, cea_registration").eq("agency_id", agent.agency_id).neq("slug", slug).limit(8)
      : Promise.resolve({ data: [] }),
  ]);

  const agency = agencyRes.data;
  const track = (trackRes.data?.[0] as TrackRecord | undefined) ?? null;
  const listings = (listingsRes.data ?? []) as Listing[];
  const colleagues = colleaguesRes.data ?? [];
  const hasTxns = track && track.total_txns > 0;
  const hasListings = listings.length > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: agent.name,
    ...(agency && { worksFor: { "@type": "RealEstateAgent", name: agency.name } }),
    address: { "@type": "PostalAddress", addressLocality: "Singapore", addressCountry: "SG" },
    ...(agent.google_rating && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: agent.google_rating, reviewCount: agent.google_review_count },
    }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          {agency && (
            <>
              <span className="mx-1.5">/</span>
              <Link href={`/property-agents/agency/${agency.slug}`} className="hover:text-gray-600">{agency.name}</Link>
            </>
          )}
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">{agent.name}</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-teal-50/60 to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-8 pt-8 md:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-xl font-bold text-teal-700">
              {agent.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">{agent.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                CEA {agent.cea_registration}
                {agency && <> at <Link href={`/property-agents/agency/${agency.slug}`} className="text-teal-600 hover:underline">{agency.name}</Link></>}
              </p>
            </div>
            {agent.score && (
              <div className="flex flex-col items-center rounded-xl border border-teal-200 bg-white px-4 py-3 shadow-sm">
                <span className="text-3xl font-extrabold text-teal-600">{Math.round(Number(agent.score))}</span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-gray-400">AgentScore</span>
              </div>
            )}
          </div>

          {hasTxns && (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Transactions" value={track.total_txns.toString()} subtext="CEA recorded" />
              <StatCard label="Active Since" value={track.earliest_txn} subtext={`${yearsActive(track.earliest_txn, track.latest_txn)} in the market`} />
              <StatCard label="Specialization" value={
                Object.entries(track.property_types).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace("_", " ").replace("CONDOMINIUM APARTMENTS", "Condo").replace("LANDED PROPERTIES", "Landed") ?? "Mixed"
              } subtext={`${Math.round((Object.entries(track.property_types).sort((a, b) => b[1] - a[1])[0]?.[1] ?? 0) / track.total_txns * 100)}% of deals`} />
              <StatCard label="Primary Area" value={track.top_towns?.[0]?.town ?? track.top_districts?.[0]?.district?.split("/")[0]?.trim() ?? "Various"} subtext={`${track.top_towns?.[0]?.count ?? track.top_districts?.[0]?.count ?? 0} transactions`} />
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-8 lg:col-span-3">

            {/* Claim Banner */}
            <ClaimBanner agentId={agent.id} agentName={agent.name} claimed={agent.claimed ?? false} />

            {/* Widget Embed */}
            {agent.score && (
              <details className="rounded-xl border border-gray-200 bg-white">
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-gray-900 hover:text-teal-600">
                  Embed your AgentScore on your website
                </summary>
                <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                  <p className="text-xs text-gray-500">Copy this code and paste it on your website, listing portals profile, or share via WhatsApp.</p>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <code className="block text-xs text-gray-600 break-all select-all">
                      {`<iframe src="https://fair-comparisons.com/api/widget?reg=${agent.cea_registration}" width="320" height="200" frameborder="0" style="border:none;border-radius:12px"></iframe>`}
                    </code>
                  </div>
                  <p className="text-xs text-gray-400">Or use the script tag:</p>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <code className="block text-xs text-gray-600 break-all select-all">
                      {`<script src="https://fair-comparisons.com/api/widget?reg=${agent.cea_registration}&format=js"></script>`}
                    </code>
                  </div>
                </div>
              </details>
            )}

            {/* Track Record Narrative */}
            {hasTxns && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Transaction Track Record</h2>
                <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                  <p>
                    {agent.name} has completed <strong>{track.total_txns} recorded property transactions</strong> since{" "}
                    {track.earliest_txn}, spanning {yearsActive(track.earliest_txn, track.latest_txn)} of activity in
                    the Singapore property market. This track record is based on data published by the Council for
                    Estate Agencies (CEA) through their public register.
                  </p>

                  <p>
                    {agent.name} {specialization(track.property_types)}.
                    {Object.keys(track.property_types).length > 1 && (
                      <> The full breakdown: {Object.entries(track.property_types).sort((a, b) => b[1] - a[1]).map(([type, count]) =>
                        `${type.replace("_", " ").toLowerCase()} (${count})`
                      ).join(", ")}.</>
                    )}
                  </p>

                  {Object.keys(track.transaction_types).length > 0 && (
                    <p>
                      By transaction type, the split is: {txnTypeInsight(track.transaction_types)}.
                      {track.transaction_types["RESALE"] && track.transaction_types["RESALE"] > track.total_txns * 0.5 && (
                        <> A resale-heavy portfolio suggests experience with pricing negotiations, valuations, and managing buyer/seller expectations in the secondary market.</>
                      )}
                      {track.transaction_types["WHOLE RENTAL"] && track.transaction_types["WHOLE RENTAL"] > track.total_txns * 0.5 && (
                        <> A rental-focused practice indicates strong connections with landlords and tenants, and knowledge of rental market dynamics including tenancy agreements and yield expectations.</>
                      )}
                      {track.transaction_types["NEW SALE"] && track.transaction_types["NEW SALE"] > track.total_txns * 0.3 && (
                        <> Significant new sale activity points to strong developer relationships and experience with new launch pricing, progressive payment schemes, and early buyer incentives.</>
                      )}
                    </p>
                  )}

                  {Object.keys(track.represented_roles).length > 0 && (
                    <p>
                      In terms of representation, {agent.name} has acted for: {roleInsight(track.represented_roles)}.
                      {track.represented_roles["BUYER"] && track.represented_roles["SELLER"] && (
                        <> Experience on both sides of the transaction provides an understanding of each party&apos;s concerns and negotiation leverage points.</>
                      )}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Area Expertise */}
            {hasTxns && (track.top_towns?.length ?? 0) > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Area Expertise</h2>
                <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                  {track.top_towns && track.top_towns.length > 0 && (
                    <p>
                      {agent.name}&apos;s transactions are concentrated in{" "}
                      {track.top_towns.slice(0, 3).map((t, i) => {
                        const pct = Math.round((t.count / track.total_txns) * 100);
                        return `${t.town} (${t.count} deals, ${pct}%)`;
                      }).join(", ")}
                      {track.top_towns.length > 3 && `, and ${track.top_towns.length - 3} other areas`}.
                      {track.top_towns[0].count > track.total_txns * 0.3 && (
                        <> The concentration in {track.top_towns[0].town} suggests deep local knowledge of pricing, block premiums, and buyer preferences in that area.</>
                      )}
                    </p>
                  )}
                  {track.top_districts && track.top_districts.length > 0 && !track.top_towns?.[0]?.town && (
                    <p>
                      Primary areas of activity: {track.top_districts.slice(0, 3).map(d =>
                        `${d.district} (${d.count} transactions)`
                      ).join(", ")}.
                    </p>
                  )}
                </div>
                {track.top_towns && track.top_towns.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {track.top_towns.map((t, i) => {
                      const w = Math.max(20, Math.round((t.count / track.top_towns![0].count) * 100));
                      return (
                        <div key={t.town} className="rounded-lg border border-gray-100 bg-white px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${i < 3 ? "bg-teal-600" : "bg-gray-400"}`}>{i + 1}</span>
                              <span className="text-sm font-medium text-gray-900">{t.town}</span>
                            </div>
                            <span className="text-sm text-gray-500">{t.count} transactions</span>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                            <div className="h-1.5 rounded-full bg-teal-200" style={{ width: `${w}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Active Listings */}
            {hasListings && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Current Listings</h2>
                <p className="mt-1 text-sm text-gray-500">Properties currently listed by {agent.name} on listing portals.</p>
                <div className="mt-4 space-y-2">
                  {listings.map((l, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-gray-100 bg-white px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{l.title}</p>
                          <p className="text-xs text-gray-500">{l.address} · {l.property_type} · {l.listing_type}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{formatPrice(l.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Agency Context */}
            {agency && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">About {agency.name}</h2>
                <div className="mt-4 text-[15px] leading-[1.75] text-gray-600">
                  <p>
                    {agent.name} is registered under{" "}
                    <Link href={`/property-agents/agency/${agency.slug}`} className="text-teal-600 hover:underline">{agency.name}</Link>,
                    which has {agency.agent_count.toLocaleString()} registered agents.
                    {agency.google_rating && (
                      <> The agency holds a {Number(agency.google_rating).toFixed(1)}/5 rating based on {agency.google_review_count} Google reviews.</>
                    )}
                    {agency.address && <> Their office is located at {agency.address}.</>}
                  </p>
                </div>
              </section>
            )}

            {/* No data message */}
            {!hasTxns && !hasListings && (
              <section className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <h2 className="text-lg font-bold text-gray-900">Limited Data Available</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
                  {agent.name} (CEA {agent.cea_registration}) is a registered property agent at {agent.agency_name}.
                  We are currently loading transaction history from the CEA public register. Check back soon for
                  a complete profile with transaction track record, area expertise, and specialization data.
                </p>
                <p className="mt-3 text-xs text-gray-400">
                  CEA registration verifiable at{" "}
                  <a href="https://www.cea.gov.sg/aceas/public-register" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">cea.gov.sg</a>.
                </p>
              </section>
            )}

            <p className="text-[11px] text-gray-400">
              Source: Council for Estate Agencies (CEA) Public Register, listing portals. Analysis by FairComparisons.
            </p>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:col-span-2">
            {hasTxns && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Quick Summary</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
                  {agent.name} has {track.total_txns} recorded transactions over {yearsActive(track.earliest_txn, track.latest_txn)},
                  and {specialization(track.property_types)}.
                  {track.top_towns?.[0] && ` Most active in ${track.top_towns[0].town}.`}
                </p>
              </div>
            )}

            {/* Score Breakdown */}
            {agent.score && agent.score_breakdown && (
              <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-teal-700">AgentScore Breakdown</h3>
                <div className="mt-4 space-y-2.5">
                  {[
                    { label: "Volume", key: "volume", max: 30 },
                    { label: "Recency", key: "recency", max: 25 },
                    { label: "Diversity", key: "diversity", max: 15 },
                    { label: "Experience", key: "experience", max: 15 },
                    { label: "Reviews", key: "reviews", max: 15 },
                  ].map((dim) => {
                    const val = Number((agent.score_breakdown as Record<string, number>)[dim.key] ?? 0);
                    const pct = Math.round((val / dim.max) * 100);
                    return (
                      <div key={dim.key}>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">{dim.label}</span>
                          <span className="font-medium text-gray-900">{val}/{dim.max}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-teal-100">
                          <div className="h-1.5 rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Agent Details</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">CEA Reg</dt>
                  <dd className="font-medium text-gray-900">{agent.cea_registration}</dd>
                </div>
                {agency && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Agency</dt>
                    <dd><Link href={`/property-agents/agency/${agency.slug}`} className="font-medium text-teal-600">{agency.name}</Link></dd>
                  </div>
                )}
                {hasTxns && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Transactions</dt>
                      <dd className="font-medium text-gray-900">{track.total_txns}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Active since</dt>
                      <dd className="font-medium text-gray-900">{track.earliest_txn}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Latest deal</dt>
                      <dd className="font-medium text-gray-900">{track.latest_txn}</dd>
                    </div>
                  </>
                )}
                {agent.specialization && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Specialization</dt>
                    <dd className="font-medium text-gray-900">{(agent.specialization as string).replace("_", " ").replace("CONDOMINIUM APARTMENTS", "Condo")}</dd>
                  </div>
                )}
                {agent.primary_area && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Primary area</dt>
                    <dd className="font-medium text-gray-900 text-right max-w-[150px] truncate">{agent.primary_area}</dd>
                  </div>
                )}
                {hasListings && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Active listings</dt>
                    <dd className="font-medium text-gray-900">{listings.length}</dd>
                  </div>
                )}
              </dl>
            </div>

            {colleagues.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Colleagues at {agency?.name}</h3>
                <div className="mt-3 space-y-2">
                  {colleagues.map((c) => (
                    <Link key={c.slug} href={`/property-agents/agent/${c.slug}`}
                      className="group flex items-center gap-2 rounded-lg bg-gray-50 p-2 transition hover:bg-teal-50">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-700">
                        {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-sm text-gray-900 group-hover:text-teal-600">{c.name}</span>
                    </Link>
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
