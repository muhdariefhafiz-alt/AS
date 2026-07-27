import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../../../lib/supabase";
import { titleName, cleanAgency } from "../../../../lib/names";
import { areaByDistrictCode } from "../../../../lib/areas";
import ScrollReveal from "../../../../components/ScrollReveal";
import FunnelTracker from "../../../../components/FunnelTracker";
import AgentFlags from "../../../../components/AgentFlags";
import { SkylineStrip, KeyLine } from "../../../../components/LineArt";

// Always computed live: the panel and marketing promise "recomputes every
// time it is opened", and a revoked claim or moderated photo must never keep
// serving from a cache on a verification-branded artifact.
export const dynamic = "force-dynamic";

// Pitch Kit: the agent's "why me" artifact for a listing appointment,
// assembled live from their verified record (sg_pitch_kit RPC, proper
// MON-YYYY date parsing) plus the area's market context. Claimed agents
// only: this is a member service, and the co-brand implies our verification.
// Personal artifact, never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const DISTRICTS: Record<string, string> = {
  "1": "Raffles Place / Marina", "2": "Tanjong Pagar / Anson", "3": "Tiong Bahru / Queenstown",
  "4": "Sentosa / Harbourfront", "5": "Clementi / West Coast", "6": "City Hall / Clarke Quay",
  "7": "Bugis / Beach Road", "8": "Little India / Farrer Park", "9": "Orchard / River Valley",
  "10": "Bukit Timah / Holland", "11": "Novena / Newton", "12": "Balestier / Toa Payoh",
  "13": "Macpherson / Potong Pasir", "14": "Geylang / Eunos", "15": "Katong / Marine Parade",
  "16": "Bedok / Upper East Coast", "17": "Changi / Loyang", "18": "Tampines / Pasir Ris",
  "19": "Serangoon / Hougang / Punggol", "20": "Ang Mo Kio / Bishan", "21": "Upper Bukit Timah",
  "22": "Jurong / Boon Lay", "23": "Bukit Panjang / Choa Chu Kang", "24": "Lim Chu Kang / Tengah",
  "25": "Kranji / Woodgrove", "26": "Upper Thomson / Springleaf", "27": "Yishun / Sembawang",
  "28": "Seletar / Yio Chu Kang",
};

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function money(n: number | null): string {
  if (n == null) return "";
  return n >= 1_000_000 ? `S$${(n / 1_000_000).toFixed(2)}M` : `S$${Math.round(n / 1000)}K`;
}
function fmtMonth(iso: string): string {
  const m = iso?.match(/^(\d{4})-(\d{2})/);
  return m ? `${MONTHS[Number(m[2])]} ${m[1]}` : "";
}
function areaLabel(type: string, key: string): string {
  if (type === "town") return key.split("/")[0].toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const n = key.replace(/\D/g, "").replace(/^0/, "");
  return `District ${n}${DISTRICTS[n] ? ` (${DISTRICTS[n]})` : ""}`;
}
function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
const TYPE_LABEL: Record<string, string> = {
  HDB: "HDB", CONDOMINIUM_APARTMENTS: "Condo", EXECUTIVE_CONDOMINIUM: "EC", LANDED: "Landed",
};
const SIDE_LABEL: Record<string, string> = {
  SELLER: "Seller", BUYER: "Buyer", LANDLORD: "Landlord", TENANT: "Tenant",
};

type Deal = { when: string; property_type: string; transaction_type: string; represented: string; area: string };
type Kit = {
  record: {
    total: number; total_sales: number; total_rentals: number; last_24mo: number;
    sales_24mo: number; seller_side_sales: number; first_activity: string | null;
    last_activity: string | null; hdb_share_pct: number | null;
  };
  in_area: { deals: number; sales: number; seller_side: number; last_24mo: number; last_deal: string | null } | null;
  recent_deals: Deal[] | null;
};
type Sale = { kind: string; title: string; subtitle: string; price: number | null; event_date: string };

export default async function PitchKitPage({
  params,
}: {
  params: Promise<{ agentSlug: string; type: string; key: string }>;
}) {
  const { agentSlug, type, key } = await params;
  if (type !== "town" && type !== "district") notFound();
  const areaKey = decodeURIComponent(key).toUpperCase();

  const sb = supabaseAdmin();
  const { data: agent } = await sb
    .from("sg_agents")
    .select("id, name, agency_name, slug, cea_registration, score, photo_url, photo_status, claimed, agent_flags")
    .eq("slug", agentSlug)
    .maybeSingle();
  if (!agent) notFound();

  const name = titleName(agent.name);
  // SG CEA names are family-name-first, often with a preferred name in
  // parentheses ("Chew Siew Ting (Susie)"). Use the preferred name for the
  // possessive voice when present; otherwise the first token.
  const given = name.match(/\(([^)]+)\)/)?.[1]?.split(" ")[0] ?? name.split(" ")[0];
  const agency = cleanAgency(agent.agency_name);
  const score = agent.score != null ? Math.round(Number(agent.score)) : null;
  const showPhoto = agent.photo_url && agent.photo_status === "approved";
  const area = areaLabel(type, areaKey);

  // Member service: the co-branded pitch exists only for claimed (verified)
  // agents. Unclaimed profiles get the honest gate plus the claim trigger.
  if (!agent.claimed) {
    return (
      <div className="mx-auto max-w-[620px] px-5 py-20 text-center">
        <h1 className="text-2xl font-extrabold text-gray-900">This pitch kit is not active</h1>
        <p className="mt-3 text-gray-600">
          Pitch kits carry FairComparisons verification, so they are only generated for agents
          who have claimed their profile. {name} has not claimed this profile yet.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/property-agents/agent/${agent.slug}#claim`} className="fc-btn fc-btn--primary fc-btn--hairline">
            Are you {given}? Claim your profile
          </Link>
          <Link href={`/property-agents/agent/${agent.slug}`} className="fc-btn fc-btn--quiet">View the public record</Link>
        </div>
      </div>
    );
  }

  // District keys are stored zero-padded ("09") in transaction tables, and
  // sg_area_top_agents stores districts by their exact descriptive name (the
  // AREAS mapping), never by code. Both lookups must use those exact forms;
  // review-verified: a substring match here showed the WRONG area's rank.
  const districtCode = areaKey.replace(/\D/g, "").padStart(2, "0");
  const rankAreaName = type === "town" ? areaKey : areaByDistrictCode(`D${districtCode}`)?.name ?? null;
  const [{ data: kitData }, { data: salesRaw }, { data: rankRow }, { data: reviews }] = await Promise.all([
    sb.rpc("sg_pitch_kit", { p_reg: agent.cea_registration, p_area_type: type, p_area: areaKey }),
    sb.rpc("area_recent_sales", { p_type: type, p_key: type === "town" ? areaKey : districtCode, p_limit: 40 }),
    rankAreaName
      ? sb.from("sg_area_top_agents").select("rank")
          .eq("agent_id", agent.id).eq("area_type", type).eq("area_name", rankAreaName)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    sb.from("sg_agent_reviews").select("rating_overall, seller_initials, comment, created_at")
      .eq("agent_id", agent.id).eq("status", "published")
      .order("created_at", { ascending: false }).limit(3),
  ]);

  const kit = kitData as Kit | null;
  if (!kit) notFound();
  const sales: Sale[] = (salesRaw as Sale[] | null) ?? [];
  const prices = sales.map((s) => Number(s.price)).filter((n) => n > 0).sort((a, b) => a - b);
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : null;
  const rank = rankRow?.rank != null ? Number(rankRow.rank) : null;
  const approvedReviews = reviews ?? [];

  const stat = (label: string, value: string | number, sub?: string) => (
    <div className="fc-card fc-card--pad fc-reveal" style={{ background: "#fff" }}>
      <div className="kicker">{label}</div>
      <div className="serif tnum" style={{ fontSize: 28, fontWeight: 600, marginTop: 2 }}>{value}</div>
      {sub && <div className="muted small">{sub}</div>}
    </div>
  );

  return (
    <div style={{ background: "var(--paper, #f7f8fb)", minHeight: "100vh" }}>
      <FunnelTracker event="pitch_kit_view" agentId={Number(agent.id)} agentSlug={agent.slug as string} pagePath={`/pitch/${agent.slug}/${type}/${key}`} metadata={{ area: areaKey, area_type: type }} />
      <ScrollReveal />

      {/* Identity: the ink moment. This is the agent's document; it opens like one. */}
      <section style={{ background: "var(--ink)", color: "#fff", position: "relative", overflow: "hidden" }}>
        <KeyLine className="fc-lineart fc-float" width={84} style={{ position: "absolute", right: "6%", top: 28, color: "var(--line-dk)" }} />
        <div className="fc-wrap" style={{ maxWidth: 820, padding: "48px 24px 40px", position: "relative" }}>
          <p className="eyebrow fc-hero-in fc-hero-in--1" style={{ color: "var(--slate-2)" }}>
            Listing pitch · {area}
          </p>
          <div className="fc-hero-in fc-hero-in--2" style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
            {showPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.photo_url as string} alt={name} width={72} height={72} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(255,255,255,0.25)" }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.12)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 26, flexShrink: 0 }}>
                {initials(name)}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 className="serif" style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 600, color: "#fff", margin: 0, lineHeight: 1.15 }}>{name}</h1>
              <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.72)", fontSize: 15 }}>{agency} · CEA {agent.cea_registration}</p>
            </div>
            {score != null && (
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div className="serif" style={{ fontSize: 40, fontWeight: 700, color: "#fff" }}>{score}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--slate-2)", letterSpacing: "0.08em" }}>AGENTSCORE</div>
              </div>
            )}
          </div>
          <p className="fc-hero-in fc-hero-in--3" style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.74)", fontSize: 15.5, maxWidth: "58ch" }}>
            {given}&apos;s record below comes from public CEA transaction data, independently
            compiled by FairComparisons. Nothing here can be bought or edited by any agent.
          </p>
        </div>
      </section>

      <div className="fc-wrap" style={{ maxWidth: 820, padding: "28px 24px 64px" }}>
        {/* The verified record: mint world */}
        <div className="fc-scene fc-scene--grow fc-reveal" style={{ padding: "clamp(14px,2.5vw,20px)" }}>
          <p className="kicker" style={{ margin: "0 0 12px", color: "var(--ink)" }}>The verified record</p>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            {kit.in_area && stat(
              `Deals in ${type === "town" ? area : `D${areaKey.replace(/\D/g, "").replace(/^0/, "")}`}`,
              kit.in_area.deals,
              // Honesty: sales and rentals are different work; never let a
              // rental-heavy count read as sales at a listing appointment.
              `${kit.in_area.sales} sale${kit.in_area.sales === 1 ? "" : "s"}${kit.in_area.last_deal ? ` · latest ${kit.in_area.last_deal}` : ""}`
            )}
            {stat("Career deals on record", kit.record.total, `since ${kit.record.first_activity ?? "start of records"}`)}
            {stat("Last 24 months", kit.record.last_24mo, `${kit.record.sales_24mo} sale${kit.record.sales_24mo === 1 ? "" : "s"}`)}
            {rank != null && rank <= 25 && stat("Area standing", `#${rank}`, "in this area's ranking")}
            {kit.record.total_sales > 0 && stat("Seller-side sales", kit.record.seller_side_sales, `of ${kit.record.total_sales} career sales`)}
          </div>
          {Array.isArray(agent.agent_flags) && agent.agent_flags.length > 0 && (
            <div className="fc-reveal" style={{ marginTop: 12 }}>
              <AgentFlags flags={agent.agent_flags as { t: string; pct?: number }[]} size="sm" max={3} expandable />
              <p className="muted small" style={{ margin: "6px 0 0" }}>
                We show every agent&apos;s context flags, including {given}&apos;s. Honest data cuts both ways.
              </p>
            </div>
          )}
        </div>

        {/* Recent closings in this area: amber world */}
        {kit.recent_deals && kit.recent_deals.length > 0 && (
          <div className="fc-scene fc-scene--planner fc-reveal" style={{ marginTop: 16, padding: "clamp(14px,2.5vw,20px)" }}>
            <p className="kicker" style={{ margin: "0 0 12px", color: "var(--ink)" }}>{given}&apos;s recent deals here</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {kit.recent_deals.map((d, i) => (
                <li key={i} className="fc-card fc-reveal" style={{ ["--reveal-delay" as string]: `${Math.min(i * 0.06, 0.36)}s`, background: "#fff", padding: "11px 16px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>
                    {TYPE_LABEL[d.property_type] ?? titleName(d.property_type)} · {d.transaction_type.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span className="muted small">
                    {SIDE_LABEL[d.represented] ?? titleName(d.represented)} side · {titleName(d.area)} · {d.when}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Market context: blue world (the CMA-lite block) */}
        {sales.length > 0 && (
          <div className="fc-scene fc-scene--inbox fc-reveal" style={{ marginTop: 16, padding: "clamp(14px,2.5vw,20px)" }}>
            <p className="kicker" style={{ margin: "0 0 12px", color: "var(--ink)" }}>The market in {area} right now</p>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              {stat("Recent transactions", sales.length, "latest on record")}
              {median != null && stat("Median price", money(median), "across these deals")}
              {sales[0]?.event_date && stat("Most recent", fmtMonth(sales[0].event_date), "last transaction")}
            </div>
            <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {sales.slice(0, 5).map((s, i) => (
                <li key={i} className="fc-reveal" style={{ ["--reveal-delay" as string]: `${Math.min(i * 0.05, 0.25)}s`, display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 4px", borderTop: i > 0 ? "1px solid var(--line)" : "none", fontSize: 14 }}>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink)", fontWeight: 500 }}>{s.title}</span>
                  <span className="muted small" style={{ whiteSpace: "nowrap" }}>{fmtMonth(s.event_date)} · <strong style={{ color: "var(--ink)" }}>{money(s.price)}</strong></span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Reviews: only real, approved ones */}
        {approvedReviews.length > 0 && (
          <div className="fc-card fc-card--pad fc-reveal" style={{ marginTop: 16, background: "#fff" }}>
            <p className="kicker" style={{ margin: "0 0 10px" }}>What sellers said</p>
            {approvedReviews.map((r, i) => (
              <blockquote key={i} style={{ margin: i > 0 ? "12px 0 0" : 0, paddingTop: i > 0 ? 12 : 0, borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                <p style={{ margin: 0, fontSize: 14.5, color: "var(--slate)" }}>&ldquo;{r.comment}&rdquo;</p>
                <footer className="muted small" style={{ marginTop: 4 }}>{r.seller_initials ?? "Verified seller"} · {r.rating_overall}/5</footer>
              </blockquote>
            ))}
          </div>
        )}

        {/* Trust strip + seller actions */}
        <div className="fc-reveal" style={{ marginTop: 24, textAlign: "center" }}>
          <p className="mono" style={{ fontSize: 12, color: "var(--slate)" }}>
            Every figure above is compiled from public CEA, HDB and URA records. Rankings cannot be bought.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
            <Link href={`/property-agents/agent/${agent.slug}?utm_source=pitch_kit`} className="fc-btn fc-btn--primary fc-btn--hairline">
              See {given}&apos;s full record
            </Link>
            <Link href={`/book/${agent.slug}?utm_source=pitch_kit`} className="fc-btn fc-btn--quiet">Book a viewing with {given}</Link>
          </div>
          <div style={{ marginTop: 34, color: "var(--line-2)", overflow: "hidden" }}>
            <SkylineStrip width={460} style={{ maxWidth: "100%" }} />
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>
            Verified by <Link href="/?utm_source=pitch_kit" style={{ color: "var(--blue)" }}>FairComparisons</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
