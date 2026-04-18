"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { HDB_TOWNS, townDisplayName } from "../lib/hdbData";
import { trackEvent } from "../lib/analytics";

type Agency = {
  name: string;
  slug: string;
  agent_count: number;
  google_rating: number | null;
  google_review_count: number;
};

type Agent = {
  name: string;
  slug: string;
  agency_name: string;
  cea_registration: string;
};

type District = {
  code: string;
  name: string;
  slug: string;
};

type SearchResult = {
  type: "district" | "hdb_town" | "agency" | "agent";
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  rating?: number;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);

  // Load districts once, then read URL param
  useEffect(() => {
    supabase.from("sg_districts").select("code, name, slug").order("code").then(({ data }) => {
      setDistricts(data ?? []);
      // Read URL param after districts are loaded
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) setQuery(q);
    });
  }, []);

  // Search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }

    const q = query.toLowerCase().trim();
    setLoading(true);

    // 1. Match districts
    const districtMatches: SearchResult[] = districts
      .filter(d => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q))
      .map(d => ({
        type: "district",
        title: `${d.code} ${d.name.split(",")[0]}`,
        subtitle: `Private property market analysis with URA transaction data`,
        href: `/property-agents/district/${d.slug}`,
        badge: "District",
      }));

    // 2. Match HDB towns
    const hdbMatches: SearchResult[] = HDB_TOWNS
      .filter(t => townDisplayName(t.name).toLowerCase().includes(q) || t.slug.includes(q))
      .map(t => ({
        type: "hdb_town",
        title: `${townDisplayName(t.name)} HDB`,
        subtitle: `HDB resale prices, trends, and flat type analysis`,
        href: `/property-agents/hdb/${t.slug}`,
        badge: "HDB Town",
      }));

    // 3. Search agencies and agents from Supabase
    Promise.all([
      supabase
        .from("sg_agencies")
        .select("name, slug, agent_count, google_rating, google_review_count")
        .ilike("name", `%${q}%`)
        .order("agent_count", { ascending: false })
        .limit(5),
      supabase
        .from("sg_agents")
        .select("name, slug, agency_name, cea_registration")
        .ilike("name", `%${q}%`)
        .limit(8),
    ]).then(([agencyRes, agentRes]) => {
      const agencyMatches: SearchResult[] = (agencyRes.data ?? []).map((a: Agency) => ({
        type: "agency" as const,
        title: a.name,
        subtitle: `${a.agent_count.toLocaleString()} agents${a.google_rating ? ` · ★ ${Number(a.google_rating).toFixed(1)}` : ""}`,
        href: `/property-agents/agency/${a.slug}`,
        badge: "Agency",
        rating: a.google_rating ? Number(a.google_rating) : undefined,
      }));

      const agentMatches: SearchResult[] = (agentRes.data ?? []).map((a: Agent) => ({
        type: "agent" as const,
        title: a.name,
        subtitle: `${a.agency_name} · CEA ${a.cea_registration}`,
        href: `/property-agents/agent/${a.slug}`,
        badge: "Agent",
      }));

      // Combine: districts and HDB first (our unique value), then agencies, then agents
      const all = [...districtMatches, ...hdbMatches, ...agencyMatches, ...agentMatches];
      setResults(all);
      setLoading(false);
      if (all.length > 0) {
        trackEvent("search", { search_term: q, result_count: all.length });
        // Fire funnel event for admin analytics (tipping point / liquidity)
        fetch("/api/funnel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "search_performed",
            metadata: {
              query: q,
              result_count: all.length,
              has_district: districtMatches.length > 0,
              has_hdb: hdbMatches.length > 0,
              has_agency: agencyMatches.length > 0,
              has_agent: agentMatches.length > 0,
            },
          }),
        }).catch(() => {});
      }
    });
  }, [query, districts]);

  const hasLocation = results.some(r => r.type === "district" || r.type === "hdb_town");

  return (
    <>
      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">Search</span>
        </div>
      </nav>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Search</h1>
        <p className="mt-2 text-gray-500">Find districts, HDB towns, agencies, or agents.</p>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try: Orchard, Tampines, PropNex, or an agent name..."
          autoFocus
          className="mt-6 w-full rounded-xl border border-gray-200 px-5 py-4 text-[15px] shadow-sm transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />

        {loading && <p className="mt-6 text-sm text-gray-400">Searching...</p>}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="mt-10 text-center">
            <p className="text-gray-500">No results for &quot;{query}&quot;</p>
            <p className="mt-2 text-sm text-gray-400">Try searching for a district name, HDB town, or agency.</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 space-y-2">
            {/* Show location matches first with emphasis */}
            {hasLocation && (
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-teal-600">Market Data</p>
                <p className="text-sm text-gray-500">Price analysis, trends, and insights based on real transaction data.</p>
              </div>
            )}

            {results
              .filter(r => r.type === "district" || r.type === "hdb_town")
              .map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="group flex items-center gap-4 rounded-xl border border-teal-100 bg-teal-50/50 p-4 transition hover:border-teal-300 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-sm font-bold text-teal-700">
                    {r.type === "district" ? "D" : "H"}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 group-hover:text-teal-600">{r.title}</p>
                    <p className="text-sm text-gray-500">{r.subtitle}</p>
                  </div>
                  <span className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-medium text-teal-600">
                    {r.badge}
                  </span>
                </Link>
              ))}

            {results.some(r => r.type === "agency" || r.type === "agent") && (
              <div className="mb-2 mt-6">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Agencies & Agents</p>
              </div>
            )}

            {results
              .filter(r => r.type === "agency" || r.type === "agent")
              .map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white ${r.type === "agency" ? "bg-gray-800" : "bg-gray-500"}`}>
                    {r.type === "agency" ? "A" : r.title.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 group-hover:text-teal-600">{r.title}</p>
                    <p className="text-sm text-gray-500">{r.subtitle}</p>
                  </div>
                  <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500">
                    {r.badge}
                  </span>
                </Link>
              ))}
          </div>
        )}

        {/* Default: show popular searches when no query */}
        {query.length < 2 && (
          <div className="mt-10 space-y-8">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-teal-600">Popular Market Reports</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  { title: "Tampines HDB", desc: "13,000+ transactions analysed", href: "/property-agents/hdb/tampines" },
                  { title: "D09 Orchard", desc: "Prime condo market, freehold analysis", href: "/property-agents/district/d09-orchard" },
                  { title: "Bishan HDB", desc: "Premium HDB town, million-dollar flats", href: "/property-agents/hdb/bishan" },
                  { title: "D15 East Coast", desc: "Katong property prices and trends", href: "/property-agents/district/d15-katong" },
                  { title: "Sengkang HDB", desc: "Most traded HDB town in Singapore", href: "/property-agents/hdb/sengkang" },
                  { title: "D10 Bukit Timah", desc: "Landed and condo market analysis", href: "/property-agents/district/d10-ardmore" },
                ].map(p => (
                  <Link key={p.href} href={p.href}
                    className="group rounded-xl border border-gray-100 bg-white p-4 transition hover:border-teal-200 hover:shadow-sm">
                    <p className="font-semibold text-gray-900 group-hover:text-teal-600">{p.title}</p>
                    <p className="mt-1 text-sm text-gray-500">{p.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
