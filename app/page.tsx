import Link from "next/link";
import { supabase } from "./lib/supabase";

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

export default async function HomePage() {
  const stats = await getStats();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FairComparisons",
    url: "https://fair-comparisons.com",
    description: "Compare property agents in Singapore on actual government transaction records. Independent ratings based on CEA, URA, and HDB data.",
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
    description: "Independent professional comparison platform for Singapore. Rankings based on government data, not advertising.",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900">
        <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-8 md:py-28">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-300">
            Independent professional ratings
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
            Compare property agents<br />
            <span className="text-teal-300">in Singapore.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/60">
            We combine CEA transaction records, URA data, and Google reviews to score every agent in Singapore. Rankings are calculated, not bought.
          </p>

          {/* Hero CTA */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/property-agents" className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-7 py-3.5 font-semibold text-white shadow-lg transition hover:bg-teal-500">
              Compare property agents
            </Link>
            <Link href="/about" className="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white">
              How we score agents
            </Link>
          </div>

          {/* Stats bar */}
          <div className="mt-12 flex flex-wrap items-center gap-8 border-t border-white/10 pt-8">
            <div className="text-center">
              <span className="text-2xl font-extrabold text-white">{stats.scoredAgents.toLocaleString()}</span>
              <p className="text-xs text-white/40">agents scored</p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-extrabold text-white">{stats.transactions.toLocaleString()}+</span>
              <p className="text-xs text-white/40">transactions analysed</p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-extrabold text-white">28</span>
              <p className="text-xs text-white/40">districts covered</p>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/40">CEA Public Register</span>
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/40">URA Data Service</span>
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/40">HDB (data.gov.sg)</span>
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/40">Google Reviews</span>
          </div>
        </div>
      </section>

      {/* Sector Cards */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <div className="mx-auto grid max-w-[640px] gap-6">
          {/* Property Agents */}
          <Link href="/property-agents"
            className="group rounded-2xl border border-gray-200 bg-white p-8 transition hover:border-teal-300 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-xl">{"\ud83c\udfe0"}</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-teal-600">Property Agents</h2>
                <p className="text-sm text-gray-500">Rated on {stats.transactions.toLocaleString()}+ CEA transactions</p>
              </div>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
              {stats.scoredAgents.toLocaleString()} agents scored across {stats.agencies.toLocaleString()} agencies.
              Ranked by transaction volume, market diversity, experience, and reviews.
              Based on data from CEA, URA, and HDB.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">{stats.scoredAgents.toLocaleString()} agents rated</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">28 districts</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">26 HDB towns</span>
            </div>
            <p className="mt-4 text-sm font-semibold text-teal-600 group-hover:text-teal-700">Compare agents {"\u2192"}</p>
          </Link>
        </div>
      </section>

      {/* Featured Content */}
      <section className="border-t border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
          <h2 className="text-2xl font-bold text-gray-900">Explore the data</h2>
          <p className="mt-2 text-[15px] text-gray-500">Data-driven analysis you won't find anywhere else in Singapore.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/insights/million-dollar-hdb" className="group rounded-xl border border-gray-100 bg-white p-5 transition hover:border-green-200 hover:shadow-md">
              <span className="text-xs font-semibold text-green-600">HDB</span>
              <h3 className="mt-1 font-bold text-gray-900 group-hover:text-green-600">Million-Dollar HDB Tracker</h3>
              <p className="mt-1 text-xs text-gray-500">Every S$1M+ resale flat by town</p>
            </Link>
            <Link href="/insights/freehold-premium" className="group rounded-xl border border-gray-100 bg-white p-5 transition hover:border-teal-200 hover:shadow-md">
              <span className="text-xs font-semibold text-teal-600">Private</span>
              <h3 className="mt-1 font-bold text-gray-900 group-hover:text-teal-600">Freehold Premium by District</h3>
              <p className="mt-1 text-xs text-gray-500">How much more does freehold cost?</p>
            </Link>
            <Link href="/insights/court-case-statistics" className="group rounded-xl border border-gray-100 bg-white p-5 transition hover:border-slate-200 hover:shadow-md">
              <span className="text-xs font-semibold text-slate-600">Legal</span>
              <h3 className="mt-1 font-bold text-gray-900 group-hover:text-slate-600">Court Case Statistics</h3>
              <p className="mt-1 text-xs text-gray-500">5,200+ judgments analyzed</p>
            </Link>
            <Link href="/property-agents/market/2025" className="group rounded-xl border border-gray-100 bg-white p-5 transition hover:border-teal-200 hover:shadow-md">
              <span className="text-xs font-semibold text-teal-600">Market</span>
              <h3 className="mt-1 font-bold text-gray-900 group-hover:text-teal-600">2025 Market Overview</h3>
              <p className="mt-1 text-xs text-gray-500">Transactions, top agents, trends</p>
            </Link>
          </div>

          <div className="mt-6 text-right">
            <Link href="/insights" className="text-sm font-semibold text-teal-600 hover:text-teal-700">View all insights {"\u2192"}</Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Link href="/property-agents/district/d09-orchard" className="rounded-lg border border-gray-100 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-teal-200 hover:text-teal-600">D09 Orchard Market Analysis</Link>
            <Link href="/property-agents/district/d10-ardmore" className="rounded-lg border border-gray-100 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-teal-200 hover:text-teal-600">D10 Bukit Timah Market Analysis</Link>
            <Link href="/property-agents/district/d15-katong" className="rounded-lg border border-gray-100 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-teal-200 hover:text-teal-600">D15 Katong Market Analysis</Link>
            <Link href="/property-agents/hdb/ang-mo-kio" className="rounded-lg border border-gray-100 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-teal-200 hover:text-teal-600">Ang Mo Kio HDB Prices</Link>
            <Link href="/property-agents/hdb/tampines" className="rounded-lg border border-gray-100 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-teal-200 hover:text-teal-600">Tampines HDB Prices</Link>
            <Link href="/property-agents/hdb/bedok" className="rounded-lg border border-gray-100 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-teal-200 hover:text-teal-600">Bedok HDB Prices</Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">How our ratings work</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl font-bold text-teal-600">1</div>
              <h3 className="mt-4 font-bold text-gray-900">We collect public records</h3>
              <p className="mt-2 text-sm text-gray-500">CEA transaction records, URA prices, HDB resale data, and Google reviews. Data that already exists but nobody has structured.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl font-bold text-teal-600">2</div>
              <h3 className="mt-4 font-bold text-gray-900">We score performance</h3>
              <p className="mt-2 text-sm text-gray-500">Transaction volume, recency, market diversity, and years of experience combined into one objective AgentScore out of 100.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-2xl font-bold text-slate-600">3</div>
              <h3 className="mt-4 font-bold text-gray-900">You compare fairly</h3>
              <p className="mt-2 text-sm text-gray-500">Rankings based on data, not advertising spend. Professionals cannot buy a higher position. Ever.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
