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
    description: "Singapore's independent professional ratings. Compare property agents, lawyers, and more.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://fair-comparisons.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900">
        <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-8 md:py-28">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-300">
            Independent professional ratings
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
            Find Singapore&apos;s best professionals.
            <br />
            <span className="text-coral-400">Exposed by data, not advertising.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/60">
            We analyse government records, court judgments, and public data to rate professionals
            on actual performance. No pay-to-play. No fake reviews. Just facts.
          </p>
        </div>
      </section>

      {/* Sector Cards */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <div className="grid gap-6 md:grid-cols-2">
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
                <p className="text-sm text-gray-500">10,568 court judgments analysed</p>
              </div>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
              We are building Singapore&apos;s first data-driven lawyer comparison platform.
              Every practicing lawyer rated on actual court outcomes, case volume, specialization,
              and judicial patterns. Sourced from eLitigation.sg public records.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-coral-50 px-3 py-1 text-xs font-medium text-coral-600">10,568 judgments</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">6,000 lawyers</span>
            </div>
            <Link href="/lawyers" className="mt-4 inline-block text-sm font-semibold text-coral-600 hover:text-coral-700">Learn more {"\u2192"}</Link>
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
              <p className="mt-2 text-sm text-gray-500">Government databases, court judgments, and official registers. Data that already exists but nobody has structured.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl font-bold text-teal-600">2</div>
              <h3 className="mt-4 font-bold text-gray-900">We score performance</h3>
              <p className="mt-2 text-sm text-gray-500">Our algorithms analyse transaction volume, outcomes, experience, and reviews into an objective score per professional.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-50 text-2xl font-bold text-coral-600">3</div>
              <h3 className="mt-4 font-bold text-gray-900">You compare fairly</h3>
              <p className="mt-2 text-sm text-gray-500">Rankings based on data, not advertising spend. Professionals cannot buy a higher position. Ever.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-t border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-gray-400">Data sourced from</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
            <span>CEA Public Register</span>
            <span>URA Data Service</span>
            <span>HDB (data.gov.sg)</span>
            <span>eLitigation.sg</span>
            <span>Google Reviews</span>
          </div>
        </div>
      </section>
    </>
  );
}
