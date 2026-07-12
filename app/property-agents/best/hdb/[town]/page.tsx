import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { HDB_TOWNS, townFromSlug, townDisplayName } from "../../../../lib/hdbData";
import { formatPrice } from "../../../../lib/narrativeHelpers";
import EmailCapture from "../../../../components/EmailCapture";
import AgentFlags from "../../../../components/AgentFlags";
import { seoTitle } from "../../../../lib/seoTitle";
import type { Metadata } from "next";

export const revalidate = 43200; // 12h; daily cron also force-revalidates
export const dynamicParams = false;
type Props = { params: Promise<{ town: string }> };

type TopAgent = {
  agent_name: string;
  agent_slug: string;
  cea_reg: string;
  agency_name: string;
  score: number;
  txn_count: number;
  primary_type: string;
  subscription_tier: string;
  flags: { t: string; pct?: number }[];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { town: slug } = await params;
  const town = townFromSlug(slug);
  if (!town) return {};
  const d = townDisplayName(town.name);
  return {
    title: seoTitle(`Best HDB Agents in ${d}`),
    description: `Top HDB property agents in ${d}, ranked by AgentScore based on CEA transaction records. Find the most experienced HDB agents active in ${d}.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/best/hdb/${slug}` },
  };
}

export async function generateStaticParams() {
  return HDB_TOWNS.map(t => ({ town: t.slug }));
}

export default async function BestHdbAgentsPage({ params }: Props) {
  const { town: slug } = await params;
  const town = townFromSlug(slug);
  if (!town) notFound();

  const display = townDisplayName(town.name);
  const { data: agents } = await supabase
    .from("sg_area_top_agents")
    .select("*")
    .eq("area_type", "town")
    .eq("area_name", town.name)
    .order("rank", { ascending: true })
    .limit(20);

  // Fetch subscription tiers for these agents
  const agentSlugs = (agents ?? []).map(a => a.agent_slug);
  const { data: tierData } = agentSlugs.length > 0
    ? await supabase.from("sg_agents").select("slug, subscription_tier, agent_flags").in("slug", agentSlugs)
    : { data: [] };
  const tierMap: Record<string, string> = {};
  const flagMap: Record<string, { t: string; pct?: number }[]> = {};
  (tierData ?? []).forEach((t: { slug: string; subscription_tier: string | null; agent_flags?: { t: string; pct?: number }[] }) => {
    tierMap[t.slug] = t.subscription_tier ?? "free";
    flagMap[t.slug] = t.agent_flags ?? [];
  });

  // Ranking is purely by AgentScore/rank — paid tiers never reorder the list.
  // (GetAgent model: rankings cannot be bought.)
  const topAgents = (agents ?? []).map((a): TopAgent => ({
    agent_name: a.agent_name, agent_slug: a.agent_slug, cea_reg: a.cea_reg,
    agency_name: a.agency_name, score: Number(a.score), txn_count: a.area_txns,
    primary_type: a.area_property_types || "",
    subscription_tier: tierMap[a.agent_slug] ?? "free",
    flags: flagMap[a.agent_slug] ?? [],
  }));

  // HDB market context
  const { data: hdbStats } = await supabase.rpc("get_hdb_town_stats", { t_name: town.name });
  const totalTxns = (hdbStats ?? []).reduce((s: number, r: { txns: number }) => s + Number(r.txns), 0);
  const fourRoom = (hdbStats ?? []).find((r: { flat_type: string }) => r.flat_type === "4 ROOM");
  const medianPrice = fourRoom ? Number(fourRoom.median_price) : 0;

  const schemas = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: `Best HDB Agents ${display}`, item: `https://fair-comparisons.com/property-agents/best/hdb/${slug}` },
    ]},
    ...(topAgents.length > 0 ? [{ "@context": "https://schema.org", "@type": "ItemList", name: `Best HDB Agents in ${display}`,
      itemListElement: topAgents.slice(0, 10).map((a, i) => ({
        "@type": "ListItem", position: i + 1, name: a.agent_name,
        item: { "@type": "RealEstateAgent", name: a.agent_name, url: `https://fair-comparisons.com/property-agents/agent/${a.agent_slug}` },
      })),
    }] : []),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">Best HDB Agents in {display}</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-8 pt-8 md:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full border border-[var(--line-2)] bg-[var(--blue-wash)] px-3 py-1 text-xs font-semibold text-[var(--blue-deep)]">HDB</span>
            <span className="inline-block rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500">
              Updated {new Date().toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
            Best HDB Agents in {display}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            {topAgents.length} agents ranked by AgentScore, based on HDB transaction records in {display}.
            {medianPrice > 0 && ` Median 4-room HDB price: ${formatPrice(medianPrice)}.`}
            {totalTxns > 0 && ` ${totalTxns.toLocaleString()} HDB resale transactions recorded.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/property-agents/compare" className="inline-flex items-center rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--blue-deep)]">
              Compare agents side by side
            </Link>
            <Link href="/search" className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-[var(--line-2)] hover:text-[var(--blue)]">
              Search by name
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <section>
              <h2 className="text-xl font-bold text-gray-900">Finding the Right HDB Agent in {display}</h2>
              <div className="mt-4 space-y-3 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  Choosing the right agent for an HDB transaction in {display} matters. The agent handles pricing,
                  negotiation, paperwork, and coordination with HDB. An experienced agent who knows {display} well
                  can price your flat competitively, identify serious buyers quickly, and navigate the resale process
                  without delays.
                </p>
                {topAgents.length >= 3 && (
                  <p>
                    The top-ranked HDB agent in {display} is <strong>{topAgents[0].agent_name}</strong> from{" "}
                    {topAgents[0].agency_name}, with {topAgents[0].txn_count} HDB transactions in this town and
                    an AgentScore of {Math.round(topAgents[0].score)}.
                    {topAgents[1] && ` ${topAgents[1].agent_name} (${topAgents[1].agency_name}) ranks second with ${topAgents[1].txn_count} transactions.`}
                  </p>
                )}
                <p>
                  These rankings are based on the Council for Estate Agencies (CEA) public register, which records
                  every completed property transaction by registered agents. AgentScore is calculated from public data only. There is no paid placement on FairComparisons: rankings reflect each agent&apos;s transaction record and cannot be bought.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">Top {Math.min(20, topAgents.length)} HDB Agents in {display}</h2>
              <div className="mt-4 space-y-3">
                {topAgents.map((a, i) => {
                  // No paid prominence — every agent gets identical treatment.
                  return (
                    <Link
                      key={a.cea_reg}
                      href={`/property-agents/agent/${a.agent_slug}`}
                      className="group flex items-center gap-4 rounded-xl bg-white p-4 transition hover:border-[var(--line-2)] hover:shadow-sm border border-gray-100"
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${
                        i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-[var(--blue)]"
                      }`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 group-hover:text-[var(--blue)]">{a.agent_name}</p>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{a.agency_name} · {a.txn_count} HDB transactions in {display}</p>
                        {a.flags.length > 0 && (
                          <div className="mt-1.5"><AgentFlags flags={a.flags} size="sm" /></div>
                        )}
                      </div>
                      <div className="flex flex-col items-center rounded-lg border border-[var(--line)] bg-[var(--blue-wash)] px-3 py-1.5">
                        <span className="text-lg font-extrabold text-[var(--blue)]">{Math.round(a.score)}</span>
                        <span className="text-[8px] uppercase tracking-widest text-gray-400">Score</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] text-gray-400">Source: CEA Public Register via data.gov.sg. AgentScore by FairComparisons.</p>
            </section>

            <EmailCapture
              variant="inline"
              source="best-hdb"
              pagePath={`/property-agents/best/hdb/${slug}`}
              heading={`Get updates for ${display} HDB`}
              description={`We'll notify you when HDB agent rankings change in ${display} or new resale data becomes available.`}
            />

            <section>
              <h2 className="text-xl font-bold text-gray-900">FAQ</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Who is the best HDB agent in {display}?</h3>
                  <p className="mt-1 text-[15px] leading-[1.75] text-gray-600">
                    {topAgents.length > 0
                      ? `Based on AgentScore, the highest-ranked HDB agent in ${display} is ${topAgents[0].agent_name} (${topAgents[0].agency_name}) with ${topAgents[0].txn_count} transactions and a score of ${Math.round(topAgents[0].score)}.`
                      : `We are still loading transaction data for ${display}. Check back soon.`}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">How much does an HDB flat cost in {display}?</h3>
                  <p className="mt-1 text-[15px] leading-[1.75] text-gray-600">
                    {medianPrice > 0
                      ? `The median 4-room HDB resale price in ${display} is ${formatPrice(medianPrice)}, based on ${totalTxns.toLocaleString()} transactions.`
                      : `Visit our ${display} HDB price analysis for detailed pricing data.`}
                    {" "}<Link href={`/property-agents/hdb/${slug}`} className="text-[var(--blue)] hover:underline">View full price analysis</Link>
                  </p>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">{display} HDB Market</h3>
              {medianPrice > 0 && <p className="mt-2 text-sm text-gray-600">4-room median: <strong>{formatPrice(medianPrice)}</strong></p>}
              {totalTxns > 0 && <p className="text-sm text-gray-500">{totalTxns.toLocaleString()} transactions</p>}
              <Link href={`/property-agents/hdb/${slug}`} className="mt-3 inline-block text-sm font-medium text-[var(--blue)] hover:text-[var(--blue-deep)]">
                View price analysis
              </Link>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Other Towns</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {HDB_TOWNS.filter(t => t.slug !== slug).slice(0, 10).map(t => (
                  <Link key={t.slug} href={`/property-agents/best/hdb/${t.slug}`}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition hover:border-[var(--line-2)] hover:text-[var(--blue)]">
                    {townDisplayName(t.name)}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Guides</h3>
              <div className="mt-3 space-y-2 text-sm">
                <Link href="/guides/how-to-choose-property-agent" className="block text-gray-600 hover:text-[var(--blue)]">How to choose a property agent</Link>
                <Link href="/guides/hdb-resale-process" className="block text-gray-600 hover:text-[var(--blue)]">HDB resale process explained</Link>
                <Link href="/guides/property-agent-commission" className="block text-gray-600 hover:text-[var(--blue)]">Property agent commission rates</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
