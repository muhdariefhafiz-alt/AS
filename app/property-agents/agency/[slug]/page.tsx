import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import EmailCapture from "../../../components/EmailCapture";
import { titleName, cleanAgency } from "../../../lib/names";
import type { Metadata } from "next";

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export const revalidate = false;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: agency } = await supabase
    .from("sg_agencies")
    .select("name, agent_count, google_rating, google_review_count, score")
    .eq("slug", slug)
    .single();

  if (!agency) return {};

  const scoreText = agency.score ? `AgentScore: ${Math.round(Number(agency.score))}/100. ` : "";
  const ratingText = agency.google_rating ? `${agency.google_rating}/5 (${agency.google_review_count} reviews). ` : "";

  const isThin = agency.agent_count < 50 && !agency.google_rating && !agency.score;

  const clean = cleanAgency(agency.name);
  return {
    title: `${clean} Reviews & AgentScore | Singapore Property Agency`,
    description: `${clean} reviews and ratings: ${agency.agent_count.toLocaleString()} registered ${agency.agent_count === 1 ? "agent" : "agents"}. ${ratingText}${scoreText}See the agency's record on real CEA transaction data and compare it on FairComparisons.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/agency/${slug}` },
    ...(isThin && { robots: { index: false, follow: true } }),
  };
}

export async function generateStaticParams() {
  // Pre-render all agencies (dynamicParams = false).
  const all: { slug: string }[] = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("sg_agencies")
      .select("slug")
      .order("agent_count", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all.map((a) => ({ slug: a.slug }));
}

export default async function AgencyPage({ params }: Props) {
  const { slug } = await params;

  const { data: agency } = await supabase
    .from("sg_agencies")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!agency) notFound();

  // Rank the agency's agents by real activity so the best performers surface
  // first (not alphabetically — this is a ranking platform). AgentScore is
  // compressed at the cap (many agents tie at 80), so transaction volume is the
  // meaningful differentiator and is a clean integer to sort on.
  const { data: agents } = await supabase
    .from("sg_agents")
    .select("name, slug, cea_registration, google_rating, google_review_count, score, transaction_count")
    .eq("agency_id", agency.id)
    .order("transaction_count", { ascending: false, nullsFirst: false })
    .order("name")
    .limit(50);

  const agentList = agents ?? [];

  // Total agents in SG for context
  const { count: totalAgencies } = await supabase
    .from("sg_agencies")
    .select("id", { count: "exact", head: true });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: agency.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Singapore",
      addressCountry: "SG",
      ...(agency.address && { streetAddress: agency.address }),
      ...(agency.postal_code && { postalCode: agency.postal_code }),
    },
    ...(agency.phone && { telephone: agency.phone }),
    ...(agency.website && { url: agency.website }),
    ...(agency.google_rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: agency.google_rating,
        reviewCount: agency.google_review_count,
      },
    }),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "Property Agents", item: "https://fair-comparisons.com/property-agents" },
      { "@type": "ListItem", position: 3, name: agency.name },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How many agents does ${agency.name} have?`,
        acceptedAnswer: { "@type": "Answer", text: `${agency.name} has ${agency.agent_count.toLocaleString()} CEA-registered property agents in Singapore.` },
      },
      ...(agency.google_rating ? [{
        "@type": "Question",
        name: `What is ${agency.name}'s Google rating?`,
        acceptedAnswer: { "@type": "Answer", text: `${agency.name} has a ${Number(agency.google_rating).toFixed(1)}/5 rating based on ${agency.google_review_count} Google reviews.` },
      }] : []),
      {
        "@type": "Question",
        name: `Is ${agency.name} a licensed property agency?`,
        acceptedAnswer: { "@type": "Answer", text: `Yes, ${agency.name} is licensed by the Council for Estate Agencies (CEA) with license number ${agency.license_number}.` },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />

      <header className="fc-wrap" style={{ padding: "24px 40px 0" }}>
        <div className="sr-crumb">
          <Link href="/">Home</Link> / <Link href="/property-agents">Compare agents</Link> / {titleName(agency.name)}
        </div>
      </header>

      <div className="fc-wrap" style={{ padding: "18px 40px 72px" }}>
        <div className="ap-layout">
          <main>
            {/* identity */}
            <div className="fc-card" style={{ padding: 26 }}>
              <h1 style={{ margin: 0, fontSize: "clamp(28px,3.4vw,40px)" }}>{titleName(agency.name)}</h1>
              <div className="mono small muted" style={{ marginTop: 6 }}>CEA License {agency.license_number}</div>
              <div className="fc-row" style={{ gap: 14, marginTop: 18 }}>
                {agency.google_rating && (
                  <div className="fc-card fc-row" style={{ padding: "14px 18px", gap: 14, background: "var(--cloud)", border: "none" }}>
                    <span className="serif" style={{ fontWeight: 600, fontSize: 34 }}>{Number(agency.google_rating).toFixed(1)}</span>
                    <div>
                      <div style={{ color: "var(--blue)", fontSize: 16, letterSpacing: 2 }}>
                        {"\u2605".repeat(Math.round(Number(agency.google_rating)))}
                        <span style={{ color: "var(--line-2)" }}>{"\u2605".repeat(5 - Math.round(Number(agency.google_rating)))}</span>
                      </div>
                      <div className="small muted">{agency.google_review_count} Google reviews</div>
                    </div>
                  </div>
                )}
                <span className="fc-badge fc-badge--ranked"><span className="dot" /> {agency.agent_count.toLocaleString()} agents ranked</span>
              </div>
            </div>

            {/* overview */}
            <div className="fc-card fc-card--pad" style={{ marginTop: 16 }}>
              <h2 style={{ fontSize: 22, margin: "0 0 10px" }}>Overview</h2>
              <p style={{ color: "#39425e", fontSize: 16, lineHeight: 1.6, margin: "0 0 10px" }}>
                {titleName(agency.name)} (CEA {agency.license_number}) is a property agency in Singapore with {agency.agent_count.toLocaleString()} registered {agency.agent_count === 1 ? "agent" : "agents"}.
                {agency.google_rating && ` Clients rate this agency ${Number(agency.google_rating).toFixed(1)} of 5 based on ${agency.google_review_count} Google reviews.`}
                {agency.agent_count > 1000 ? " It is one of the largest agencies in Singapore by number of agents." : agency.agent_count > 100 ? " It is a mid-sized agency in the Singapore market." : " It is a boutique agency in the Singapore market."}
              </p>
              <p className="muted small" style={{ margin: 0 }}>
                {totalAgencies ? `There are ${totalAgencies.toLocaleString()} CEA-licensed agencies in Singapore. ` : ""}
                Agency size does not affect any individual agent&apos;s AgentScore, which is computed per person from public records.
              </p>
            </div>

            {/* agents */}
            {agentList.length > 0 && (
              <div className="fc-card fc-card--pad" style={{ marginTop: 16 }}>
                <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <div className="eyebrow eyebrow--muted">Agents \u00b7 showing {agentList.length} of {agency.agent_count.toLocaleString()}</div>
                  <Link href="/property-agents" className="small" style={{ fontWeight: 700 }}>Compare by AgentScore \u203a</Link>
                </div>
                <div className="agent-grid" style={{ marginTop: 14 }}>
                  {agentList.map((agent) => (
                    <Link key={agent.slug} href={`/property-agents/agent/${agent.slug}`} className="agent-cell">
                      <span className="av">{initials(agent.name)}</span>
                      <div><div className="nm">{titleName(agent.name)}</div><div className="rg">{agent.cea_registration}</div></div>
                    </Link>
                  ))}
                </div>
                <p className="mono small muted" style={{ marginTop: 12 }}>
                  Top {agentList.length} by transaction volume. Rank the full roster on the compare page.
                </p>
              </div>
            )}
          </main>

          <aside>
            <div className="ap-side">
              <div className="fc-card fc-card--pad">
                <div className="eyebrow eyebrow--muted">Agency details</div>
                <div style={{ marginTop: 10 }}>
                  <div className="metarow"><span className="k">CEA license</span><span className="v tnum">{agency.license_number}</span></div>
                  <div className="metarow"><span className="k">Agents</span><span className="v tnum">{agency.agent_count.toLocaleString()}</span></div>
                  {agency.phone && <div className="metarow"><span className="k">Phone</span><span className="v"><a href={`tel:${agency.phone}`}>{agency.phone}</a></span></div>}
                  {agency.website && <div className="metarow"><span className="k">Website</span><span className="v"><a href={agency.website} target="_blank" rel="noopener noreferrer">{agency.website.replace(/^https?:\/\/(www\.)?/, "")}</a></span></div>}
                </div>
              </div>

              <div className="fc-card fc-card--pad" style={{ background: "var(--ink)", color: "#fff" }}>
                <div className="eyebrow" style={{ color: "var(--slate-2)" }}>Selling your home?</div>
                <p className="small" style={{ margin: "10px 0 14px", color: "rgba(255,255,255,0.82)" }}>
                  Compare every CEA agent on real transaction records and contact the ones you choose. Always free for sellers.
                </p>
                <Link href="/sell?utm_source=agency" className="fc-btn fc-btn--primary fc-btn--block">Compare agents</Link>
                <Link href="/property-agents" className="small" style={{ display: "block", marginTop: 12, textAlign: "center", color: "rgba(255,255,255,0.82)" }}>Or browse all agencies ›</Link>
              </div>

              <div className="fc-card fc-card--pad">
                <EmailCapture variant="sidebar" source="agency" pagePath={`/property-agents/agency/${slug}`} heading="Agency updates" description={`Get notified when ${titleName(agency.name)} data is updated.`} />
              </div>

              <div className="fc-card fc-card--pad">
                <div className="eyebrow eyebrow--muted">Compare with</div>
                <div className="fc-col" style={{ gap: 8, marginTop: 10 }}>
                  {[
                    { slug: "propnex-realty-pte-ltd", short: "PropNex" },
                    { slug: "era-realty-network-pte-ltd", short: "ERA" },
                    { slug: "huttons-asia-pte-ltd", short: "Huttons" },
                    { slug: "orangetee-tie-pte-ltd", short: "OrangeTee" },
                    { slug: "sri-pte-ltd", short: "SRI" },
                  ].filter((a) => a.slug !== agency.slug).slice(0, 4).map((other) => {
                    const pair = agency.slug < other.slug ? `${agency.slug}-vs-${other.slug}` : `${other.slug}-vs-${agency.slug}`;
                    return <Link key={other.slug} href={`/property-agents/agency-compare/${pair}`} className="small" style={{ fontWeight: 600 }}>vs {other.short} \u203a</Link>;
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
