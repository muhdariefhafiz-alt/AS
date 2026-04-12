import Link from "next/link";
import { supabase } from "./lib/supabase";

export const revalidate = false;

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
            <span className="text-coral-400">in Singapore.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/60">
            We combine CEA transaction records, URA data, and Google reviews to score every agent in Singapore. Rankings are calculated, not bought.
          </p>

          {/* Hero CTA */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/property-agents" className="inline-flex items-center justify-center rounded-lg bg-coral-500 px-7 py-3.5 font-semibold text-white shadow-lg transition hover:bg-coral-400">
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
        <div className="grid gap-6 md:grid-cols-3">
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

          {/* Lawyers */}
          <div className="relative rounded-2xl border border-gray-200 bg-white p-8">
            <div className="absolute right-4 top-4 rounded-full bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-600">Coming Soon</div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral-50 text-xl">{"\u2696\ufe0f"}</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Lawyers</h2>
                <p className="text-sm text-gray-500">5,204 court judgments analysed</p>
              </div>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
              We are building Singapore&apos;s first data-driven lawyer comparison platform.
              8,000+ lawyers tracked across Supreme Court, District Court, and Family Court.
              Sourced from eLitigation.sg public records.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-coral-50 px-3 py-1 text-xs font-medium text-coral-600">5,204 judgments</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">8,021 lawyers</span>
            </div>
            <Link href="/lawyers" className="mt-4 inline-block text-sm font-semibold text-coral-600 hover:text-coral-700">Browse lawyers {"\u2192"}</Link>
          </div>

          {/* Financial Advisors */}
          <Link href="/financial-advisors"
            className="group rounded-2xl border border-gray-200 bg-white p-8 transition hover:border-blue-300 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl">{"\ud83d\udcb0"}</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600">Financial Advisors</h2>
                <p className="text-sm text-gray-500">MAS-regulated institutions</p>
              </div>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
              Every MAS-licensed financial institution in Singapore. Banks, insurers, financial advisors,
              capital markets firms, and payment providers. Verified against the MAS register.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">MAS Licensed</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">5 sectors</span>
            </div>
            <p className="mt-4 text-sm font-semibold text-blue-600 group-hover:text-blue-700">Browse institutions {"\u2192"}</p>
          </Link>
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
              <p className="mt-2 text-sm text-gray-500">Volume (30pts), recency (25pts), diversity (15pts), experience (15pts), and reviews (15pts) into one objective AgentScore.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-50 text-2xl font-bold text-coral-600">3</div>
              <h3 className="mt-4 font-bold text-gray-900">You compare fairly</h3>
              <p className="mt-2 text-sm text-gray-500">Rankings based on data, not advertising spend. Professionals cannot buy a higher position. Ever.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
