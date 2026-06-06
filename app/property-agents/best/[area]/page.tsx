import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { formatPrice } from "../../../lib/narrativeHelpers";
import EmailCapture from "../../../components/EmailCapture";
import ShareButtons from "../../../components/ShareButtons";
import StickyMobileCta from "../../../components/StickyMobileCta";
import PostcodeBox from "../../../components/PostcodeBox";
import { bandFor } from "../../../components/Brand";
import { titleName, cleanAgency } from "../../../lib/names";
import type { Metadata } from "next";

export const revalidate = 43200; // 12h; daily cron also force-revalidates
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
  sale_share: number | null;
  subscription_tier: string;
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
  const title = `Best Property Agents in ${s} (${area.district}) 2026 - Ranked by Data`;
  const description = `Top property agents in ${area.name}, ranked by AgentScore based on CEA transaction records. See who handles the most deals in ${s} and compare agent performance.`;
  const url = `https://fair-comparisons.com/property-agents/best/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `Top Property Agents in ${s} 2026 - Who Handles the Most Deals?`,
      description,
      url,
      siteName: "FairComparisons",
      locale: "en_SG",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `Top Property Agents in ${s} 2026`,
      description: `Data-driven rankings of the best property agents in ${area.name}. Based on actual CEA transaction records.`,
    },
  };
}

export async function generateStaticParams() {
  return AREAS.map(a => ({ area: a.slug }));
}

const RANK_TIER = (i: number) => (i === 0 ? "rank-num--top" : i < 3 ? "rank-num--mid" : "rank-num--rest");

function agentNarrative(a: RichAgent, short: string): string {
  const types = formatTypes(a.area_property_types);
  let s = `${a.agent_name} is ${focusLabel(a.area_focus_pct)} in ${short} with ${a.area_txns} transactions in this area (${a.area_focus_pct}% of their ${a.total_txns} total career deals). Handles ${types} properties.`;
  if (a.area_txn_types.includes("NEW SALE") && a.area_txn_types.includes("RESALE"))
    s += " Works across both new launches and resale, giving buyers exposure to the full market.";
  else if (a.area_txn_types.includes("WHOLE RENTAL") && !a.area_txn_types.includes("RESALE"))
    s += " Primarily focused on the rental market, connecting landlords with tenants.";
  if (a.area_roles.includes("BUYER") && a.area_roles.includes("SELLER"))
    s += " Represents both buyers and sellers, for perspective on both sides of a negotiation.";
  return s;
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

  // Fetch subscription tiers for these agents
  const agentSlugs = (agents ?? []).map(a => a.agent_slug);
  const { data: tierData } = agentSlugs.length > 0
    ? await supabase.from("sg_agents").select("slug, subscription_tier").in("slug", agentSlugs)
    : { data: [] };
  const tierMap: Record<string, string> = {};
  (tierData ?? []).forEach((t: { slug: string; subscription_tier: string | null }) => {
    tierMap[t.slug] = t.subscription_tier ?? "free";
  });

  // Ranking is purely by AgentScore/rank — paid tiers never reorder the list.
  // (GetAgent model: rankings cannot be bought.)
  const topAgents = (agents ?? []).map((a): RichAgent => ({
    agent_name: titleName(a.agent_name), agent_slug: a.agent_slug, cea_reg: a.cea_reg,
    agency_name: cleanAgency(a.agency_name), score: Number(a.score), total_txns: a.total_txns,
    area_txns: a.area_txns, area_focus_pct: a.area_focus_pct,
    area_property_types: a.area_property_types || "", area_roles: a.area_roles || "",
    area_txn_types: a.area_txn_types || "",
    sale_share: a.sale_share != null ? Number(a.sale_share) : null,
    subscription_tier: tierMap[a.agent_slug] ?? "free",
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
  const updated = new Date().toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });

  const faqItems = [
    ...(topAgents.length > 0 ? [{
      "@type": "Question",
      name: `Who is the best property agent in ${short}?`,
      acceptedAnswer: { "@type": "Answer", text: `Based on AgentScore, the highest-ranked agent in ${area.name} is ${topAgents[0].agent_name} from ${topAgents[0].agency_name}, with ${topAgents[0].area_txns} transactions in this area and a score of ${Math.round(topAgents[0].score)}.` },
    }] : []),
    {
      "@type": "Question",
      name: `How many active agents are there in ${short}?`,
      acceptedAnswer: { "@type": "Answer", text: `${topAgents.length} agents have CEA-recorded transactions and an AgentScore for ${area.name}. The average agent in this ranking has completed ${avgAreaTxns} transactions in the area.` },
    },
    {
      "@type": "Question",
      name: "Can agents pay for a higher ranking?",
      acceptedAnswer: { "@type": "Answer", text: "No. AgentScore is calculated from public CEA data only, and there is no paid placement on FairComparisons. Rankings reflect each agent's actual transaction record and cannot be bought." },
    },
  ];

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
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }} />

      {/* breadcrumb */}
      <div className="fc-wrap" style={{ padding: "20px 40px 0" }}>
        <div className="sr-crumb">
          <Link href="/">Home</Link> / <Link href="/property-agents">Compare agents</Link> / Best agents in {short}
        </div>
      </div>

      {/* header */}
      <header className="fc-wrap" style={{ padding: "24px 40px 30px" }}>
        <div className="fc-row" style={{ gap: 10 }}>
          <span className="dpill">{area.district}</span>
          <span className="upill">Updated {updated}</span>
        </div>
        <h1 style={{ margin: "20px 0 0", fontSize: "clamp(34px,5vw,60px)" }}>
          Best property agents in {short}
        </h1>
        <p className="lede" style={{ maxWidth: "62ch", marginTop: 16 }}>
          {topAgents.length} agents ranked by AgentScore, with a detailed transaction analysis for each.
          {medianPrice > 0 && ` Median condo price ${formatPrice(medianPrice)},`}
          {totalTxns > 0 && ` from ${totalTxns.toLocaleString()} URA transactions recorded in ${area.district}.`}
        </p>
        <div className="fc-row" style={{ marginTop: 24, gap: 12 }}>
          <Link href={`/sell?type=CONDO&district=${area.district}&utm_source=best_area`} className="fc-btn fc-btn--primary">See ranked agents</Link>
          <Link href="/property-agents/compare" className="fc-btn fc-btn--ghost">Compare side by side</Link>
          <div style={{ marginLeft: 4 }}>
            <ShareButtons compact url={`/property-agents/best/${slug}`} title={`Best property agents in ${short} (${area.district})`} />
          </div>
        </div>
      </header>

      <div className="fc-wrap" style={{ padding: "0 40px" }}><hr className="rule" /></div>

      {/* editorial */}
      <section className="fc-wrap" style={{ padding: "48px 40px 8px" }}>
        <h2 style={{ fontSize: "clamp(26px,3vw,34px)" }}>The agent market in {short}</h2>
        <div className="prose" style={{ marginTop: 18 }}>
          <p>
            {area.name} ({area.district}) is served by a deep pool of property agents.
            {topAgents.length > 0 && ` Of the agents with recorded CEA transaction data in this area, the top ${topAgents.length} are ranked below on AgentScore.`}
            {medianPrice > 0 && ` With a median condo price of ${formatPrice(medianPrice)}, the stakes are high. Choosing the wrong agent can cost tens of thousands of dollars in missed price or pacing.`}
          </p>
          {topAgency && (
            <p>
              <strong>{topAgency[0]}</strong> places {topAgency[1]} agents in the top {topAgents.length}, making it the most represented agency in {short}.
              {specialists.length > 0 && ` ${specialists.length} of the top ${topAgents.length} dedicate 40% or more of their practice to this area, a sign of deep local knowledge.`}
              {generalists.length > 0 && ` ${generalists.length} operate across many districts, bringing broader market perspective with less area-specific focus.`}
            </p>
          )}
          {topAgents.length >= 3 && (
            <p>
              The top-ranked agent, <strong>{topAgents[0].agent_name}</strong>, has completed {topAgents[0].area_txns} transactions in {short} alone ({topAgents[0].area_focus_pct}% of their {topAgents[0].total_txns} career transactions). They handle {formatTypes(topAgents[0].area_property_types)} property, and represent {formatRoles(topAgents[0].area_roles)}.
            </p>
          )}
        </div>
        <div className="fc-row" style={{ marginTop: 18, gap: 10 }}>
          <span className="fc-badge fc-badge--ranked"><span className="dot" /> Ranked on CEA data</span>
          <span className="fc-badge fc-badge--source">Source · URA · HDB · CEA</span>
        </div>
      </section>

      {/* ranked agents */}
      <section className="fc-wrap" style={{ padding: "40px 40px 24px" }}>
        <h2 style={{ fontSize: "clamp(26px,3vw,34px)" }}>Top {topAgents.length} agents in {short}</h2>
        <p className="muted small" style={{ margin: "8px 0 0", maxWidth: "70ch" }}>
          Agents on the same AgentScore are ordered by local transaction volume. The score counts all CEA
          activity, sales and rentals, so if you are selling, check each agent&apos;s sale-versus-rental mix on
          their profile.
        </p>

        {topAgents.map((a, i) => {
          const band = bandFor(a.score);
          return (
            <article key={a.cea_reg} className="fc-card arank">
              <div className="arank__head">
                <span className={`rank-num ${RANK_TIER(i)}`}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/property-agents/agent/${a.agent_slug}?ref=leaderboard`} className="agent-name">{a.agent_name}</Link>
                  <div className="agent-meta">{a.agency_name} · CEA {a.cea_reg}</div>
                  <p className="agent-desc">{agentNarrative(a, short)}</p>
                  <div className="fc-row" style={{ gap: 8 }}>
                    <span className="statchip">{a.area_txns} local txns</span>
                    <span className="statchip">{a.area_focus_pct}% area focus</span>
                    <span className="statchip">{a.total_txns} career total</span>
                    {a.sale_share != null && a.sale_share < 0.4 && (
                      <span className="fc-badge fc-badge--warn">Mostly rentals · {Math.round(a.sale_share * 100)}% sales</span>
                    )}
                  </div>
                </div>
                <div className="score-box" style={{ borderTopColor: band.color }}>
                  <div className="score-num">{Math.round(a.score)}</div>
                  <div className="score-cap">AGENTSCORE</div>
                  <div className="score-word" style={{ color: band.color }}>{band.word}</div>
                </div>
              </div>
            </article>
          );
        })}

        <p className="mono muted" style={{ textAlign: "center", marginTop: 22, fontSize: 12 }}>
          Source · CEA Public Register via data.gov.sg. Order is set by AgentScore alone. No agent can pay to rank higher.
        </p>
      </section>

      {/* how to choose */}
      <section className="fc-wrap" style={{ padding: "16px 40px 8px" }}>
        <div className="fc-card fc-card--fill fc-card--pad">
          <h2 style={{ fontSize: "clamp(22px,2.4vw,28px)" }}>How to choose an agent in {short}</h2>
          <div className="prose" style={{ marginTop: 14 }}>
            <p>A high AgentScore signals a strong overall track record, but the best agent for you depends on your home and your timeline. Three things to weigh as you read the list above:</p>
            <p><strong>Area focus.</strong> An agent who dedicates 40% or more of their business to {short} knows the local pricing, the best stacks, and which developments are gaining value.{specialists.length > 0 && ` ${specialists.length} agents above qualify as area specialists.`}</p>
            <p><strong>Transaction-type match.</strong> Selling a resale condo, look for resale depth. Renting out, prioritise rental history. Each agent&apos;s mix is shown in their record.</p>
            <p><strong>Representation experience.</strong> Agents who have acted for both buyers and sellers understand both sides of a negotiation, an advantage in pricing and deal structure.</p>
          </div>
        </div>
      </section>

      {/* email capture */}
      <section className="fc-wrap" style={{ padding: "24px 40px" }}>
        <div className="fc-card fc-card--pad">
          <EmailCapture
            variant="inline"
            source="best-agent"
            pagePath={`/property-agents/best/${slug}`}
            districtTag={area.district}
            heading={`Get updates for ${short}`}
            description={`We will let you know when agent rankings change in ${short} or new market data lands.`}
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="fc-wrap" style={{ padding: "16px 40px 8px" }}>
        <h2 style={{ fontSize: "clamp(22px,2.4vw,28px)" }}>Frequently asked questions</h2>
        <div className="prose" style={{ marginTop: 14 }}>
          {topAgents.length > 0 && (
            <>
              <h3 className="serif" style={{ fontSize: 19, margin: "0 0 4px" }}>Who is the best property agent in {short}?</h3>
              <p>Based on AgentScore, the highest-ranked agent in {area.name} is {topAgents[0].agent_name} from {topAgents[0].agency_name}, with {topAgents[0].area_txns} transactions in this area and a score of {Math.round(topAgents[0].score)}. They are {focusLabel(topAgents[0].area_focus_pct)} in {short}, dedicating {topAgents[0].area_focus_pct}% of their practice to it.</p>
            </>
          )}
          <h3 className="serif" style={{ fontSize: 19, margin: "0 0 4px" }}>How many active agents are there in {short}?</h3>
          <p>{topAgents.length} agents have CEA-recorded transactions and an AgentScore for {area.name}. The average agent in this ranking has completed {avgAreaTxns} transactions in the area.</p>
          <h3 className="serif" style={{ fontSize: 19, margin: "0 0 4px" }}>Can agents pay for a higher ranking?</h3>
          <p>No. AgentScore is computed from public CEA data only, and there is no paid placement on FairComparisons. Rankings reflect each agent&apos;s actual transaction record and cannot be bought.</p>
        </div>
      </section>

      {/* explore / claim */}
      <section className="fc-wrap" style={{ padding: "24px 40px 72px" }}>
        <div className="fc-grid-2">
          <div className="fc-card fc-card--pad">
            <div className="eyebrow eyebrow--muted">Are you ranked here?</div>
            <h3 className="serif" style={{ fontSize: 22, margin: "10px 0 6px" }}>Claim your profile</h3>
            <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
              Add your photo and bio so sellers comparing agents in {short} see your record in full. Claiming never changes your rank.
            </p>
            <Link href="/for-agents" className="fc-btn fc-btn--ink fc-btn--sm">Claim your profile</Link>
          </div>
          <div className="fc-card fc-card--pad">
            <div className="eyebrow eyebrow--muted">Other areas</div>
            <div className="fc-row" style={{ gap: 8, marginTop: 12 }}>
              {AREAS.filter(a => a.slug !== slug).slice(0, 12).map(a => (
                <Link key={a.slug} href={`/property-agents/best/${a.slug}`} className="fc-chip">
                  {shortName(a.name)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="fc-section fc-section--dark">
        <div className="fc-wrap" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#fff" }}>Selling in {short}?</h2>
          <p className="lede" style={{ margin: "12px auto 20px", textAlign: "center" }}>
            Enter your postal code to compare the ranked agents who actually sell here, then contact the ones you choose.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PostcodeBox source="best_postcode" />
          </div>
        </div>
      </section>
      <StickyMobileCta href={`/sell?type=CONDO&district=${area.district}&utm_source=best_sticky`} />
    </>
  );
}
