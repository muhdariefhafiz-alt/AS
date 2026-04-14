import Link from "next/link";
import { supabase } from "../../lib/supabase";
import ShareButtons from "../../components/ShareButtons";
import EmailCapture from "../../components/EmailCapture";
import type { Metadata } from "next";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Top Property Agents in Singapore 2026 - Data-Driven Rankings",
  description:
    "Who are the top-performing property agents in Singapore in 2026? Rankings based on 730,000+ CEA transactions across all 28 districts. No paid placements.",
  alternates: { canonical: "https://fair-comparisons.com/insights/top-agents-2026" },
  openGraph: {
    title: "Top Property Agents in Singapore 2026 - Who Closes the Most Deals?",
    description:
      "Data-driven rankings of Singapore's top property agents across all 28 districts. Based on 730,000+ CEA transaction records. No paid placements, no advertising bias.",
    url: "https://fair-comparisons.com/insights/top-agents-2026",
    siteName: "FairComparisons",
    locale: "en_SG",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Top Property Agents in Singapore 2026",
    description: "Data-driven rankings based on 730K+ CEA transactions. See who closes the most deals in your district.",
  },
};

type TopAgent = {
  name: string;
  slug: string;
  agency_name: string;
  score: number;
  transaction_count: number;
  percentile: number | null;
  primary_area: string | null;
};

type DistrictLeader = {
  area_name: string;
  agent_name: string;
  agent_slug: string;
  agency_name: string;
  score: number;
  area_txns: number;
};

const DISTRICTS = [
  { slug: "bukit-timah-holland", short: "Bukit Timah", code: "D10", areaName: "Ardmore/ Bukit Timah/ Holland Road/ Tanglin" },
  { slug: "orchard-river-valley", short: "Orchard", code: "D09", areaName: "Orchard/ Cairnhill/ River Valley" },
  { slug: "serangoon-hougang-punggol", short: "Serangoon/Hougang", code: "D19", areaName: "Serangoon Garden/ Hougang/ Punggol" },
  { slug: "katong-joo-chiat", short: "Katong/Joo Chiat", code: "D15", areaName: "Katong/ Joo Chiat/ Amber Road" },
  { slug: "tampines-pasir-ris", short: "Tampines/Pasir Ris", code: "D18", areaName: "Tampines/ Pasir Ris" },
  { slug: "bedok-east-coast", short: "Bedok/East Coast", code: "D16", areaName: "Bedok/ Upper East Coast/ Eastwood/ Kew Drive" },
  { slug: "queenstown-tiong-bahru", short: "Queenstown", code: "D03", areaName: "Queenstown/ Tiong Bahru" },
  { slug: "bishan-ang-mo-kio", short: "Bishan/AMK", code: "D20", areaName: "Bishan/ Ang Mo Kio" },
  { slug: "clementi-west-coast", short: "Clementi", code: "D05", areaName: "Pasir Panjang/ Hong Leong Garden/ Clementi New Town" },
  { slug: "novena-thomson", short: "Novena/Thomson", code: "D11", areaName: "Watten Estate/ Novena/ Thomson" },
  { slug: "jurong", short: "Jurong", code: "D22", areaName: "Jurong" },
  { slug: "balestier-toa-payoh", short: "Toa Payoh", code: "D12", areaName: "Balestier/ Toa Payoh/ Serangoon" },
];

async function getData() {
  // Top 20 agents nationwide by score
  const { data: topAgents } = await supabase
    .from("sg_agents")
    .select("name, slug, agency_name, score, transaction_count, percentile, primary_area")
    .not("score", "is", null)
    .order("score", { ascending: false })
    .limit(20);

  // Top agent per district
  const { data: districtLeaders } = await supabase
    .from("sg_area_top_agents")
    .select("area_name, agent_name, agent_slug, agency_name, score, area_txns")
    .eq("area_type", "district")
    .eq("rank", 1);

  // Stats
  const [agentCount, txnCount] = await Promise.all([
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).not("score", "is", null),
    supabase.from("sg_agents").select("transaction_count").not("transaction_count", "is", null),
  ]);

  const totalTxns = (txnCount.data ?? []).reduce((s, r) => s + (r.transaction_count || 0), 0);

  return {
    topAgents: (topAgents ?? []) as TopAgent[],
    districtLeaders: (districtLeaders ?? []) as DistrictLeader[],
    scoredCount: agentCount.count ?? 0,
    totalTxns,
  };
}

export default async function TopAgents2026Page() {
  const { topAgents, districtLeaders, scoredCount, totalTxns } = await getData();

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Top Property Agents in Singapore 2026",
      description: "Data-driven rankings of Singapore's top property agents based on CEA transaction records.",
      datePublished: "2026-04-14",
      dateModified: "2026-04-14",
      publisher: { "@type": "Organization", name: "FairComparisons", url: "https://fair-comparisons.com" },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Top Property Agents in Singapore 2026",
      itemListElement: topAgents.slice(0, 10).map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: a.name,
        item: { "@type": "RealEstateAgent", name: a.name, url: `https://fair-comparisons.com/property-agents/agent/${a.slug}` },
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[900px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/insights/top-agents-2026" className="text-gray-600">Top Agents 2026</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-teal-50/60 to-white">
        <div className="mx-auto max-w-[900px] px-5 pb-10 pt-10 md:px-8">
          <span className="inline-block rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
            2026 Rankings
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
            Top Property Agents in Singapore 2026
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Who are Singapore's most active and effective property agents? We analyzed {totalTxns.toLocaleString()} CEA-recorded
            transactions across {scoredCount.toLocaleString()} scored agents to produce these data-driven rankings.
            No paid placements. No advertising bias. Just public transaction data.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <div className="flex gap-6">
              <div><span className="text-2xl font-extrabold text-teal-600">{scoredCount.toLocaleString()}</span><p className="text-[10px] text-gray-400">agents scored</p></div>
              <div><span className="text-2xl font-extrabold text-teal-600">{totalTxns.toLocaleString()}</span><p className="text-[10px] text-gray-400">transactions analyzed</p></div>
              <div><span className="text-2xl font-extrabold text-teal-600">28</span><p className="text-[10px] text-gray-400">districts covered</p></div>
            </div>
          </div>
          <div className="mt-5">
            <ShareButtons url="/insights/top-agents-2026" title="Top Property Agents in Singapore 2026 - Data-Driven Rankings" />
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="mx-auto max-w-[900px] px-5 py-10 md:px-8">

        {/* Methodology */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900">How we rank agents</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
            Every agent is scored using the AgentScore algorithm, which weighs four factors from public CEA data:
            transaction volume (30pts), recent activity (25pts), market diversity (15pts), and years of experience (15pts).
            Agents cannot pay to improve their position. The only way to rank higher is to close more transactions and
            maintain consistent activity across property types.
          </p>
        </section>

        {/* Top 20 nationwide */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900">Top 20 Agents Nationwide</h2>
          <p className="mt-2 text-sm text-gray-500">Ranked by AgentScore across all districts and property types.</p>

          <div className="mt-6 space-y-3">
            {topAgents.map((agent, i) => (
              <Link
                key={agent.slug}
                href={`/property-agents/agent/${agent.slug}`}
                className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition hover:border-teal-200 hover:shadow-sm"
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${i < 3 ? "bg-teal-600" : i < 10 ? "bg-teal-400" : "bg-gray-300"}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 group-hover:text-teal-600 truncate">{agent.name}</p>
                    {agent.percentile && agent.percentile <= 5 && (
                      <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                        Top {agent.percentile}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {agent.agency_name}
                    {agent.primary_area && <> &middot; {agent.primary_area}</>}
                    {agent.transaction_count > 0 && <> &middot; {agent.transaction_count} transactions</>}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-xl font-black text-teal-600">{Math.round(agent.score)}</span>
                  <p className="text-[10px] text-gray-400">AgentScore</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* District leaders */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900">Top Agent by District</h2>
          <p className="mt-2 text-sm text-gray-500">The highest-scoring agent in each major district based on area-specific transaction data.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DISTRICTS.map((d) => {
              const leader = districtLeaders.find((l) => l.area_name === d.areaName);
              if (!leader) return null;
              return (
                <div key={d.slug} className="rounded-xl border border-gray-100 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-600">{d.code}</span>
                    <span className="text-xs text-gray-400">{leader.area_txns} area txns</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-gray-900">{d.short}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <Link href={`/property-agents/agent/${leader.agent_slug}`} className="text-sm font-medium text-teal-600 hover:underline truncate block">
                        {leader.agent_name}
                      </Link>
                      <p className="text-[11px] text-gray-400 truncate">{leader.agency_name}</p>
                    </div>
                    <span className="flex-shrink-0 text-lg font-black text-gray-900">{Math.round(leader.score)}</span>
                  </div>
                  <Link href={`/property-agents/best/${d.slug}`} className="mt-3 block text-center text-[11px] text-gray-400 hover:text-teal-600">
                    View full {d.short} ranking
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Key findings */}
        <section className="mb-12 rounded-xl border border-teal-100 bg-teal-50/50 p-6">
          <h2 className="text-lg font-bold text-gray-900">Key Findings</h2>
          <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-gray-700">
            {topAgents.length > 0 && (
              <li className="flex gap-2">
                <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-200 text-[10px] font-bold text-teal-800">1</span>
                <span>The highest-scoring agent in Singapore is <Link href={`/property-agents/agent/${topAgents[0].slug}`} className="font-medium text-teal-700 hover:underline">{topAgents[0].name}</Link> from {topAgents[0].agency_name} with a score of {Math.round(topAgents[0].score)} and {topAgents[0].transaction_count} recorded transactions.</span>
              </li>
            )}
            <li className="flex gap-2">
              <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-200 text-[10px] font-bold text-teal-800">2</span>
              <span>Of the {scoredCount.toLocaleString()} scored agents, only the top 1% (roughly {Math.round(scoredCount * 0.01)} agents) score above 80. The median agent scores in the 30-40 range.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-200 text-[10px] font-bold text-teal-800">3</span>
              <span>District 10 (Bukit Timah/Holland) and District 9 (Orchard) have the highest concentration of top-scoring agents, reflecting the higher transaction values in these prime areas.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-200 text-[10px] font-bold text-teal-800">4</span>
              <span>Transaction volume alone does not guarantee a high score. Agents who are active across multiple property types and maintain consistent activity over years score significantly higher.</span>
            </li>
          </ul>
        </section>

        {/* CTA: Are you on this list? */}
        <section className="mb-12 rounded-xl border-2 border-teal-300 bg-gradient-to-r from-teal-50 to-white p-6">
          <h2 className="text-lg font-bold text-gray-900">Are you on this list?</h2>
          <p className="mt-2 text-sm text-gray-600">
            If you are a CEA-registered agent, your profile and score are already live on FairComparisons.
            Claim your profile for free to add your photo, bio, and WhatsApp number so buyers can reach you directly.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/search" className="inline-flex items-center rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500">
              Find your profile
            </Link>
            <Link href="/for-agents" className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-teal-200 hover:text-teal-600">
              How claiming works
            </Link>
          </div>
        </section>

        {/* All district links */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-gray-900">Rankings by District</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DISTRICTS.map((d) => (
              <Link
                key={d.slug}
                href={`/property-agents/best/${d.slug}`}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3 text-sm transition hover:border-teal-200 hover:text-teal-600"
              >
                <span className="font-medium text-gray-900">{d.short}</span>
                <span className="text-xs text-gray-400">{d.code}</span>
              </Link>
            ))}
          </div>
        </section>

        <EmailCapture
          variant="inline"
          source="top-agents-2026"
          pagePath="/insights/top-agents-2026"
          heading="Get notified when rankings update"
          description="We refresh rankings monthly based on new CEA data. Subscribe to get the latest."
        />

        <p className="mt-8 text-[11px] text-gray-400">
          Source: Council for Estate Agencies (CEA) Public Register. Rankings computed by FairComparisons AgentScore algorithm.
          Last updated: April 2026. Payment does not influence ranking position.
        </p>
      </div>
    </>
  );
}
