"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { HDB_TOWNS, townDisplayName } from "../lib/hdbData";
import { trackEvent } from "../lib/analytics";
import { postalToDistrictCode, looksLikePostal } from "../lib/postal";
import { titleName, cleanAgency } from "../lib/names";
import AgentFlags from "../components/AgentFlags";

type District = { code: string; name: string; slug: string };

type SearchResult = {
  type: "district" | "hdb_town" | "agency" | "agent";
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
};

type TopAgent = {
  name: string;
  agency: string | null;
  areaTxns: number;
  score: number | null;
  saleShare: number | null;
  slug: string | null;
  rank: number;
  flags?: { t: string; pct?: number }[];
};
type AreaPreview = {
  district: { code: string; name: string; shortName: string; slug: string | null };
  bestSlug: string;
  agentCount: number;
  topAgents: TopAgent[];
  market: { medianPrice: number; totalTxns: number } | null;
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
function fmtPrice(n: number) {
  if (n >= 1_000_000) return `S$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `S$${Math.round(n / 1_000)}K`;
  return `S$${n}`;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [preview, setPreview] = useState<AreaPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Load districts once, then read URL param
  useEffect(() => {
    supabase.from("sg_districts").select("code, name, slug").order("code").then(({ data }) => {
      setDistricts(data ?? []);
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) setQuery(q);
    });
  }, []);

  // Postal code → rich district preview (real agents + market data)
  useEffect(() => {
    const q = query.trim();
    if (!looksLikePostal(q)) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    const code = postalToDistrictCode(q);
    if (!code) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    fetch(`/api/area-preview?district=${code}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AreaPreview | null) => {
        if (cancelled) return;
        setPreview(data);
        setPreviewLoading(false);
        if (data) {
          trackEvent("search", { search_term: q, result_count: data.agentCount });
          fetch("/api/funnel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "search_performed",
              metadata: { query: q, postal_district: code, agent_count: data.agentCount },
            }),
          }).catch(() => {});
        }
      })
      .catch(() => {
        if (!cancelled) { setPreview(null); setPreviewLoading(false); }
      });
    return () => { cancelled = true; };
  }, [query]);

  // Name search (districts, HDB towns, agencies, agents)
  useEffect(() => {
    if (query.length < 2 || looksLikePostal(query.trim())) { setResults([]); return; }
    const q = query.toLowerCase().trim();
    setLoading(true);

    const districtMatches: SearchResult[] = districts
      .filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q))
      .map((d) => ({
        type: "district",
        title: `${d.code} ${d.name.split(",")[0]}`,
        subtitle: "Market analysis with real URA transaction data",
        href: `/property-agents/district/${d.slug}`,
        badge: "District",
      }));

    const hdbMatches: SearchResult[] = HDB_TOWNS
      .filter((t) => townDisplayName(t.name).toLowerCase().includes(q) || t.slug.includes(q))
      .map((t) => ({
        type: "hdb_town",
        title: `${townDisplayName(t.name)} HDB`,
        subtitle: "HDB resale prices, trends and flat-type analysis",
        href: `/property-agents/hdb/${t.slug}`,
        badge: "HDB town",
      }));

    Promise.all([
      supabase
        .from("sg_agencies")
        .select("name, slug, agent_count, google_rating")
        .ilike("name", `%${q}%`)
        .order("agent_count", { ascending: false })
        .limit(5),
      supabase
        .from("sg_agents")
        .select("name, slug, agency_name, cea_registration")
        .ilike("name", `%${q}%`)
        .limit(8),
    ]).then(([agencyRes, agentRes]) => {
      const agencyMatches: SearchResult[] = (agencyRes.data ?? []).map((a) => ({
        type: "agency" as const,
        title: cleanAgency(a.name),
        subtitle: `${(a.agent_count ?? 0).toLocaleString()} agents${a.google_rating ? ` · ${Number(a.google_rating).toFixed(1)} on Google` : ""}`,
        href: `/property-agents/agency/${a.slug}`,
        badge: "Agency",
      }));
      const agentMatches: SearchResult[] = (agentRes.data ?? []).map((a) => ({
        type: "agent" as const,
        title: titleName(a.name),
        subtitle: `${cleanAgency(a.agency_name)} · CEA ${a.cea_registration}`,
        href: `/property-agents/agent/${a.slug}`,
        badge: "Agent",
      }));

      const all = [...districtMatches, ...hdbMatches, ...agencyMatches, ...agentMatches];
      setResults(all);
      setLoading(false);
      if (all.length > 0) {
        trackEvent("search", { search_term: q, result_count: all.length });
        fetch("/api/funnel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "search_performed",
            metadata: { query: q, result_count: all.length },
          }),
        }).catch(() => {});
      }
    });
  }, [query, districts]);

  const districtNum = preview ? parseInt(preview.district.code.replace(/\D/g, ""), 10) : 0;
  const showEmpty = query.length < 2;
  const noResults =
    !showEmpty && !preview && !previewLoading && !loading && results.length === 0;

  return (
    <>
      {/* search header */}
      <div className="fc-wrap" style={{ padding: "26px 40px 0" }}>
        <div className="sr-crumb">
          <Link href="/">Home</Link> / Search
        </div>
        <h1 style={{ margin: "22px 0 8px" }}>Search</h1>
        <p className="lede" style={{ maxWidth: "none" }}>
          Find districts, HDB towns, agencies, or agents.
        </p>

        <div className="sr-search" style={{ marginTop: 24 }}>
          <svg className="ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="sr-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Postal code, district, HDB town, agency or agent"
            aria-label="Search"
            autoFocus
          />
        </div>
      </div>

      {/* results */}
      <div className="fc-wrap" style={{ padding: "8px 40px 72px" }}>
        {previewLoading && !preview && (
          <p className="muted small" style={{ marginTop: 28 }}>Finding agents for that postal code…</p>
        )}

        {/* primary postal-code match */}
        {preview && (
          <>
            <div className="sr-group">
              <div className="eyebrow">Postal code match</div>
              <Link
                href={preview.district.slug ? `/property-agents/district/${preview.district.slug}` : `/property-agents/best/${preview.bestSlug}`}
                className="fc-card fc-card--hover sr-result"
                style={{ marginTop: 14 }}
              >
                <span className="sr-tile" style={{ background: "var(--ink)", color: "#fff" }}>
                  {preview.district.code}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="serif" style={{ fontWeight: 600, fontSize: 23, letterSpacing: "-0.01em" }}>
                    District {districtNum} · {preview.district.shortName}
                  </div>
                  <div className="muted">
                    Postal code {query.trim()} sits in {preview.district.code}. See the agents who actually sell here.
                  </div>
                </div>
                <span className="fc-badge fc-badge--ranked"><span className="dot" /> Ranked on CEA data</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </div>

            {/* top agents */}
            {preview.topAgents.length > 0 && (
              <div className="sr-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div className="eyebrow">Agents in {preview.district.code}</div>
                    <p className="muted small" style={{ margin: "8px 0 0" }}>
                      Ranked on AgentScore, computed from real transaction performance. No paid placement.
                    </p>
                  </div>
                  <Link href={`/property-agents/best/${preview.bestSlug}`} className="small" style={{ fontWeight: 700 }}>
                    See all {preview.agentCount} ranked agents ›
                  </Link>
                </div>
                <div className="fc-card" style={{ padding: "4px 24px 10px", marginTop: 14 }}>
                  {preview.topAgents.map((a) => (
                    <Link
                      key={a.slug ?? a.rank}
                      href={a.slug ? `/property-agents/agent/${a.slug}` : `/property-agents/best/${preview.bestSlug}`}
                      className="fc-rank"
                      style={{ color: "inherit" }}
                    >
                      <span className="fc-rank__pos">{String(a.rank).padStart(2, "0")}</span>
                      <span className="fc-avatar" style={{ width: 40, height: 40, borderRadius: 10, fontSize: 15 }}>
                        {initials(a.name)}
                      </span>
                      <div className="fc-rank__main">
                        <div className="fc-rank__name">{titleName(a.name)}</div>
                        <div className="fc-rank__sub">
                          {[a.agency ? cleanAgency(a.agency) : null, `${a.areaTxns} deals in ${preview.district.code}`].filter(Boolean).join(" · ")}
                        </div>
                        {a.flags && a.flags.length > 0 && (
                          <div style={{ marginTop: 6 }}>
                            <AgentFlags flags={a.flags} size="sm" />
                          </div>
                        )}
                      </div>
                      {a.score != null && (
                        <span className="fc-rank__score" style={{ color: a.score >= 75 ? "var(--ink)" : "var(--slate)" }}>
                          {a.score}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/sell?type=CONDO&district=${preview.district.code}&utm_source=search`}
                  className="fc-btn fc-btn--primary fc-btn--block"
                  style={{ marginTop: 14 }}
                >
                  Compare these agents, free for sellers
                </Link>
              </div>
            )}

            {/* market data */}
            {preview.market && (
              <div className="sr-group">
                <div className="eyebrow">Market data · {preview.district.code}</div>
                <p className="muted small" style={{ margin: "8px 0 0" }}>
                  Price analysis based on real transaction data.
                </p>
                <div className="fc-grid-3" style={{ marginTop: 16 }}>
                  <div className="fc-card fc-card--pad">
                    <div className="mono small muted">MEDIAN PRIVATE PRICE</div>
                    <div className="serif tnum" style={{ fontSize: 32, fontWeight: 600, marginTop: 4 }}>
                      {fmtPrice(preview.market.medianPrice)}
                    </div>
                    <div className="small muted">condos and apartments</div>
                  </div>
                  <div className="fc-card fc-card--pad">
                    <div className="mono small muted">TRANSACTIONS ANALYSED</div>
                    <div className="serif tnum" style={{ fontSize: 32, fontWeight: 600, marginTop: 4 }}>
                      {preview.market.totalTxns.toLocaleString()}
                    </div>
                    <div className="small muted">private, from URA caveats</div>
                  </div>
                  <div className="fc-card fc-card--pad">
                    <div className="mono small muted">AGENTS RANKED</div>
                    <div className="serif tnum" style={{ fontSize: 32, fontWeight: 600, marginTop: 4 }}>
                      {preview.agentCount}
                    </div>
                    <div className="small muted">active in {preview.district.code}</div>
                  </div>
                </div>
                <div className="fc-badge fc-badge--source" style={{ marginTop: 14 }}>Source · URA · HDB · CEA</div>
              </div>
            )}
          </>
        )}

        {/* name matches */}
        {loading && <p className="muted small" style={{ marginTop: 28 }}>Searching…</p>}

        {results.length > 0 && (
          <div className="sr-group">
            <div className="eyebrow">{preview ? "Other matches" : "Results"}</div>
            <div className="fc-grid-2" style={{ marginTop: 14, gap: 16 }}>
              {results.map((r) => {
                const isLoc = r.type === "district" || r.type === "hdb_town";
                return (
                  <Link key={r.href} href={r.href} className="fc-card fc-card--hover sr-result">
                    <span
                      className="sr-tile"
                      style={
                        isLoc
                          ? { background: "var(--blue-wash)", color: "var(--blue-deep)" }
                          : { background: "var(--cloud-2)", color: "var(--ink)" }
                      }
                    >
                      {isLoc ? r.title.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() : initials(r.title)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{r.title}</div>
                      <div className="muted small">{r.subtitle}</div>
                    </div>
                    <span className="fc-badge fc-badge--source">{r.badge}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* no results */}
        {noResults && (
          <div style={{ marginTop: 48, textAlign: "center" }}>
            <p className="muted">No results for &quot;{query}&quot;</p>
            <p className="muted small" style={{ marginTop: 6 }}>
              Try a 6-digit postal code, a district name, HDB town, or agency.
            </p>
          </div>
        )}

        {/* empty state */}
        {showEmpty && (
          <div className="sr-group">
            <div className="eyebrow">Popular market reports</div>
            <div className="fc-grid-3" style={{ marginTop: 14 }}>
              {[
                { title: "Tampines HDB", desc: "13,000+ transactions analysed", href: "/property-agents/hdb/tampines" },
                { title: "D09 Orchard", desc: "Prime condo market, freehold analysis", href: "/property-agents/district/d09-orchard" },
                { title: "Bishan HDB", desc: "Premium HDB town, million-dollar flats", href: "/property-agents/hdb/bishan" },
                { title: "D15 Katong", desc: "East Coast property prices and trends", href: "/property-agents/district/d15-katong" },
                { title: "Sengkang HDB", desc: "Most-traded HDB town in Singapore", href: "/property-agents/hdb/sengkang" },
                { title: "D10 Bukit Timah", desc: "Landed and condo market analysis", href: "/property-agents/district/d10-ardmore" },
              ].map((p) => (
                <Link key={p.href} href={p.href} className="fc-card fc-card--hover fc-card--pad">
                  <div style={{ fontWeight: 700 }}>{p.title}</div>
                  <div className="muted small" style={{ marginTop: 4 }}>{p.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
