import Link from "next/link";
import { supabase } from "./lib/supabase";

export const revalidate = 3600;

async function getStats() {
  const [agencyRes, agentRes, districtRes] = await Promise.all([
    supabase.from("sg_agencies").select("id", { count: "exact", head: true }),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }),
    supabase.from("sg_districts").select("id", { count: "exact", head: true }),
  ]);
  return {
    agencies: agencyRes.count ?? 0,
    agents: agentRes.count ?? 0,
    districts: districtRes.count ?? 0,
  };
}

async function getTopAgencies() {
  const { data } = await supabase
    .from("sg_agencies")
    .select("name, slug, agent_count, google_rating, google_review_count")
    .order("agent_count", { ascending: false })
    .limit(8);
  return data ?? [];
}

async function getDistricts() {
  const { data } = await supabase
    .from("sg_districts")
    .select("code, name")
    .order("code");
  return data ?? [];
}

export default async function HomePage() {
  const [stats, topAgencies, districts] = await Promise.all([
    getStats(),
    getTopAgencies(),
    getDistricts(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AgentScan",
    url: "https://agentscan.sg",
    description: "Independent comparison platform for property agents in Singapore",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://agentscan.sg/agencies?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-emerald-900 to-gray-900">
        <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10 md:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Independent comparison platform
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-white md:text-5xl">
              Find the right property agent
              <span className="text-emerald-400"> in Singapore</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-white/60">
              Don&apos;t choose the wrong agent. Compare{" "}
              {stats.agents > 0 ? stats.agents.toLocaleString() : "30,000+"} CEA-registered
              agents across {stats.agencies > 0 ? stats.agencies.toLocaleString() : "930"} agencies
              on actual client reviews and market performance.
            </p>

            <form action="/agencies" method="GET" className="mt-8 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                name="q"
                placeholder="Agency name, agent name, or district..."
                className="flex-1 rounded-lg bg-white/10 px-5 py-3.5 text-white placeholder:text-white/40 backdrop-blur-sm focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-7 py-3.5 font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
              >
                Compare agents
              </button>
            </form>
          </div>

          {/* Stats */}
          <div className="mt-14 grid max-w-md grid-cols-3 gap-4">
            {[
              { value: stats.agents.toLocaleString(), label: "Agents" },
              { value: stats.agencies.toLocaleString(), label: "Agencies" },
              { value: stats.districts.toString(), label: "Districts" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-white/5 p-3 text-center backdrop-blur-sm">
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Districts */}
      <section className="mx-auto max-w-[1280px] px-5 py-14 md:px-10">
        <h2 className="text-2xl font-bold text-gray-900">Agents by district</h2>
        <p className="mt-2 text-gray-500">
          Singapore is divided into 28 official districts. Find agents active in your area.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {districts.map((d) => (
            <Link
              key={d.code}
              href={`/district/${d.code.toLowerCase()}-${d.name.split(",")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              className="group rounded-lg border border-gray-200 bg-white p-3 transition hover:border-emerald-300 hover:shadow-sm"
            >
              <span className="text-xs font-bold text-emerald-600">{d.code}</span>
              <div className="mt-1 text-sm font-medium text-gray-900 group-hover:text-emerald-600">
                {d.name.split(",")[0]}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Top Agencies */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[1280px] px-5 py-14 md:px-10">
          <h2 className="text-2xl font-bold text-gray-900">Largest agencies</h2>
          <p className="mt-2 text-gray-500">
            The biggest property agencies by number of registered agents.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {topAgencies.map((a) => (
              <Link
                key={a.slug}
                href={`/agency/${a.slug}`}
                className="group rounded-lg border border-gray-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm"
              >
                <div className="font-semibold text-gray-900 group-hover:text-emerald-600">{a.name}</div>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <span>{a.agent_count.toLocaleString()} agents</span>
                  {a.google_rating && (
                    <span className="text-amber-500">
                      {"\u2605"} {a.google_rating}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/agencies" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
              View all {stats.agencies} agencies &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="border-t border-gray-100">
        <div className="mx-auto max-w-3xl px-5 py-14 md:px-10">
          <h2 className="text-xl font-bold text-gray-900">Compare property agents in Singapore</h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-500">
            <p>
              AgentScan is an independent comparison platform for property agents
              in Singapore. We analyse public data from {stats.agents.toLocaleString()} CEA-registered
              agents across {stats.agencies.toLocaleString()} agencies and combine it into the
              AgentScore: an objective quality score from 0 to 100.
            </p>
            <p>
              Google reviews are positively biased - agents ask satisfied clients
              to leave reviews while dissatisfied clients rarely do. AgentScan corrects
              for this by combining reviews from Google, PropertyGuru, and other sources,
              applying statistical corrections based on review volume.
            </p>
            <p>
              Whether you are buying an HDB flat, a private condo, or landed property,
              AgentScan helps you find an agent with proven experience in your district
              and property type.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
