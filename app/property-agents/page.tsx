import Link from "next/link";
import { supabase } from "../lib/supabase";
import { titleName, cleanAgency } from "../lib/names";
import SellCtaBand from "../components/SellCtaBand";
import type { Metadata } from "next";

export const revalidate = 43200; // 12h; daily cron also force-revalidates

export const metadata: Metadata = {
  title: "Property Agents in Singapore - Compare 30,000+ CEA Agents",
  description: "Compare property agents in Singapore on actual CEA transaction records. AgentScore rates 10,000+ agents on volume, recency, diversity, and reviews.",
  alternates: { canonical: "https://fair-comparisons.com/property-agents" },
};

const INSIGHTS: [string, string, string][] = [
  ["/insights/million-dollar-hdb", "Million-Dollar HDB Tracker", "Every S$1M+ resale flat by town"],
  ["/insights/freehold-premium", "Freehold Premium by District", "How much more does freehold cost?"],
  ["/property-agents/market/2025", "2025 Market Overview", "Transactions, top agents, trends"],
];

export default async function PropertyAgentsHub() {
  const [statsRes, agenciesRes, districtsRes] = await Promise.all([
    supabase.from("sg_agents").select("id", { count: "exact", head: true }),
    supabase.from("sg_agencies").select("name, slug, agent_count, google_rating").order("agent_count", { ascending: false }).limit(8),
    supabase.from("sg_districts").select("code, name, slug").order("code"),
  ]);

  const agentCount = statsRes.count ?? 30740;
  const agencies = agenciesRes.data ?? [];
  const districts = districtsRes.data ?? [];

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section style={{ background: "var(--ink)", color: "#fff" }}>
        <div className="fc-wrap" style={{ padding: "64px 40px 56px" }}>
          <div className="eyebrow" style={{ color: "var(--slate-2)", marginBottom: 18 }}>
            Property agents
          </div>
          <h1 style={{ color: "#fff", fontSize: "var(--t-h1)", margin: 0, maxWidth: "16ch" }}>
            {agentCount.toLocaleString()} agents. <span className="italic-serif">One independent score.</span>
          </h1>
          <p className="lede" style={{ color: "rgba(255,255,255,0.74)", marginTop: 16, maxWidth: "60ch" }}>
            Every CEA-registered agent in Singapore, ranked on actual transaction records. Not advertising, not self-reported. Government data only.
          </p>

          <form action="/search" method="GET" className="fc-search" style={{ marginTop: 26 }}>
            <input name="q" placeholder="Agent name, district, or HDB town" aria-label="Search agents, districts or towns" />
            <button type="submit" className="fc-btn fc-btn--primary">Find agent</button>
          </form>

          <div className="fc-row" style={{ marginTop: 16, gap: 18 }}>
            <span className="mono" style={{ color: "rgba(255,255,255,0.82)", fontSize: 13 }}>
              Ranked on CEA, URA and HDB data
            </span>
            <Link href="/property-agents/check" className="mono" style={{ color: "var(--blue-wash)", fontSize: 13 }}>
              Check a specific agent &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- BROWSE BY DISTRICT ---------- */}
      <section className="fc-wrap" style={{ padding: "56px 40px" }}>
        <div className="eyebrow">Browse by district</div>
        <h2 style={{ marginTop: 12 }}>All 28 Singapore districts.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginTop: 24 }}>
          {districts.map((d) => (
            <Link
              key={d.code}
              href={`/property-agents/district/${d.slug}`}
              className="fc-card fc-card--hover"
              style={{ padding: "12px 14px", display: "block", textDecoration: "none", color: "inherit" }}
            >
              <span className="mono" style={{ color: "var(--blue)", fontSize: 12, fontWeight: 600 }}>{d.code}</span>
              <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600 }}>{d.name?.split(",")[0]}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- MARKET INSIGHTS ---------- */}
      <section style={{ background: "var(--cloud)" }}>
        <div className="fc-wrap" style={{ padding: "56px 40px" }}>
          <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div className="eyebrow">Market insights</div>
              <h2 style={{ marginTop: 12 }}>Data, not opinion.</h2>
            </div>
            <Link href="/insights" className="fc-btn fc-btn--quiet fc-btn--sm">View all</Link>
          </div>
          <div className="fc-grid-3" style={{ marginTop: 24 }}>
            {INSIGHTS.map(([href, title, sub]) => (
              <Link key={href} href={href} className="fc-card fc-card--pad fc-card--hover" style={{ background: "#fff", textDecoration: "none", color: "inherit" }}>
                <div className="serif" style={{ fontWeight: 600, fontSize: 19 }}>{title}</div>
                <p className="muted" style={{ margin: "8px 0 0", fontSize: 14 }}>{sub}</p>
                <div className="mono" style={{ color: "var(--blue)", fontSize: 12.5, marginTop: 14 }}>Read &rarr;</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- LARGEST AGENCIES ---------- */}
      <section className="fc-wrap" style={{ padding: "56px 40px" }}>
        <div className="eyebrow">Largest agencies</div>
        <h2 style={{ marginTop: 12 }}>Browse by agency.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginTop: 24 }}>
          {agencies.map((a) => (
            <Link
              key={a.slug}
              href={`/property-agents/agency/${a.slug}`}
              className="fc-card fc-card--pad fc-card--hover"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div style={{ fontWeight: 700, fontSize: 15 }}>{cleanAgency(a.name)}</div>
              <div className="fc-row muted" style={{ marginTop: 8, gap: 12, fontSize: 12.5 }}>
                <span>{a.agent_count?.toLocaleString()} agents</span>
                {a.google_rating && <span style={{ color: "var(--ink)" }}>{"★"} {a.google_rating}</span>}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <SellCtaBand source="agents_hub" heading="Selling your home?" sub="Skip the browsing. Get a free shortlist of the agents who actually sell properties like yours, ranked on the same government data." />
    </>
  );
}
