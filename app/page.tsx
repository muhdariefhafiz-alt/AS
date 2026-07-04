import Link from "next/link";
import { supabase } from "./lib/supabase";
import { Seal, Gauge, RankRow, RankedBadge, SourceBadge } from "./components/Brand";
import { titleName, cleanAgency } from "./lib/names";

export const revalidate = 43200; // 12h fallback; daily cron also force-revalidates

async function getStats() {
  const [agentRes, agencyRes, txnRes] = await Promise.all([
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).not("score", "is", null),
    supabase.from("sg_agencies").select("id", { count: "exact", head: true }),
    supabase.from("sg_agent_transactions").select("id", { count: "exact", head: true }),
  ]);
  return {
    scoredAgents: agentRes.count ?? 10594,
    agencies: agencyRes.count ?? 930,
    transactions: txnRes.count ?? 730000,
  };
}

async function getTopAgents() {
  const { data } = await supabase
    .from("sg_agents")
    .select("name, slug, score, agency_name, primary_area, claimed, agent_flags")
    .not("score", "is", null)
    .order("score", { ascending: false })
    .limit(5);
  return data ?? [];
}

const STEPS: [string, string][] = [
  ["Tell us your home", "Postal code, property type, size. Thirty seconds, no account."],
  ["See ranked agents", "We rank everyone active near you on real transaction data."],
  ["Compare side by side", "Compare each agent's record, areas and reviews side by side."],
  ["Contact agents directly", "Pick the agents whose record fits your home and reach out yourself. Free to you."],
];

const TRUST: [string, string][] = [
  ["Independent", "Rankings are computed from the CEA register, URA and HDB data. There is no paid placement, ever."],
  ["Evidence-based", "Every score traces to real government transaction records. We never invent a number."],
  ["Free and on your side", "Sellers pay nothing and we never take a cut of a sale. We are paid by agent subscriptions, not by sales, so our rankings are never for sale."],
];

export default async function HomePage() {
  const [stats, topAgents] = await Promise.all([getStats(), getTopAgents()]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FairComparisons",
    url: "https://fair-comparisons.com",
    description:
      "Compare property agents in Singapore on actual government transaction records. Independent ratings based on CEA, URA, and HDB data.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://fair-comparisons.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "FairComparisons",
    url: "https://fair-comparisons.com",
    logo: "https://fair-comparisons.com/logo.svg",
    description:
      "Independent professional comparison platform for Singapore. Rankings based on government data, not advertising.",
  };

  const topScore = topAgents[0]?.score ? Math.round(topAgents[0].score) : 94;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd).replace(/</g, "\\u003c") }} />

      {/* ---------- HERO ---------- */}
      <section style={{ background: "var(--ink)", color: "#fff" }}>
        <div className="fc-wrap" style={{ padding: "64px 40px 56px" }}>
          <div style={{ display: "flex", gap: 48, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 320 }}>
              <div className="eyebrow" style={{ color: "var(--slate-2)", marginBottom: 18 }}>
                Singapore property agents
              </div>
              <h1 style={{ color: "#fff", fontSize: "var(--t-h1)", margin: 0 }}>
                Choose your agent <span className="italic-serif">on evidence,</span> not on advertising.
              </h1>
              <p className="lede" style={{ color: "rgba(255,255,255,0.74)", marginTop: 16 }}>
                Compare every CEA-registered agent on which homes they actually sell in your area, ranked on{" "}
                {stats.transactions.toLocaleString()}+ real government transaction records. Then contact the ones you choose.
              </p>

              <form
                action="/search"
                method="GET"
                className="fc-search"
                style={{ marginTop: 26 }}
              >
                <input name="q" placeholder="Enter your postal code" aria-label="Postal code" />
                <button type="submit" className="fc-btn fc-btn--primary">
                  See agents
                </button>
              </form>

              <div className="fc-row" style={{ marginTop: 16, gap: 18 }}>
                <span
                  className="mono"
                  style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, display: "flex", gap: 7, alignItems: "center" }}
                >
                  <Seal size={15} variant="light" /> Free for sellers
                </span>
                <span
                  className="mono"
                  style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, display: "flex", gap: 7, alignItems: "center" }}
                >
                  <Seal size={15} variant="light" /> Rankings cannot be bought
                </span>
              </div>

              {/* Front door for the casual, high-frequency use case: looking up a
                  single agent by name (the one who flyered you, a friend named, or
                  is on a billboard) without starting the full sell funnel. */}
              <p style={{ marginTop: 14 }}>
                <Link href="/property-agents/check" className="mono" style={{ color: "var(--blue-wash)", fontSize: 13 }}>
                  Already have an agent in mind? Look them up on the record &rarr;
                </Link>
              </p>
            </div>

            <div className="fc-card" style={{ background: "#fff", padding: 22, width: 240, flex: "0 0 auto" }}>
              <div className="mono muted" style={{ fontSize: 12, letterSpacing: "0.12em" }}>
                AGENTSCORE
              </div>
              <Gauge score={topScore} width={196} numSize={52} />
              <div style={{ textAlign: "center", fontWeight: 700, marginTop: 2 }}>Top performer</div>
              <div className="muted" style={{ textAlign: "center", fontSize: 13 }}>
                {stats.scoredAgents.toLocaleString()} agents scored
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="fc-wrap" style={{ padding: "64px 40px" }}>
        <div className="eyebrow">How it works</div>
        <h2 style={{ marginTop: 12 }}>Four steps, no obligation.</h2>
        <div className="fc-grid-4" style={{ marginTop: 28 }}>
          {STEPS.map(([t, d], i) => (
            <div key={t} className="fc-card fc-card--pad">
              <div className="mono" style={{ color: "var(--blue)", fontSize: 13 }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="serif" style={{ fontWeight: 600, fontSize: 19, margin: "8px 0 6px" }}>
                {t}
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                {d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- WHY TRUST ---------- */}
      <section style={{ background: "var(--cloud)" }}>
        <div className="fc-wrap" style={{ padding: "64px 40px" }}>
          <h2>Why you can trust the ranking</h2>
          <div className="fc-grid-3" style={{ marginTop: 28 }}>
            {TRUST.map(([t, d]) => (
              <div key={t} className="fc-card fc-card--pad" style={{ background: "#fff" }}>
                <Seal size={24} variant="blue" />
                <div className="serif" style={{ fontWeight: 600, fontSize: 20, margin: "12px 0 6px" }}>
                  {t}
                </div>
                <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                  {d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- RANKED PREVIEW ---------- */}
      {topAgents.length > 0 && (
        <section className="fc-wrap" style={{ padding: "64px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Top-ranked agents in Singapore</h2>
            <RankedBadge />
          </div>
          <div className="fc-card" style={{ padding: "4px 22px 8px", marginTop: 18 }}>
            {topAgents.map((a, i) => (
              <RankRow
                key={a.slug ?? i}
                pos={i + 1}
                name={titleName(a.name)}
                sub={[a.agency_name ? cleanAgency(a.agency_name) : null, a.primary_area ? titleName(a.primary_area) : null].filter(Boolean).join(" · ") || "CEA-registered agent"}
                score={a.score}
                verified={!!a.claimed}
                href={a.slug ? `/property-agents/agent/${a.slug}` : undefined}
                flags={a.agent_flags as { t: string; pct?: number }[] | undefined}
              />
            ))}
          </div>
          <div className="fc-row" style={{ justifyContent: "space-between", marginTop: 18 }}>
            <SourceBadge />
            <Link href="/property-agents" className="fc-btn fc-btn--quiet fc-btn--sm">
              Browse all agents
            </Link>
          </div>
        </section>
      )}

      {/* ---------- GUIDES & RANKINGS (internal link equity) ---------- */}
      <section style={{ background: "var(--cloud)" }}>
        <div className="fc-wrap" style={{ padding: "56px 40px" }}>
          <h2 style={{ margin: 0 }}>Guides and rankings</h2>
          <p className="muted" style={{ marginTop: 8, fontSize: 14, maxWidth: 560 }}>
            Popular reads for Singapore home sellers, all built on the same government data.
          </p>
          <div className="fc-grid-3" style={{ marginTop: 24 }}>
            <Link href="/guides/property-agent-commission" className="fc-card fc-card--pad" style={{ background: "#fff" }}>
              <div className="serif" style={{ fontWeight: 600, fontSize: 17 }}>Property agent commission in Singapore</div>
              <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>What sellers pay by property type, worked examples and GST.</p>
            </Link>
            <Link href="/property-agents/best-by-type/hdb" className="fc-card fc-card--pad" style={{ background: "#fff" }}>
              <div className="serif" style={{ fontWeight: 600, fontSize: 17 }}>Best HDB agents in Singapore</div>
              <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>Ranked on verified HDB resale transaction records.</p>
            </Link>
            <Link href="/guides/how-to-choose-property-agent" className="fc-card fc-card--pad" style={{ background: "#fff" }}>
              <div className="serif" style={{ fontWeight: 600, fontSize: 17 }}>How to choose a property agent</div>
              <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>What the data says to look for before you commit.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- CLOSING CTA ---------- */}
      <section className="fc-section fc-section--dark">
        <div className="fc-wrap" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#fff" }}>Ready to choose on evidence?</h2>
          <p className="lede" style={{ margin: "14px auto 28px", textAlign: "center" }}>
            Compare the agents who actually sell properties like yours nearby, then contact the ones you choose.
          </p>
          <div className="fc-row" style={{ justifyContent: "center", gap: 12 }}>
            <Link href="/sell" className="fc-btn fc-btn--primary fc-btn--lg">
              Compare agents
            </Link>
            <Link href="/tools/valuation" className="fc-btn fc-btn--ghost-light fc-btn--lg">
              What is my home worth?
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
