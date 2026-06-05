import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { formatPrice } from "../../../lib/narrativeHelpers";
import AgentReviews from "../../../components/AgentReviews";
import VerifiedReviews from "../../../components/VerifiedReviews";
import FunnelTracker from "../../../components/FunnelTracker";
import { bandFor } from "../../../components/Brand";
import { titleName, givenName, cleanAgency, saleShare } from "../../../lib/names";
import ClaimBanner from "../../../components/ClaimBanner";
import StickyMobileCta from "../../../components/StickyMobileCta";
import AgentTransactionRecord from "../../../components/AgentTransactionRecord";
import type { Metadata } from "next";

export const revalidate = 43200; // 12h; daily cron also force-revalidates
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
    CONDOMINIUM_APARTMENTS: "Condo & apartment",
    LANDED_PROPERTIES: "Landed",
    EXECUTIVE_CONDOMINIUM: "EC",
  };
  return map[raw] ?? raw.charAt(0) + raw.slice(1).toLowerCase().replace(/_/g, " ");
}

function txnTypeLabel(raw: string): string {
  return raw.charAt(0) + raw.slice(1).toLowerCase().replace(/_/g, " ");
}

function fmtMonthYear(d: string | null | undefined): string {
  if (!d) return "";
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return `${m[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

// "APR-2017" -> "Apr 2017"
function fmtTxnMonth(s: string | null | undefined): string {
  if (!s) return "";
  const map: Record<string, string> = { JAN: "Jan", FEB: "Feb", MAR: "Mar", APR: "Apr", MAY: "May", JUN: "Jun", JUL: "Jul", AUG: "Aug", SEP: "Sep", OCT: "Oct", NOV: "Nov", DEC: "Dec" };
  const [mo, yr] = s.split("-");
  return map[mo] ? `${map[mo]} ${yr}` : s;
}

function getAreas(track: TrackRecord) {
  const townCov = track.top_towns?.reduce((s, t) => s + t.count, 0) ?? 0;
  const useTowns = track.top_towns && track.top_towns.length > 0 && townCov >= track.total_txns * 0.5;
  return useTowns
    ? track.top_towns!.map(t => ({ name: t.town, count: t.count }))
    : (track.top_districts ?? []).map(d => ({ name: d.district, count: d.count }));
}

// --- Metadata ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: agent } = await supabase
    .from("sg_agents")
    .select("name, agency_name, cea_registration, google_rating, score, transaction_count, claimed, primary_area, marketing_name, marketing_name_status")
    .eq("slug", slug)
    .single();
  if (!agent) return {};

  const hasTxns = (agent.transaction_count ?? 0) > 0;
  const s = agent.score ? Math.round(Number(agent.score)) : null;
  const isThin = !agent.score && !agent.google_rating && !hasTxns && !agent.claimed;
  // Agent-supplied marketing name (approved), so the page matches the name
  // clients actually search for, e.g. "Chew Phek Hong (Cindy Chew)".
  const marketing = agent.marketing_name_status === "approved" && agent.marketing_name ? agent.marketing_name.trim() : null;
  const display = marketing ? `${titleName(agent.name)} (${marketing})` : titleName(agent.name);

  // Title front-loads the searches that should land here: name (+ marketing
  // name), agency, "property agent", and area, then the differentiators. No em
  // dashes. The layout template appends " | FairComparisons".
  const areaStr = agent.primary_area ? titleName(agent.primary_area) : null;
  const lead = `${display}, ${cleanAgency(agent.agency_name)} Property Agent${areaStr ? ` in ${areaStr}` : ""}`;
  const titleTail = [
    hasTxns ? `${agent.transaction_count} CEA Transactions` : null,
    s ? `AgentScore ${s}` : null,
  ].filter(Boolean).join(", ");
  const title = titleTail ? `${lead} | ${titleTail}` : lead;

  const areaPart = agent.primary_area ? ` Active in ${titleName(agent.primary_area)}.` : "";
  const description = s
    ? `${display} (${cleanAgency(agent.agency_name)}, CEA ${agent.cea_registration}) has an AgentScore of ${s}/100 based on ${agent.transaction_count ?? 0} CEA-recorded transactions.${areaPart} View full track record, property types, and areas of expertise.`
    : `${display} (CEA ${agent.cea_registration}) at ${cleanAgency(agent.agency_name)}.${hasTxns ? ` ${agent.transaction_count} recorded transactions.` : ""}${areaPart} View transaction history and profile.`;

  const url = `https://fair-comparisons.com/property-agents/agent/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    ...(isThin && { robots: { index: false, follow: true } }),
    openGraph: {
      title: `${display}${s ? ` - AgentScore ${s}/100` : ""} | ${cleanAgency(agent.agency_name)}`,
      description,
      url,
      siteName: "FairComparisons",
      locale: "en_SG",
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${display}${s ? ` (Score: ${s})` : ""} | ${cleanAgency(agent.agency_name)}`,
      description,
    },
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
  const { data: agent } = await supabase
    .from("sg_agents")
    .select(
      "id, name, slug, cea_registration, agency_id, agency_name, google_rating, google_review_count, specializations, created_at, score, score_breakdown, transaction_count, specialization, primary_area, years_active, score_updated_at, claimed, claimed_at, percentile, bio, photo_url, whatsapp, subscription_tier, propertyguru_url, message, message_status, message_updated_at, photo_status, photo_updated_at, bio_status, bio_updated_at, review_aggregate, marketing_name, marketing_name_status"
    )
    .eq("slug", slug)
    .single();
  if (!agent) notFound();

  const [agencyRes, trackRes, listingsRes] = await Promise.all([
    agent.agency_id
      ? supabase.from("sg_agencies").select("name, slug, agent_count, google_rating, google_review_count, address, website").eq("id", agent.agency_id).single()
      : Promise.resolve({ data: null }),
    supabase.rpc("get_agent_track_record", { reg_num: agent.cea_registration }),
    supabase.from("sg_listings").select("title, address, price, property_type, district_code, listing_type").eq("agent_license", agent.cea_registration).limit(6),
  ]);

  const agency = agencyRes.data;
  const track = (trackRes.data?.[0] as TrackRecord | undefined) ?? null;
  const listings = (listingsRes.data ?? []) as Listing[];

  const { count: verifiedCompletions } = await supabase
    .from("sg_lead_completions")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agent.id)
    .eq("fee_status", "paid");

  const hasTxns = !!(track && track.total_txns > 0);
  const hasListings = listings.length > 0;
  const score = agent.score ? Math.round(Number(agent.score)) : null;
  const band = score != null ? bandFor(score) : null;
  const areas = hasTxns ? getAreas(track!) : [];
  const primaryArea = areas[0]?.name ?? agent.primary_area ?? null;

  const display = titleName(agent.name);
  const given = givenName(agent.name);
  const agencyName = cleanAgency(agent.agency_name);
  // Approved agent-supplied marketing name shown in the H1 (and JSON-LD) so the
  // page ranks for the name clients actually search. Body sentences keep the
  // formal name (display).
  const marketing = agent.marketing_name_status === "approved" && agent.marketing_name ? agent.marketing_name.trim() : null;
  const h1Name = marketing ? `${display} (${marketing})` : display;

  const total = hasTxns ? track!.total_txns : 0;
  const propEntries = hasTxns ? Object.entries(track!.property_types).sort((a, b) => b[1] - a[1]) : [];
  const roleEntries = hasTxns ? Object.entries(track!.represented_roles).sort((a, b) => b[1] - a[1]) : [];
  const roleTotal = roleEntries.reduce((s, [, n]) => s + n, 0) || 1;
  const areaMax = areas[0]?.count || 1;
  const areaFocusPct = hasTxns && total ? Math.round((areas[0]?.count ?? 0) / total * 100) : 0;
  const topProp = propEntries[0] ? { label: propTypeLabel(propEntries[0][0]), pct: Math.round(propEntries[0][1] / total * 100) } : null;
  const primaryShort = primaryArea ? titleName(primaryArea.split("/")[0].split(",")[0].trim()) : null;
  const updated = fmtMonthYear(agent.score_updated_at) || fmtMonthYear(agent.created_at);

  // Sale vs rental mix. A "best agent to sell" who mostly leases rentals would
  // mislead a seller, so flag it honestly when sales are the minority.
  const salePct = hasTxns ? Math.round(saleShare(track!.transaction_types) * 100) : null;
  const rentalFocused = salePct != null && salePct < 40 && total >= 10;

  // Real sold-evidence, straight from CEA records. Sales = anything with "SALE"
  // (resale/new sale/sub-sale), excluding rentals.
  const saleCount = hasTxns
    ? Object.entries(track!.transaction_types).reduce(
        (s, [k, n]) => s + (k.toUpperCase().includes("SALE") && !k.toUpperCase().includes("RENTAL") ? n : 0),
        0,
      )
    : 0;
  const rentalCount = hasTxns ? Math.max(0, total - saleCount) : 0;

  // Exp 1 claim-hook enrichment: real rank in the agent's primary area, area
  // size, and recent profile views, for the ego/loss-aversion claim prompt.
  // A/B by agent id. Only computed for unclaimed profiles.
  const claimVariant: "A" | "B" = agent.id % 2 === 0 ? "A" : "B";
  let claimRank: number | null = null;
  let claimArea: string | null = null;
  let claimAreaTotal: number | null = null;
  let claimViews7d = 0;
  if (!agent.claimed) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [rankRes, viewsRes] = await Promise.all([
      supabase.from("sg_area_top_agents").select("area_name, area_type, rank").eq("agent_slug", slug).order("rank", { ascending: true }).limit(1),
      supabase.from("sg_funnel_events").select("id", { count: "exact", head: true }).eq("event", "profile_view").eq("agent_id", agent.id).gte("created_at", sevenDaysAgo),
    ]);
    claimViews7d = viewsRes.count ?? 0;
    const rr = rankRes.data?.[0] as { area_name: string; area_type: string; rank: number } | undefined;
    if (rr) {
      claimRank = rr.rank;
      claimArea = titleName(rr.area_name.split("/")[0].split(",")[0].trim());
      const { count } = await supabase.from("sg_area_top_agents").select("id", { count: "exact", head: true }).eq("area_name", rr.area_name).eq("area_type", rr.area_type);
      claimAreaTotal = count ?? null;
    }
  }

  // Real AgentScore components, normalised to 0-100 against each dimension's max.
  const SB = (agent.score_breakdown ?? {}) as Record<string, number>;
  const scoreDims = [
    { label: "Transaction volume", key: "volume", max: 30 },
    { label: "Recent activity", key: "recency", max: 25 },
    { label: "Market diversity", key: "diversity", max: 15 },
    { label: "Years of experience", key: "experience", max: 15 },
  ].map((d) => ({ label: d.label, n: Math.round((Number(SB[d.key] ?? 0) / d.max) * 100) }));

  // Agent-supplied content only renders once moderated to "approved"
  // (set via /admin/moderation). Pending/rejected content stays hidden.
  const showPhoto = !!agent.photo_url && agent.photo_status === "approved";
  const showMessage = !!agent.message && agent.message_status === "approved";
  const showBio = !!agent.bio && agent.bio_status === "approved";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: display,
    ...(marketing && { alternateName: marketing }),
    ...(showPhoto && { image: agent.photo_url }),
    ...(showBio && { description: agent.bio }),
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
      { "@type": "ListItem", position: 2, name: "Compare agents", item: "https://fair-comparisons.com/property-agents" },
      ...(agency ? [{ "@type": "ListItem", position: 3, name: agency.name, item: `https://fair-comparisons.com/property-agents/agency/${agency.slug}` }] : []),
      { "@type": "ListItem", position: agency ? 4 : 3, name: display },
    ],
  };

  return (
    <>
      <FunnelTracker event="profile_view" agentId={agent.id} agentSlug={slug} pagePath={`/property-agents/agent/${slug}`} metadata={{ primary_area: agent.primary_area || null, specialization: agent.specialization || null, agency_name: agent.agency_name || null, claimed: !!agent.claimed, subscription_tier: agent.subscription_tier || "free" }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />

      {/* header */}
      <header className="fc-wrap" style={{ padding: "22px 40px 0" }}>
        <div className="sr-crumb">
          <Link href="/">Home</Link> / <Link href="/property-agents">Compare agents</Link>
          {agency && <> / <Link href={`/property-agents/agency/${agency.slug}`}>{cleanAgency(agency.name)}</Link></>} / {display}
        </div>

        {/* identity card */}
        <div className="fc-card" style={{ padding: 26, marginTop: 18 }}>
          <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
            {showPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={agent.photo_url!}
                alt={display}
                width={92}
                height={92}
                style={{ width: 92, height: 92, borderRadius: "var(--r-md)", objectFit: "cover", border: "1px solid var(--line)", flex: "0 0 auto" }}
              />
            )}
            {score != null && band && (
              <div className="score-box" style={{ width: 104, padding: "14px 10px", borderTopColor: band.color }}>
                <div className="score-num" style={{ fontSize: 42 }}>{score}</div>
                <div className="score-cap">AGENTSCORE</div>
                <div className="score-word" style={{ color: band.color }}>{band.word}</div>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 260 }}>
              <h1 style={{ margin: 0, fontSize: "clamp(28px,3.4vw,40px)" }}>{h1Name}</h1>
              <div className="agent-meta">{agencyName} property agent{agent.primary_area ? ` in ${titleName(agent.primary_area)}` : ""} · CEA {agent.cea_registration}</div>
              <div className="fc-row" style={{ gap: 8, marginTop: 14 }}>
                {hasTxns && <span className="statchip">{total} transactions</span>}
                {areaFocusPct > 0 && primaryShort && <span className="statchip">{areaFocusPct}% in {primaryShort}</span>}
                {topProp && <span className="statchip">{topProp.pct}% {topProp.label.toLowerCase()}</span>}
                {primaryArea && <span className="statchip">{titleName(primaryArea)}</span>}
              </div>
              <div className="fc-row" style={{ gap: 10, marginTop: 16 }}>
                <span className="fc-badge fc-badge--ranked"><span className="dot" /> Ranked on CEA data</span>
                {/* T3: shows once an agent claims + accepts the terms. Dormant
                    pre-launch (0 claimed today); auto-activates. Identity +
                    terms, not an endorsement of quality. */}
                {agent.claimed && (
                  <span className="fc-badge" title="This agent has claimed their profile and accepted the platform terms" style={{ background: "var(--ok-wash)", color: "var(--ok)" }}>
                    &#10003; Verified agent
                  </span>
                )}
                {rentalFocused && <span className="fc-badge fc-badge--warn">Mostly rentals · {salePct}% sales</span>}
                {updated && <span className="fc-badge fc-badge--source">Updated {updated}</span>}
              </div>
              {rentalFocused && (
                <p className="muted small" style={{ marginTop: 10, maxWidth: "60ch" }}>
                  Selling a home? Note that {salePct}% of {given}&apos;s recorded deals are sales; the rest are rentals. The record below shows the full mix.
                </p>
              )}
              {showMessage && (
                <p className="serif" style={{ marginTop: 14, fontSize: 16.5, lineHeight: 1.6, fontStyle: "italic", color: "var(--ink)", maxWidth: "60ch" }}>
                  &ldquo;{agent.message}&rdquo;
                </p>
              )}
            </div>
            <div className="fc-col" style={{ gap: 10 }}>
              <Link href={`/sell?agent=${slug}&utm_source=agent_profile`} className="fc-btn fc-btn--primary">Request an introduction to {given}</Link>
              <Link href="/property-agents/compare" className="fc-btn fc-btn--ghost fc-btn--sm">Compare with others</Link>
            </div>
          </div>
        </div>

        {/* agent-written bio (moderated) */}
        {showBio && (
          <div className="fc-card fc-card--pad" style={{ marginTop: 16 }}>
            <div className="kicker">About {given}</div>
            <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-line", maxWidth: "75ch" }}>{agent.bio}</p>
          </div>
        )}

        {/* claim banner — real interactive claim form (email + CEA), id="claim" */}
        {!agent.claimed && (
          <div style={{ marginTop: 16 }}>
            <ClaimBanner
              agentId={agent.id}
              agentName={agent.name}
              claimed={false}
              variant={claimVariant}
              rank={claimRank}
              areaName={claimArea}
              areaTotal={claimAreaTotal}
              score={score}
              profileViews7d={claimViews7d}
            />
          </div>
        )}
      </header>

      <div className="fc-wrap" style={{ padding: "36px 40px 72px" }}>
        <div className="ap-layout">
          {/* MAIN */}
          <main>
            {hasTxns ? (
              <>
                {/* Verified track record — real CEA sold-evidence + platform
                    completions, with honest empty states (no fabricated counts). */}
                <h2 style={{ fontSize: "clamp(22px,2.6vw,30px)" }}>Verified track record</h2>
                <div className="fc-card fc-card--pad" style={{ marginTop: 16 }}>
                  <div className="fc-grid-3" style={{ gap: 18 }}>
                    <div>
                      <div className="serif" style={{ fontSize: 30, fontWeight: 600 }}>{saleCount.toLocaleString()}</div>
                      <div className="muted small">Recorded sales</div>
                    </div>
                    <div>
                      <div className="serif" style={{ fontSize: 30, fontWeight: 600 }}>{rentalCount.toLocaleString()}</div>
                      <div className="muted small">Rental transactions</div>
                    </div>
                    <div>
                      <div className="serif" style={{ fontSize: 30, fontWeight: 600, color: verifiedCompletions ? "var(--ok)" : "var(--slate)" }}>
                        {verifiedCompletions || 0}
                      </div>
                      <div className="muted small">Completions via FairComparisons</div>
                    </div>
                  </div>
                  <p className="muted small" style={{ marginTop: 14 }}>
                    Sales and rentals are counted from official CEA salesperson records.{" "}
                    {verifiedCompletions
                      ? `${verifiedCompletions} sale${verifiedCompletions === 1 ? "" : "s"} closed through a FairComparisons referral and confirmed by payment.`
                      : "No sales have completed through a FairComparisons referral yet; this fills in as referred deals close."}
                  </p>
                </div>

                <h2 style={{ fontSize: "clamp(22px,2.6vw,30px)", marginTop: 40 }}>Performance overview</h2>
                <p className="muted small" style={{ margin: "6px 0 0" }}>Based on {total} CEA transactions recorded to date.</p>
                <div className="fc-card fc-card--pad" style={{ marginTop: 16 }}>
                  <div className="kicker" style={{ marginBottom: 8 }}>Property mix</div>
                  {propEntries.slice(0, 4).map(([type, n]) => {
                    const pct = Math.round((n / total) * 100);
                    return (
                      <div className="kpi" key={type}>
                        <span className="kpi__lab">{propTypeLabel(type)}</span>
                        <div className="kpi__track"><div className="kpi__fill" style={{ width: `${Math.max(pct, 2)}%` }} /></div>
                        <span className="kpi__val">{pct}%</span>
                      </div>
                    );
                  })}
                  {roleEntries.length > 0 && (
                    <>
                      <div className="kicker" style={{ margin: "18px 0 8px" }}>Represents</div>
                      {roleEntries.slice(0, 4).map(([role, n]) => {
                        const pct = Math.round((n / roleTotal) * 100);
                        return (
                          <div className="kpi" key={role}>
                            <span className="kpi__lab">{txnTypeLabel(role)}</span>
                            <div className="kpi__track"><div className="kpi__fill" style={{ width: `${Math.max(pct, 2)}%` }} /></div>
                            <span className="kpi__val">{pct}%</span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {areas.length > 0 && (
                  <>
                    <h2 style={{ fontSize: "clamp(22px,2.6vw,30px)", marginTop: 44 }}>Where {given} is most active</h2>
                    <div className="fc-card fc-card--pad" style={{ marginTop: 16, padding: "6px 24px 14px" }}>
                      {areas.slice(0, 5).map((a, i) => (
                        <div className="area" key={i}>
                          <div className="area__name">{titleName(a.name)}</div>
                          <span className="kpi__val">{a.count}</span>
                          <div className="area__bar"><div className="area__fill" style={{ width: `${Math.max(Math.round((a.count / areaMax) * 100), 4)}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="fc-card fc-card--pad">
                <h2 style={{ fontSize: 24 }}>Limited transaction record</h2>
                <p className="muted" style={{ marginTop: 8 }}>
                  We have limited recent CEA transaction data for {display}. When new transactions are recorded, the performance breakdown will appear here. We never inflate a thin record.
                </p>
              </div>
            )}

            {/* T1: real CEA transaction record — provenance + seller-side split */}
            {hasTxns && <AgentTransactionRecord cea={agent.cea_registration} given={given} />}

            {/* reviews (component renders its own "Client reviews" heading + form) */}
            <div style={{ marginTop: 44 }}>
              <VerifiedReviews agentId={agent.id} />
              <AgentReviews agentId={agent.id} agentName={display} />
            </div>

            {/* listings */}
            {hasListings && (
              <>
                <h2 style={{ fontSize: "clamp(22px,2.6vw,30px)", marginTop: 44 }}>Current listings</h2>
                <p className="muted small" style={{ margin: "6px 0 0" }}>Active marketing listings. Listings do not affect AgentScore or ranking.</p>
                <div className="fc-grid-2" style={{ marginTop: 16, gap: 16 }}>
                  {listings.map((l, i) => (
                    <div className="fc-card fc-card--pad fc-card--hover" key={i}>
                      <div className="kicker">{txnTypeLabel(l.listing_type || "For sale")}{l.title ? ` · ${l.title}` : ""}</div>
                      <div className="serif" style={{ fontWeight: 600, fontSize: 26, marginTop: 6 }}>{l.price ? formatPrice(l.price) : "Price on ask"}</div>
                      <div className="muted small">{[l.address, l.district_code].filter(Boolean).join(", ")}</div>
                    </div>
                  ))}
                </div>
                <p className="mono small muted" style={{ marginTop: 18 }}>AgentScore and ranking are computed from CEA, URA and HDB records only.</p>
              </>
            )}
          </main>

          {/* SIDEBAR */}
          <aside>
            <div className="ap-side">
              {score != null && agent.score_breakdown && (
                <div className="fc-card fc-card--pad">
                  <div className="kicker">Score breakdown</div>
                  <p className="small muted" style={{ margin: "6px 0 12px" }}>What feeds the AgentScore of {score}.</p>
                  {scoreDims.map((d) => (
                    <div className="kpi" style={{ gridTemplateColumns: "1fr 36px" }} key={d.label}>
                      <span className="kpi__lab" style={{ gridColumn: 1 }}>{d.label}</span>
                      <span className="kpi__val">{d.n}</span>
                      <div className="kpi__track" style={{ gridColumn: "1 / -1" }}><div className="kpi__fill" style={{ width: `${Math.max(d.n, 3)}%` }} /></div>
                    </div>
                  ))}
                  <div className="kpi" style={{ gridTemplateColumns: "1fr 36px" }}>
                    <span className="kpi__lab" style={{ gridColumn: 1 }}>Verified reviews</span>
                    <span className="kpi__val" style={{ fontSize: 11 }}>{verifiedCompletions ? verifiedCompletions : "n/a"}</span>
                    <div className="kpi__track" style={{ gridColumn: "1 / -1" }}><div className="kpi__fill" style={{ width: "4%", background: "var(--line-2)" }} /></div>
                  </div>
                  <p className="mono" style={{ fontSize: 10, color: "var(--slate)", marginTop: 10 }}>No input can be purchased. Thin data is shown as thin, not inflated.</p>
                  <Link href="/about" className="small" style={{ display: "block", marginTop: 10 }}>How is AgentScore calculated?</Link>
                </div>
              )}

              <div className="fc-card fc-card--pad">
                <div className="kicker">Agency</div>
                <div style={{ marginTop: 10 }}>
                  <div className="metarow"><span className="k">CEA registration</span><span className="v tnum">{agent.cea_registration}</span></div>
                  <div className="metarow"><span className="k">Agency</span><span className="v">{agency ? <Link href={`/property-agents/agency/${agency.slug}`}>{agencyName}</Link> : agencyName}</span></div>
                  {hasTxns && <div className="metarow"><span className="k">Total transactions</span><span className="v tnum">{total}</span></div>}
                  {primaryArea && <div className="metarow"><span className="k">Primary area</span><span className="v">{primaryShort}</span></div>}
                  {hasTxns && <div className="metarow"><span className="k">Active since</span><span className="v">{fmtTxnMonth(track!.earliest_txn)}</span></div>}
                </div>
              </div>

              {!agent.claimed && (
                <div className="fc-card fc-card--pad" style={{ background: "var(--ink)", color: "#fff" }}>
                  <div className="kicker" style={{ color: "var(--slate-2)" }}>Are you {given}?</div>
                  <p className="small" style={{ margin: "10px 0 14px", color: "rgba(255,255,255,0.82)" }}>
                    Claim this profile to respond to seller invitations and track leads. Free to start, pay 0.25% only on a completed sale.
                  </p>
                  <Link href="#claim" className="fc-btn fc-btn--primary fc-btn--block">Claim your profile</Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
      <StickyMobileCta href={`/sell?agent=${slug}&utm_source=agent_sticky`} label={`Request an introduction to ${given}`} />
    </>
  );
}
