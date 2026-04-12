import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { formatPrice } from "../../../lib/narrativeHelpers";
import ClaimBanner from "../../../components/ClaimBanner";
import AgentReviews from "../../../components/AgentReviews";
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
function propTypeLabel(raw: string): string {
  const map: Record<string, string> = {
    HDB: "HDB",
    CONDOMINIUM_APARTMENTS: "Condo",
    LANDED_PROPERTIES: "Landed",
    EXECUTIVE_CONDOMINIUM: "EC",
  };
  return map[raw] ?? raw.charAt(0) + raw.slice(1).toLowerCase().replace("_", " ");
}

function txnTypeLabel(raw: string): string {
  return raw.charAt(0) + raw.slice(1).toLowerCase().replace("_", " ");
}

function yearsActive(earliest: string, latest: string): string {
  const months: Record<string, number> = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
  try {
    const [m1, y1] = earliest.split("-");
    const [m2, y2] = latest.split("-");
    const start = new Date(parseInt(y1), months[m1] ?? 0);
    const end = new Date(parseInt(y2), months[m2] ?? 0);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (diff < 1) return "< 1 year";
    return `${Math.round(diff)} years`;
  } catch {
    return "";
  }
}

function getAreas(track: TrackRecord) {
  const townCov = track.top_towns?.reduce((s, t) => s + t.count, 0) ?? 0;
  const useTowns = track.top_towns && track.top_towns.length > 0 && townCov >= track.total_txns * 0.5;
  return useTowns
    ? track.top_towns!.map(t => ({ name: t.town, count: t.count }))
    : (track.top_districts ?? []).map(d => ({ name: d.district, count: d.count }));
}

function percentileLabel(p: number): string {
  if (p <= 1) return "Top 1%";
  if (p <= 5) return `Top ${p}%`;
  if (p <= 10) return `Top ${p}%`;
  if (p <= 25) return `Top ${p}%`;
  return "";
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
  const txnDesc = hasTxns ? ` ${agent.transaction_count} recorded transactions.` : "";
  const isThin = !agent.score && !agent.google_rating && !hasTxns && !agent.claimed;

  return {
    title: `${agent.name} - Property Agent at ${agent.agency_name} | Track Record & Profile`,
    description: `${agent.name} (CEA ${agent.cea_registration}) at ${agent.agency_name}.${txnDesc} View full transaction history and profile on FairComparisons.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/agent/${slug}` },
    ...(isThin && { robots: { index: false, follow: true } }),
  };
}

export async function generateStaticParams() {
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
      ? supabase.from("sg_agents").select("name, slug, cea_registration, score, transaction_count").eq("agency_id", agent.agency_id).neq("slug", slug).order("score", { ascending: false }).limit(6)
      : Promise.resolve({ data: [] }),
  ]);

  const agency = agencyRes.data;
  const track = (trackRes.data?.[0] as TrackRecord | undefined) ?? null;
  const listings = (listingsRes.data ?? []) as Listing[];
  const colleagues = colleaguesRes.data ?? [];
  const hasTxns = track && track.total_txns > 0;
  const hasListings = listings.length > 0;
  const score = agent.score ? Math.round(Number(agent.score)) : null;
  const areas = hasTxns ? getAreas(track) : [];
  const primaryArea = areas[0]?.name ?? agent.primary_area ?? null;

  // Prop type entries sorted
  const propEntries = hasTxns
    ? Object.entries(track.property_types).sort((a, b) => b[1] - a[1])
    : [];
  const txnEntries = hasTxns
    ? Object.entries(track.transaction_types).sort((a, b) => b[1] - a[1])
    : [];
  const roleEntries = hasTxns
    ? Object.entries(track.represented_roles).sort((a, b) => b[1] - a[1])
    : [];

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

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "Property Agents", item: "https://fair-comparisons.com/property-agents" },
      ...(agency ? [{ "@type": "ListItem", position: 3, name: agency.name, item: `https://fair-comparisons.com/property-agents/agency/${agency.slug}` }] : []),
      { "@type": "ListItem", position: agency ? 4 : 3, name: agent.name },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Breadcrumb */}
      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/property-agents" className="hover:text-gray-600">Property Agents</Link>
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

      {/* ============================================================
          HERO - Score-led design. The number is the hook.
          ============================================================ */}
      <section className="border-b border-gray-100 bg-gradient-to-br from-gray-50 via-white to-teal-50/40">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-10 md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">

            {/* Score badge - the visual anchor */}
            {score ? (
              <div className="relative flex-shrink-0">
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-2xl border-2 border-teal-200 bg-white shadow-lg shadow-teal-100/50">
                  <span className="text-5xl font-black tracking-tight text-teal-600">{score}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">AgentScore</span>
                </div>
                {agent.percentile && agent.percentile <= 25 && (
                  <span className="absolute -right-2 -top-2 rounded-full bg-teal-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
                    {percentileLabel(agent.percentile)}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-2xl font-bold text-gray-400">
                {agent.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
            )}

            {/* Name + key facts */}
            <div className="flex-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">{agent.name}</h1>
              <p className="mt-2 text-base text-gray-500">
                {agency ? (
                  <>Property agent at <Link href={`/property-agents/agency/${agency.slug}`} className="font-medium text-teal-600 hover:underline">{agency.name}</Link></>
                ) : (
                  <>Registered property agent</>
                )}
                <span className="mx-2 text-gray-300">|</span>
                <span className="text-gray-400">CEA {agent.cea_registration}</span>
              </p>

              {/* Inline highlight chips */}
              {hasTxns && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
                    <span className="text-teal-600 font-bold">{track.total_txns}</span> transactions
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
                    <span className="text-teal-600 font-bold">{yearsActive(track.earliest_txn, track.latest_txn)}</span> in market
                  </span>
                  {propEntries[0] && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
                      <span className="text-teal-600 font-bold">{Math.round((propEntries[0][1] / track.total_txns) * 100)}%</span> {propTypeLabel(propEntries[0][0])}
                    </span>
                  )}
                  {primaryArea && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
                      {primaryArea}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          MAIN CONTENT GRID
          ============================================================ */}
      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-3">

          {/* --- LEFT COLUMN (2/3) --- */}
          <div className="space-y-10 lg:col-span-2">

            {/* Claim Banner */}
            <ClaimBanner agentId={agent.id} agentName={agent.name} claimed={agent.claimed ?? false} />

            {/* ---- DATA DASHBOARD ---- */}
            {hasTxns && (
              <section>
                <h2 className="text-lg font-bold text-gray-900">Performance overview</h2>
                <p className="mt-1 text-sm text-gray-500">Based on {track.total_txns} transactions recorded by CEA since {track.earliest_txn}.</p>

                {/* Property Type Breakdown - horizontal stacked bar */}
                {propEntries.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Property types</h3>
                    <div className="mt-2 flex h-8 overflow-hidden rounded-lg">
                      {propEntries.map(([type, count], i) => {
                        const pct = (count / track.total_txns) * 100;
                        const colors = ["bg-teal-500", "bg-teal-300", "bg-amber-400", "bg-gray-300", "bg-gray-200"];
                        return (
                          <div
                            key={type}
                            className={`${colors[i] ?? colors[4]} flex items-center justify-center text-[11px] font-semibold ${i === 0 ? "text-white" : "text-gray-700"}`}
                            style={{ width: `${Math.max(pct, 4)}%` }}
                            title={`${propTypeLabel(type)}: ${count} (${Math.round(pct)}%)`}
                          >
                            {pct >= 12 && `${propTypeLabel(type)} ${Math.round(pct)}%`}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {propEntries.map(([type, count], i) => {
                        const colors = ["bg-teal-500", "bg-teal-300", "bg-amber-400", "bg-gray-300", "bg-gray-200"];
                        return (
                          <span key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${colors[i] ?? colors[4]}`} />
                            {propTypeLabel(type)} ({count})
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Transaction Types */}
                {txnEntries.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Transaction types</h3>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {txnEntries.map(([type, count]) => {
                        const pct = Math.round((count / track.total_txns) * 100);
                        return (
                          <div key={type} className="rounded-lg border border-gray-100 bg-white px-3 py-2.5">
                            <p className="text-lg font-bold text-gray-900">{pct}%</p>
                            <p className="text-xs text-gray-500">{txnTypeLabel(type)}</p>
                            <p className="text-[10px] text-gray-400">{count} deals</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Representation split */}
                {roleEntries.length > 1 && (
                  <div className="mt-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Representation</h3>
                    <div className="mt-2 flex gap-2">
                      {roleEntries.map(([role, count]) => {
                        const pct = Math.round((count / track.total_txns) * 100);
                        return (
                          <div key={role} className="flex-1 rounded-lg border border-gray-100 bg-white px-3 py-2.5 text-center">
                            <p className="text-lg font-bold text-gray-900">{pct}%</p>
                            <p className="text-xs text-gray-500">{role.charAt(0) + role.slice(1).toLowerCase()}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ---- AREA EXPERTISE ---- */}
            {areas.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900">Where {agent.name.split(" ")[0]} is most active</h2>
                <div className="mt-4 space-y-2">
                  {areas.map((a, i) => {
                    const pct = Math.round((a.count / track!.total_txns) * 100);
                    const barW = Math.max(8, Math.round((a.count / areas[0].count) * 100));
                    return (
                      <div key={a.name} className="group rounded-lg border border-gray-100 bg-white px-4 py-3 transition hover:border-teal-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${i === 0 ? "bg-teal-600" : i < 3 ? "bg-teal-400" : "bg-gray-300"}`}>{i + 1}</span>
                            <div>
                              <span className="text-sm font-semibold text-gray-900">{a.name}</span>
                              <span className="ml-2 text-xs text-gray-400">{pct}% of deals</span>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-gray-700">{a.count}</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                          <div className={`h-1.5 rounded-full ${i === 0 ? "bg-teal-500" : "bg-teal-200"}`} style={{ width: `${barW}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ---- REVIEWS ---- */}
            <AgentReviews agentId={agent.id} agentName={agent.name} />

            {/* ---- LISTINGS ---- */}
            {hasListings && (
              <section>
                <h2 className="text-lg font-bold text-gray-900">Current listings</h2>
                <p className="mt-1 text-sm text-gray-500">{listings.length} active {listings.length === 1 ? "property" : "properties"} on listing portals.</p>
                <div className="mt-4 space-y-2">
                  {listings.map((l, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-100 bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">{l.title}</p>
                          <p className="text-xs text-gray-500">{l.address} &middot; {propTypeLabel(l.property_type)} &middot; {txnTypeLabel(l.listing_type)}</p>
                        </div>
                        <span className="flex-shrink-0 text-sm font-bold text-gray-900">{formatPrice(l.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ---- AGENCY ---- */}
            {agency && (
              <section className="rounded-xl border border-gray-100 bg-gray-50/50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-bold text-teal-600 shadow-sm ring-1 ring-gray-200">
                    {agency.name.split(" ")[0]?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <Link href={`/property-agents/agency/${agency.slug}`} className="font-semibold text-gray-900 hover:text-teal-600">{agency.name}</Link>
                    <p className="text-xs text-gray-500">
                      {agency.agent_count.toLocaleString()} agents
                      {agency.google_rating && <> &middot; {Number(agency.google_rating).toFixed(1)}/5 ({agency.google_review_count} reviews)</>}
                    </p>
                  </div>
                </div>
                {agency.address && <p className="mt-2 text-xs text-gray-400">{agency.address}</p>}
              </section>
            )}

            {/* ---- NO DATA ---- */}
            {!hasTxns && !hasListings && (
              <section className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <h2 className="text-lg font-bold text-gray-900">Profile loading</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
                  {agent.name} (CEA {agent.cea_registration}) is a registered property agent
                  {agency ? ` at ${agency.name}` : ""}. Transaction data from CEA&apos;s public register is being loaded. Check back soon for a complete profile.
                </p>
              </section>
            )}

            <p className="text-[11px] text-gray-400">
              Source: Council for Estate Agencies (CEA) Public Register, listing portals. Analysis by FairComparisons.
            </p>
          </div>

          {/* --- SIDEBAR (1/3) --- */}
          <aside className="space-y-5">

            {/* Score Breakdown */}
            {score && agent.score_breakdown && (
              <div className="rounded-xl border border-teal-100 bg-gradient-to-b from-teal-50/80 to-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-teal-700">Score breakdown</h3>
                <div className="mt-4 space-y-3">
                  {([
                    { label: "Transaction volume", key: "volume", max: 30 },
                    { label: "Recent activity", key: "recency", max: 25 },
                    { label: "Market diversity", key: "diversity", max: 15 },
                    { label: "Years of experience", key: "experience", max: 15 },
                    { label: "Client reviews", key: "reviews", max: 15 },
                  ] as const).map((dim) => {
                    const val = Number((agent.score_breakdown as Record<string, number>)[dim.key] ?? 0);
                    const pct = Math.round((val / dim.max) * 100);
                    return (
                      <div key={dim.key}>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">{dim.label}</span>
                          <span className="font-bold text-gray-900">{val}<span className="font-normal text-gray-400">/{dim.max}</span></span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-teal-100">
                          <div
                            className={`h-2 rounded-full ${pct >= 80 ? "bg-teal-500" : pct >= 50 ? "bg-teal-400" : "bg-teal-300"}`}
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Link href="/about" className="mt-4 block text-center text-[11px] text-gray-400 hover:text-teal-600">How is AgentScore calculated?</Link>
              </div>
            )}

            {/* Agent Details Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Details</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">CEA registration</dt>
                  <dd className="font-medium text-gray-900">{agent.cea_registration}</dd>
                </div>
                {agency && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Agency</dt>
                    <dd className="text-right"><Link href={`/property-agents/agency/${agency.slug}`} className="font-medium text-teal-600 hover:underline">{agency.name}</Link></dd>
                  </div>
                )}
                {hasTxns && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Total transactions</dt>
                      <dd className="font-medium text-gray-900">{track.total_txns}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Active since</dt>
                      <dd className="font-medium text-gray-900">{track.earliest_txn}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Last recorded deal</dt>
                      <dd className="font-medium text-gray-900">{track.latest_txn}</dd>
                    </div>
                  </>
                )}
                {primaryArea && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Primary area</dt>
                    <dd className="max-w-[160px] truncate text-right font-medium text-gray-900">{primaryArea}</dd>
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

            {/* Widget Embed - collapsed by default, only relevant for agents */}
            {score && (
              <details className="rounded-xl border border-gray-200 bg-white">
                <summary className="cursor-pointer px-5 py-3.5 text-xs font-medium text-gray-500 hover:text-teal-600">
                  Embed your score on your website
                </summary>
                <div className="border-t border-gray-100 px-5 py-4 space-y-2">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <code className="block text-[11px] text-gray-600 break-all select-all">
                      {`<iframe src="https://fair-comparisons.com/api/widget?reg=${agent.cea_registration}" width="320" height="200" frameborder="0" style="border:none;border-radius:12px"></iframe>`}
                    </code>
                  </div>
                </div>
              </details>
            )}

            {/* Colleagues */}
            {colleagues.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Other agents at {agency?.name}</h3>
                <div className="mt-3 space-y-1.5">
                  {colleagues.map((c) => (
                    <Link key={c.slug} href={`/property-agents/agent/${c.slug}`}
                      className="group flex items-center justify-between rounded-lg px-2 py-1.5 transition hover:bg-teal-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-500 group-hover:bg-teal-100 group-hover:text-teal-700">
                          {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="truncate text-sm text-gray-700 group-hover:text-teal-700">{c.name}</span>
                      </div>
                      {c.score && (
                        <span className="flex-shrink-0 text-xs font-bold text-gray-400">{Math.round(Number(c.score))}</span>
                      )}
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
