import Link from "next/link";
import { supabase } from "../lib/supabase";
import { cleanAgency } from "../lib/names";
import SellCtaBand from "../components/SellCtaBand";
import type { Metadata } from "next";
import ProductBox from "../components/ProductBox";
import { SellerCompareMock } from "../components/mocks";
import ScrollReveal from "../components/ScrollReveal";
import DataMarquee from "../components/DataMarquee";
import { CondoTower } from "../components/LineArt";
import { Icon } from "../components/Icons";

// Icon roundel for section eyebrows (same language as /search groups).
function Roundel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22,
        borderRadius: 7, background: "var(--blue-wash)", color: "var(--blue-deep)", flex: "0 0 auto",
      }}
    >
      {children}
    </span>
  );
}

export const revalidate = 43200; // 12h; daily cron also force-revalidates

export const metadata: Metadata = {
  title: "Compare Singapore Property Agents on CEA Data",
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
      <ScrollReveal />

      {/* ---------- HERO ---------- */}
      <section style={{ background: "var(--ink)", color: "#fff", position: "relative", overflow: "hidden" }}>
        <CondoTower
          className="fc-lineart fc-float"
          width={104}
          style={{ position: "absolute", right: "4%", bottom: 14, color: "var(--line-dk)" }}
        />
        <div className="fc-wrap" style={{ padding: "64px 40px 56px", position: "relative" }}>
          <div className="eyebrow fc-hero-in fc-hero-in--1" style={{ color: "var(--slate-2)", marginBottom: 18 }}>
            Property agents
          </div>
          <h1 className="fc-hero-in fc-hero-in--2" style={{ color: "#fff", fontSize: "var(--t-h1)", margin: 0, maxWidth: "16ch" }}>
            {agentCount.toLocaleString()} agents. <span className="italic-serif">One independent score.</span>
          </h1>
          <p className="lede fc-hero-in fc-hero-in--3" style={{ color: "rgba(255,255,255,0.74)", marginTop: 16, maxWidth: "60ch" }}>
            Every CEA-registered agent in Singapore, ranked on actual transaction records. Not advertising, not self-reported. Government data only.
          </p>

          <form action="/search" method="GET" className="fc-search fc-hero-in fc-hero-in--4" style={{ marginTop: 26 }}>
            <input name="q" placeholder="Agent name, district, or HDB town" aria-label="Search agents, districts or towns" />
            <button type="submit" className="fc-btn fc-btn--primary fc-btn--hairline">Find agent</button>
          </form>

          <div className="fc-row fc-hero-in fc-hero-in--5" style={{ marginTop: 16, gap: 18 }}>
            <span className="mono" style={{ color: "rgba(255,255,255,0.82)", fontSize: 13 }}>
              Ranked on CEA, URA and HDB data
            </span>
            <Link href="/property-agents/check" className="mono" style={{ color: "var(--blue-wash)", fontSize: 13 }}>
              Check a specific agent &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- DATA MARQUEE ---------- */}
      <DataMarquee
        items={[
          `${agentCount.toLocaleString()} agents ranked`,
          "28 districts",
          "CEA, URA and HDB data only",
          "Rankings cannot be bought",
          "Free for sellers",
        ]}
      />

      {/* ---------- SELLER PRODUCT BOX ---------- */}
      <section className="fc-wrap" style={{ padding: "56px 40px 0" }}>
        <ProductBox
          layout="hero"
          eyebrow="Compare and invite"
          title="See every agent ranked, then invite the ones you choose."
          body="Shortlist up to three agents in your area on their real transaction record and invite them to quote. Free for sellers, no obligation, and no agent can pay to rank higher."
          mockup={<SellerCompareMock />}
          cta={{ label: "See agents in your area", href: "/search", variant: "ink" }}
          secondary={{ label: "How the ranking works", href: "/how-we-score" }}
        />
      </section>

      {/* ---------- BROWSE BY DISTRICT (scene-framed area index) ---------- */}
      <section className="fc-wrap" style={{ padding: "56px 40px" }}>
        <div className="eyebrow fc-reveal" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Roundel><Icon.Pin size={13} /></Roundel> Browse by district
        </div>
        <h2 className="fc-reveal" style={{ marginTop: 12 }}>
          All 28 Singapore districts, <span className="italic-serif">one score.</span>
        </h2>
        <div className="fc-scene fc-scene--inbox fc-reveal" style={{ marginTop: 24, padding: "clamp(16px,2.5vw,28px)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {districts.map((d, di) => (
              <Link
                key={d.code}
                href={`/property-agents/district/${d.slug}`}
                className="fc-card fc-card--hover fc-reveal"
                style={{
                  ["--reveal-delay" as string]: `${Math.min(di * 0.03, 0.5)}s`,
                  padding: "12px 14px", display: "block", textDecoration: "none", color: "inherit", background: "#fff",
                }}
              >
                <span className="mono" style={{ color: "var(--blue)", fontSize: 12, fontWeight: 600 }}>{d.code}</span>
                <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600 }}>{d.name?.split(",")[0]}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- MARKET INSIGHTS ---------- */}
      <section style={{ background: "var(--cloud)" }}>
        <div className="fc-wrap" style={{ padding: "56px 40px" }}>
          <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div className="eyebrow fc-reveal" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Roundel><Icon.TrendUp size={13} /></Roundel> Market insights
              </div>
              <h2 className="fc-reveal" style={{ marginTop: 12 }}>Data, <span className="italic-serif">not opinion.</span></h2>
            </div>
            <Link href="/insights" className="fc-btn fc-btn--quiet fc-btn--sm">View all</Link>
          </div>
          <div className="fc-grid-3" style={{ marginTop: 24 }}>
            {INSIGHTS.map(([href, title, sub], ii) => (
              <Link key={href} href={href} className="fc-card fc-card--pad fc-card--hover fc-reveal" style={{ ["--reveal-delay" as string]: `${0.12 * ii}s`, background: "#fff", textDecoration: "none", color: "inherit" }}>
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
        <div className="eyebrow fc-reveal" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Roundel><Icon.Home size={13} /></Roundel> Largest agencies
        </div>
        <h2 className="fc-reveal" style={{ marginTop: 12 }}>Browse by agency.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginTop: 24 }}>
          {agencies.map((a, ai) => (
            <Link
              key={a.slug}
              href={`/property-agents/agency/${a.slug}`}
              className="fc-card fc-card--pad fc-card--hover fc-reveal"
              style={{ ["--reveal-delay" as string]: `${Math.min(ai * 0.06, 0.42)}s`, textDecoration: "none", color: "inherit" }}
            >
              <div style={{ fontWeight: 700, fontSize: 15 }}>{cleanAgency(a.name)}</div>
              <div className="fc-row muted" style={{ marginTop: 8, gap: 12, fontSize: 12.5 }}>
                <span>{a.agent_count?.toLocaleString()} agents</span>
                {a.google_rating && <span style={{ color: "var(--ink)" }}>{"★"} {a.google_rating}</span>}
              </div>
            </Link>
          ))}
        </div>
        <Link href="/property-agents/agencies" className="small" style={{ display: "inline-block", marginTop: 20, fontWeight: 700, color: "var(--blue)" }}>
          Compare all Singapore property agencies &rsaquo;
        </Link>
      </section>

      <SellCtaBand source="agents_hub" heading="Selling your home?" sub="Skip the browsing. Get a free shortlist of the agents who actually sell properties like yours, ranked on the same government data." />
    </>
  );
}
