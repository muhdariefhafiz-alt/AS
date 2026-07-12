import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { seoTitle } from "../../../lib/seoTitle";
import EmailCapture from "../../../components/EmailCapture";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = true;

type Props = { params: Promise<{ pair: string }> };

const TOP_AGENCIES = [
  { slug: "propnex-realty-pte-ltd", short: "PropNex" },
  { slug: "era-realty-network-pte-ltd", short: "ERA" },
  { slug: "huttons-asia-pte-ltd", short: "Huttons" },
  { slug: "orangetee-tie-pte-ltd", short: "OrangeTee" },
  { slug: "sri-pte-ltd", short: "SRI" },
  { slug: "c-h-properties-pte-ltd", short: "C&H" },
  { slug: "sn-real-estate-pte-ltd", short: "SN Real Estate" },
  { slug: "century-21-pte-ltd", short: "Century 21" },
  { slug: "knight-frank-pte-ltd", short: "Knight Frank" },
  { slug: "plb-realty-pte-ltd", short: "PropertyLimBrothers" },
  { slug: "cbre-pte-ltd", short: "CBRE" },
  { slug: "realstar-premier-group-private-limited", short: "Realstar" },
  { slug: "mindlink-groups-pte-ltd", short: "Mindlink" },
  { slug: "jones-lang-lasalle-property-consultants-pte-ltd", short: "JLL" },
];

// Pre-render only the core (top-8 agency) pairs to keep deploy build time
// bounded. Pairs involving the long-tail agencies render on demand
// (dynamicParams=true) and cache thereafter, so all pairs stay reachable and in
// the sitemap without pre-building ~90 data-heavy pages on every deploy.
export async function generateStaticParams() {
  // Render all pairs on demand (dynamicParams=true) and cache thereafter.
  // Pre-generating these aggregation-heavy pages queries Supabase for every pair
  // during the deploy build, which times out static generation when the DB is
  // under concurrent build load. On-demand rendering hits the DB one page at a
  // time, off the critical build path. All pairs remain in the sitemap.
  return [];
}

function parseSlug(pair: string): { slugA: string; slugB: string } | null {
  const m = pair.match(/^(.+)-vs-(.+)$/);
  if (!m) return null;
  // Try to match against known agencies first
  for (const a of TOP_AGENCIES) {
    if (pair.startsWith(`${a.slug}-vs-`)) {
      const rest = pair.slice(`${a.slug}-vs-`.length);
      return { slugA: a.slug, slugB: rest };
    }
  }
  // Fallback: split on first -vs- occurrence
  const idx = pair.indexOf("-vs-");
  if (idx === -1) return null;
  return { slugA: pair.slice(0, idx), slugB: pair.slice(idx + 4) };
}

type AgencyData = {
  name: string;
  slug: string;
  license_number: string;
  agent_count: number;
  google_rating: number | null;
  google_review_count: number;
  address: string | null;
  website: string | null;
};

type AgencyMetrics = {
  scored_agents: number;
  avg_score: number;
  top_score: number;
  avg_txns: number;
  total_txns: number;
  top_agents: Array<{ name: string; slug: string; score: number; transaction_count: number }>;
  specialization_breakdown: Record<string, number>;
  area_breakdown: Record<string, number>;
};

async function getAgencyMetrics(agencyName: string, totalAgentCount: number): Promise<AgencyMetrics> {
  const { data: agents } = await supabase
    .from("sg_agents")
    .select("name, slug, score, transaction_count, specialization, primary_area")
    .eq("agency_name", agencyName)
    .not("score", "is", null)
    .order("score", { ascending: false })
    .limit(500);

  const list = agents ?? [];
  const scores = list.map((a) => Number(a.score)).filter((s) => s > 0);
  const totalTxns = list.reduce((s, a) => s + (a.transaction_count ?? 0), 0);

  const specBreakdown: Record<string, number> = {};
  const areaBreakdown: Record<string, number> = {};
  for (const a of list) {
    if (a.specialization) {
      const label = a.specialization
        .replace("CONDOMINIUM_APARTMENTS", "Condo")
        .replace("LANDED_PROPERTIES", "Landed")
        .replace("EXECUTIVE_CONDOMINIUM", "EC")
        .replace("HDB", "HDB");
      specBreakdown[label] = (specBreakdown[label] || 0) + 1;
    }
    if (a.primary_area) {
      areaBreakdown[a.primary_area] = (areaBreakdown[a.primary_area] || 0) + 1;
    }
  }

  // avg_txns based on ALL registered agents, not just scored ones
  const avgTxns = totalAgentCount > 0 ? Math.round((totalTxns / totalAgentCount) * 10) / 10 : 0;

  return {
    scored_agents: list.length,
    avg_score: scores.length > 0 ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 : 0,
    top_score: scores.length > 0 ? Math.round(Math.max(...scores)) : 0,
    avg_txns: avgTxns,
    total_txns: totalTxns,
    top_agents: list.slice(0, 5).map((a) => ({
      name: a.name,
      slug: a.slug,
      score: Math.round(Number(a.score)),
      transaction_count: a.transaction_count ?? 0,
    })),
    specialization_breakdown: specBreakdown,
    area_breakdown: areaBreakdown,
  };
}

function shortName(fullName: string): string {
  const known = TOP_AGENCIES.find((a) => fullName.toLowerCase().includes(a.short.toLowerCase()));
  if (known) return known.short;
  return fullName.split(" ").slice(0, 2).join(" ");
}

function pctDiff(a: number, b: number): string {
  if (!b) return "N/A";
  const p = Math.round(((a - b) / b) * 100);
  return p > 0 ? `+${p}%` : `${p}%`;
}

function winner(a: number, b: number): "a" | "b" | "tie" {
  if (a === 0 && b === 0) return "tie";
  if (Math.abs(a - b) < Math.max(a, b) * 0.03) return "tie";
  return a > b ? "a" : "b";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params;
  const parsed = parseSlug(pair);
  if (!parsed) return {};

  const [resA, resB] = await Promise.all([
    supabase.from("sg_agencies").select("name").eq("slug", parsed.slugA).single(),
    supabase.from("sg_agencies").select("name").eq("slug", parsed.slugB).single(),
  ]);

  if (!resA.data || !resB.data) return {};
  const a = shortName(resA.data.name);
  const b = shortName(resB.data.name);

  return {
    title: seoTitle(`${a} vs ${b}: Agency Comparison`),
    description: `${a} or ${b}? Compare both Singapore agencies on real CEA data: agent count, average AgentScore, transaction volume and top-performing agents. Decide on evidence, not advertising.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/agency-compare/${pair}` },
  };
}

export default async function AgencyComparePage({ params }: Props) {
  const { pair } = await params;
  const parsed = parseSlug(pair);
  if (!parsed) notFound();

  const [resA, resB] = await Promise.all([
    supabase.from("sg_agencies").select("*").eq("slug", parsed.slugA).single(),
    supabase.from("sg_agencies").select("*").eq("slug", parsed.slugB).single(),
  ]);

  if (!resA.data || !resB.data) notFound();
  const agencyA = resA.data as AgencyData;
  const agencyB = resB.data as AgencyData;

  const [metricsA, metricsB] = await Promise.all([
    getAgencyMetrics(agencyA.name, agencyA.agent_count),
    getAgencyMetrics(agencyB.name, agencyB.agent_count),
  ]);

  const nameA = shortName(agencyA.name);
  const nameB = shortName(agencyB.name);

  const metrics = [
    { label: "Registered agents", a: agencyA.agent_count, b: agencyB.agent_count, fmt: (n: number) => n.toLocaleString() },
    { label: "Scored agents", a: metricsA.scored_agents, b: metricsB.scored_agents, fmt: (n: number) => n.toLocaleString() },
    { label: "Average AgentScore", a: metricsA.avg_score, b: metricsB.avg_score, fmt: (n: number) => n.toFixed(1) },
    { label: "Highest AgentScore", a: metricsA.top_score, b: metricsB.top_score, fmt: (n: number) => String(n) },
    { label: "Total transactions", a: metricsA.total_txns, b: metricsB.total_txns, fmt: (n: number) => n.toLocaleString() },
    { label: "Avg transactions/agent", a: metricsA.avg_txns, b: metricsB.avg_txns, fmt: (n: number) => n.toFixed(1) },
    { label: "Google rating", a: Number(agencyA.google_rating ?? 0), b: Number(agencyB.google_rating ?? 0), fmt: (n: number) => n > 0 ? `${n.toFixed(1)} / 5` : "N/A" },
    { label: "Google reviews", a: agencyA.google_review_count ?? 0, b: agencyB.google_review_count ?? 0, fmt: (n: number) => n > 0 ? n.toLocaleString() : "N/A" },
  ];

  const biggerAgency = agencyA.agent_count > agencyB.agent_count ? nameA : nameB;
  const higherScore = metricsA.avg_score > metricsB.avg_score ? nameA : nameB;
  const moreTxns = metricsA.total_txns > metricsB.total_txns ? nameA : nameB;
  const scoreDiff = Math.abs(metricsA.avg_score - metricsB.avg_score);

  const topSpecsA = Object.entries(metricsA.specialization_breakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topSpecsB = Object.entries(metricsB.specialization_breakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topAreasA = Object.entries(metricsA.area_breakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topAreasB = Object.entries(metricsB.area_breakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is ${nameA} or ${nameB} better?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: scoreDiff > 2
            ? `Based on AgentScore data, ${higherScore} agents have a higher average score (${metricsA.avg_score > metricsB.avg_score ? metricsA.avg_score : metricsB.avg_score}/100) compared to ${metricsA.avg_score > metricsB.avg_score ? nameB : nameA} (${metricsA.avg_score > metricsB.avg_score ? metricsB.avg_score : metricsA.avg_score}/100). However, both agencies have top performers scoring ${Math.max(metricsA.top_score, metricsB.top_score)}/100. The best agent for you depends on your specific property type and district.`
            : `${nameA} and ${nameB} have similar average AgentScores (${metricsA.avg_score} vs ${metricsB.avg_score}). ${biggerAgency} is the larger agency with more agents. The best agent for you depends on your specific property type, district, and transaction needs.`,
        },
      },
      {
        "@type": "Question",
        name: `How many agents does ${nameA} have vs ${nameB}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${nameA} has ${agencyA.agent_count.toLocaleString()} registered agents while ${nameB} has ${agencyB.agent_count.toLocaleString()}. Of those, ${metricsA.scored_agents.toLocaleString()} ${nameA} agents and ${metricsB.scored_agents.toLocaleString()} ${nameB} agents have enough transaction data to receive an AgentScore.`,
        },
      },
      {
        "@type": "Question",
        name: `Are these rankings paid or sponsored?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. FairComparisons rankings are calculated from CEA transaction records, URA data, and Google reviews. Agencies cannot pay for a higher position. All data is sourced from public government records.",
        },
      },
    ],
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "Property Agents", item: "https://fair-comparisons.com/property-agents" },
      { "@type": "ListItem", position: 3, name: `${nameA} vs ${nameB}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/property-agents" className="hover:text-gray-600">Property Agents</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">{nameA} vs {nameB}</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[var(--ink)] via-[var(--ink-2)] to-[var(--ink)]">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8 md:py-20">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--slate-2)]">Agency Comparison</p>
          <h1 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
            {nameA} vs {nameB}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--slate-2)]">
            Head-to-head comparison based on CEA transaction records, AgentScore data, and Google reviews.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/property-agents/compare" className="inline-flex items-center rounded-lg bg-[var(--blue)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--blue)]">
              Compare top agents from both
            </Link>
            <Link href="/search" className="inline-flex items-center rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10">
              Search agents by name
            </Link>
          </div>

          {/* Quick stats */}
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{agencyA.agent_count.toLocaleString()}</p>
              <p className="mt-1 text-xs text-[var(--slate-2)]">{nameA} agents</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{agencyB.agent_count.toLocaleString()}</p>
              <p className="mt-1 text-xs text-[var(--slate-2)]">{nameB} agents</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-[var(--slate-2)]">{metricsA.avg_score}</p>
              <p className="mt-1 text-xs text-[var(--slate-2)]">{nameA} avg score</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-[var(--slate-2)]">{metricsB.avg_score}</p>
              <p className="mt-1 text-xs text-[var(--slate-2)]">{nameB} avg score</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        {/* Definition block */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Which agency is better, {nameA} or {nameB}?</h2>
          <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
            {biggerAgency} is the larger agency with {Math.max(agencyA.agent_count, agencyB.agent_count).toLocaleString()} registered agents,
            compared to {Math.min(agencyA.agent_count, agencyB.agent_count).toLocaleString()} at {agencyA.agent_count > agencyB.agent_count ? nameB : nameA}.
            {scoreDiff > 2
              ? ` ${higherScore} agents score higher on average (${metricsA.avg_score > metricsB.avg_score ? metricsA.avg_score : metricsB.avg_score} vs ${metricsA.avg_score > metricsB.avg_score ? metricsB.avg_score : metricsA.avg_score} out of 100).`
              : ` Both agencies have similar average AgentScores, meaning agent quality is comparable at the aggregate level.`}
            {` ${moreTxns} agents have completed more total transactions (${Math.max(metricsA.total_txns, metricsB.total_txns).toLocaleString()}).`}
            {" The right agency depends on your property type, location, and whether you need a specialist or generalist agent."}
          </p>
        </div>

        {/* Comparison table */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900">{nameA} vs {nameB} by the numbers</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Metric</th>
                  <th className="px-4 py-3 text-center">
                    <Link href={`/property-agents/agency/${agencyA.slug}`} className="font-semibold text-[var(--blue)] hover:underline">{nameA}</Link>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <Link href={`/property-agents/agency/${agencyB.slug}`} className="font-semibold text-[var(--blue)] hover:underline">{nameB}</Link>
                  </th>
                  <th className="pl-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.map((m) => {
                  const w = winner(m.a, m.b);
                  return (
                    <tr key={m.label}>
                      <td className="py-3.5 pr-4 text-gray-700">{m.label}</td>
                      <td className={`px-4 py-3.5 text-center font-medium ${w === "a" ? "text-[var(--blue)]" : "text-gray-600"}`}>
                        {m.fmt(m.a)}
                      </td>
                      <td className={`px-4 py-3.5 text-center font-medium ${w === "b" ? "text-[var(--blue)]" : "text-gray-600"}`}>
                        {m.fmt(m.b)}
                      </td>
                      <td className="pl-4 py-3.5 text-center text-xs text-gray-400">
                        {m.a > 0 && m.b > 0 ? pctDiff(m.a, m.b) : "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top agents */}
        <section className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Top {nameA} agents</h3>
            <div className="mt-3 space-y-2">
              {metricsA.top_agents.map((a, i) => (
                <Link key={a.slug} href={`/property-agents/agent/${a.slug}`}
                  className="group flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 transition hover:border-[var(--line-2)]">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${i < 3 ? "bg-[var(--blue)]" : "bg-gray-400"}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-[var(--blue)] truncate">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.transaction_count} transactions</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--blue-wash)] text-xs font-bold text-[var(--blue)]">{a.score}</div>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Top {nameB} agents</h3>
            <div className="mt-3 space-y-2">
              {metricsB.top_agents.map((a, i) => (
                <Link key={a.slug} href={`/property-agents/agent/${a.slug}`}
                  className="group flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 transition hover:border-[var(--line-2)]">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${i < 3 ? "bg-[var(--blue)]" : "bg-gray-400"}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-[var(--blue)] truncate">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.transaction_count} transactions</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--blue-wash)] text-xs font-bold text-[var(--blue)]">{a.score}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Specialization breakdown */}
        {(topSpecsA.length > 0 || topSpecsB.length > 0) && (
          <section className="mt-10 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{nameA} specializations</h3>
              <div className="mt-3 space-y-2">
                {topSpecsA.map(([spec, count]) => {
                  const pct = Math.round((count / metricsA.scored_agents) * 100);
                  return (
                    <div key={spec} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-700">{spec}</span>
                          <span className="text-gray-400">{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-[var(--blue)]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{nameB} specializations</h3>
              <div className="mt-3 space-y-2">
                {topSpecsB.map(([spec, count]) => {
                  const pct = Math.round((count / metricsB.scored_agents) * 100);
                  return (
                    <div key={spec} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-700">{spec}</span>
                          <span className="text-gray-400">{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-[var(--blue)]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Area coverage */}
        {(topAreasA.length > 0 || topAreasB.length > 0) && (
          <section className="mt-10 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{nameA} top areas</h3>
              <div className="mt-3 space-y-1.5">
                {topAreasA.map(([area, count]) => (
                  <div key={area} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-2.5">
                    <span className="text-sm text-gray-700">{area}</span>
                    <span className="text-xs text-gray-400">{count} agents</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{nameB} top areas</h3>
              <div className="mt-3 space-y-1.5">
                {topAreasB.map(([area, count]) => (
                  <div key={area} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-2.5">
                    <span className="text-sm text-gray-700">{area}</span>
                    <span className="text-xs text-gray-400">{count} agents</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA - Find the right agent */}
        <section className="mt-10 rounded-xl border-2 border-[var(--line-2)] bg-gradient-to-r from-[var(--blue-wash)] to-white p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900">Deciding between {nameA} and {nameB}? Compare their agents directly.</h2>
          <p className="mt-2 text-[15px] text-gray-600">
            Aggregate numbers only tell part of the story. The agent you work with matters more than the agency name.
            Compare top agents from {nameA} and {nameB} side by side on transaction history, area expertise, and AgentScore to find the right fit.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/property-agents/compare" className="inline-flex items-center rounded-lg bg-[var(--blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--blue-deep)]">
              Compare agents
            </Link>
            <Link href="/search" className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:border-[var(--line-2)] hover:text-[var(--blue)]">
              Search agents
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900">FAQ</h2>
          <div className="mt-4 space-y-5">
            {(faqLd.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>).map((q, i) => (
              <div key={i}>
                <h3 className="font-semibold text-gray-900">{q.name}</h3>
                <p className="mt-1.5 text-[15px] leading-[1.75] text-gray-600">{q.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Email capture */}
        <div className="mt-10">
          <EmailCapture
            variant="inline"
            source="agency-compare"
            pagePath={`/property-agents/agency-compare/${pair}`}
            heading={`Comparing ${nameA} and ${nameB}?`}
            description="Get notified when we update agency data, agent rankings, or add new comparison metrics."
          />
        </div>

        {/* Other comparisons */}
        <section className="mt-10 border-t border-gray-100 pt-8">
          <h2 className="text-xl font-bold text-gray-900">More agency comparisons</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {TOP_AGENCIES
              .filter((a) => a.slug !== agencyA.slug && a.slug !== agencyB.slug)
              .flatMap((other) => {
                const pairA = agencyA.slug < other.slug ? `${agencyA.slug}-vs-${other.slug}` : `${other.slug}-vs-${agencyA.slug}`;
                const pairB = agencyB.slug < other.slug ? `${agencyB.slug}-vs-${other.slug}` : `${other.slug}-vs-${agencyB.slug}`;
                return [
                  { pair: pairA, label: `${nameA} vs ${other.short}` },
                  { pair: pairB, label: `${nameB} vs ${other.short}` },
                ];
              })
              .slice(0, 6)
              .map((item) => (
                <Link
                  key={item.pair}
                  href={`/property-agents/agency-compare/${item.pair}`}
                  className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 transition hover:border-[var(--line-2)] hover:text-[var(--blue)]"
                >
                  {item.label}
                </Link>
              ))}
          </div>
        </section>

        <p className="mt-8 text-xs text-gray-400">
          All data from CEA (Council for Estate Agencies) Public Register and URA transaction records.
          Rankings are calculated, not purchased. This comparison is for informational purposes only.
        </p>
      </div>
    </>
  );
}
