import Link from "next/link";
import { supabase } from "../lib/supabase";
import type { Metadata } from "next";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Property Agents in Singapore - Compare 30,000+ CEA Agents",
  description: "Compare property agents in Singapore on actual CEA transaction records. AgentScore rates 10,000+ agents on volume, recency, diversity, and reviews.",
  alternates: { canonical: "https://fair-comparisons.com/property-agents" },
};

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
      <section className="bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900">
        <div className="mx-auto max-w-[1120px] px-5 py-16 md:px-8 md:py-20">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-300">Property Agents</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            {agentCount.toLocaleString()} agents.<br />
            <span className="text-coral-400">One independent score.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/60">
            Every CEA-registered agent in Singapore, ranked on actual transaction records.
            Not advertising. Not self-reported. Government data only.
          </p>
          <form action="/search" method="GET" className="mt-8 flex flex-col gap-3 sm:flex-row">
            <input type="text" name="q" placeholder="Agent name, district, or HDB town..."
              className="flex-1 rounded-lg bg-white/10 px-5 py-3.5 text-white placeholder:text-white/40 backdrop-blur-sm focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-teal-400" />
            <button type="submit" className="rounded-lg bg-coral-500 px-7 py-3.5 font-semibold text-white shadow-lg transition hover:bg-coral-400">
              Find agent
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-2xl font-bold text-gray-900">Browse by district</h2>
        <div className="mt-6 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {districts.map((d) => (
            <Link key={d.code} href={`/property-agents/district/${d.slug}`}
              className="group rounded-lg border border-gray-200 bg-white p-3 transition hover:border-teal-300 hover:shadow-sm">
              <span className="text-xs font-bold text-teal-600">{d.code}</span>
              <div className="mt-1 text-sm font-medium text-gray-900 group-hover:text-teal-600">{d.name?.split(",")[0]}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
          <h2 className="text-2xl font-bold text-gray-900">Largest agencies</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {agencies.map((a) => (
              <Link key={a.slug} href={`/property-agents/agency/${a.slug}`}
                className="group rounded-lg border border-gray-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm">
                <div className="font-semibold text-gray-900 group-hover:text-teal-600">{a.name}</div>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <span>{a.agent_count?.toLocaleString()} agents</span>
                  {a.google_rating && <span className="text-amber-500">{"\u2605"} {a.google_rating}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
