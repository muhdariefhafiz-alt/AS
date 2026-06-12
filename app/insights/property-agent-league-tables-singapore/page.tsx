import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { HDB_TOWNS, townDisplayName } from "../../lib/hdbData";
import EmailCapture from "../../components/EmailCapture";
import SellCtaBand from "../../components/SellCtaBand";
import type { Metadata } from "next";

export const revalidate = 86400; // 24h; refreshed in-DB by the daily cron

const URL = "https://fair-comparisons.com/insights/property-agent-league-tables-singapore";
const TITLE = "Why the 'top producer' on the flyer may not have sold a flat in your block";

export const metadata: Metadata = {
  title: TITLE,
  description:
    "A study of CEA records: the top 20% of agents do 70% of home sales, concentration is highest in HDB resale not condos, and the busiest HDB agents are credited with sales across 23 of 26 towns at once. The league tables measure teams, not people.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Singapore's top property agents are teams, not people",
    description:
      "Top 20% of agents do 70% of home sales. The busiest HDB agents are credited across 23 of 26 towns at once. A study of 730,000 CEA transaction records.",
    url: URL,
    type: "article",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Singapore's top property agents are teams, not people",
    description:
      "Top 20% do 70% of home sales. The busiest HDB agents are credited with sales across 23 of 26 towns at once. The data.",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

type Seg = { seg: string; agents: number; sales: number; top1: number; top10: number; top20: number };
type Conc = {
  window_start: string;
  window_end: string;
  all: Seg;
  segments: Seg[];
  hdb_total_towns: number;
  top_hdb: {
    agents: number;
    median_deals: number;
    median_towns: number;
    median_top_town_share: number;
    single_town_dominant: number;
    spread_under30: number;
    max_towns: number;
  };
  parking: { max_month_resale: number; agentmonths_over12: number; agents_flagged: number };
};

const nf = (n: number) => (n ?? 0).toLocaleString("en-SG");

export default async function LeagueTablesStudy() {
  // Precomputed snapshot: the segment + town-spread aggregates scan the full
  // transaction table and exceed the anon API statement timeout, so they are
  // served from a cached single-row table refreshed by the daily cron.
  const { data: row } = await supabase
    .from("agent_concentration_stats")
    .select("data")
    .eq("id", 1)
    .single();
  const d = (row?.data ?? {}) as Conc;

  const all = d.all ?? ({ top20: 70, sales: 273099 } as Seg);
  const segs = d.segments ?? [];
  const th = d.top_hdb ?? ({} as Conc["top_hdb"]);
  const pk = d.parking ?? ({} as Conc["parking"]);
  const totalTowns = d.hdb_total_towns ?? 26;
  const wStart = d.window_start ?? "Jan 2017";
  const wEnd = d.window_end ?? "Mar 2026";

  const byName = (name: string) => segs.find((s) => s.seg === name);
  const hdb = byName("HDB resale");
  const condo = byName("Private resale (condo/EC)");

  const faqItems = [
    {
      q: "Are the 'top' property agents in Singapore actually the best?",
      a: `Not necessarily. The top end of the league tables is dominated by teams that log every member's deals under one leader's name. The busiest 1% of HDB resale agents are each credited with a median of ${th.median_deals} sales across ${th.median_towns} of Singapore's ${totalTowns} HDB towns, which no single person could personally close. A high deal count can reflect a team brand rather than an individual's work.`,
    },
    {
      q: "What does 'top producer' mean on an agent's marketing?",
      a: `It is a self-applied label, not a verified metric. There is no independent body that audits it. The public CEA transaction record is auditable, and it shows that the largest recorded volumes are spread so widely across the island that they are almost certainly team totals, not one person's sales.`,
    },
    {
      q: "Which property type has the most concentrated agent market?",
      a: `HDB resale, by a clear margin. The top 20% of agents handle ${hdb?.top20 ?? 72}% of HDB resale, more than in private condo and EC resale (${condo?.top20 ?? 61}%). If a small group were simply farming high-turnover condos, condo resale would be the most concentrated. It is the least, which points to team attribution in the HDB market rather than condo lead-farming.`,
    },
    {
      q: "How do I tell if an agent personally sells in my area?",
      a: `Look at their CEA transaction record for recent sales (not rentals) in your specific town or district. A genuine local specialist will show repeated recent sales in one or two areas. A name credited with deals across the whole island is usually a team. You can check any agent's record on FairComparisons before you sign.`,
    },
  ];

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Insights", item: "https://fair-comparisons.com/insights" },
        { "@type": "ListItem", position: 3, name: "Property Agent League Tables", item: URL },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: TITLE,
      description: metadata.description,
      datePublished: "2026-06-12",
      dateModified: "2026-06-12",
      author: { "@type": "Organization", name: "FairComparisons" },
      publisher: { "@type": "Organization", name: "FairComparisons" },
      isBasedOn: "CEA public salesperson transaction records",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  const townChips = HDB_TOWNS.slice(0, 10);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/insights" className="hover:text-gray-600">Insights</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">League tables</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-[var(--line-2)] bg-[var(--blue-wash)] px-3 py-1 text-xs font-semibold text-[var(--blue-deep)]">Agent Market Study</span>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
            Why the &ldquo;top producer&rdquo; on the flyer may not have sold a flat in your block
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            A small group of agents really does dominate Singapore&apos;s home sales. But when you break the CEA record
            down by property type and by town, the names at the very top are not lone star sellers or local specialists.
            They are teams, logging everyone&apos;s deals under one leader. Covering {wStart} to {wEnd}.
          </p>
        </div>
      </section>

      {/* Headline finding */}
      <div className="mx-auto max-w-[1120px] px-5 pt-8 md:px-8">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">The headline: the top 20% really do most of the selling</h2>
          <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
            Across {nf(all.sales)} recorded home sales, the busiest <strong>20% of agents account for about {all.top20}%</strong>{" "}
            of them. That much matches the intuition behind every &ldquo;top producer&rdquo; flyer. The interesting part is
            what happens when you ask <em>which</em> sales, and <em>who</em> the top names actually are. The answer
            undercuts the flyer. This is a companion to our{" "}
            <Link href="/insights/property-agent-statistics-singapore" className="font-medium text-[var(--blue)] underline">study of all 730,000 CEA transactions</Link>.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-10 lg:col-span-3">

            {/* Finding 1: concentration by segment */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">1. The concentration is not condo lead-farming</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                A common theory is that the top agents just farm leads in high-turnover condos. The data says the
                opposite. Concentration holds across every property type, and it is <strong>highest in HDB resale</strong>,
                the most commoditised market of all, and <strong>lowest in private condo and EC resale</strong>. If
                condo-farming were the story, condos would be the most concentrated. They are the least.
              </p>
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-2.5 font-semibold">Segment</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Recorded sales</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Top 1% do</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Top 20% do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segs.map((s) => (
                      <tr key={s.seg} className="border-t border-gray-100">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{s.seg}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{nf(s.sales)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{s.top1}%</td>
                        <td className="px-4 py-2.5 text-right font-bold tabular-nums text-gray-900">{s.top20}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-gray-400">
                Share of each segment&apos;s recorded sales handled by its busiest 1% and 20% of agents, {wStart} to {wEnd}.
              </p>
            </section>

            {/* Finding 2: the town-spread reveal */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">2. The busiest HDB agents are not local specialists</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                If the most concentrated market is HDB resale, are the top names just block specialists who farm one
                estate? No. We took the top 1% of HDB resale agents ({nf(th.agents)} of them) and looked at how spread
                their deals are by town. A genuine local specialist would dominate one or two towns. These do the
                opposite.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                  <div className="text-2xl font-extrabold text-gray-900">{nf(th.median_deals)}</div>
                  <div className="mt-1 text-[13px] leading-snug text-gray-500">median HDB resale deals each</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                  <div className="text-2xl font-extrabold text-gray-900">{th.median_towns} of {totalTowns}</div>
                  <div className="mt-1 text-[13px] leading-snug text-gray-500">HDB towns they sell in (median)</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                  <div className="text-2xl font-extrabold text-gray-900">{th.median_top_town_share}%</div>
                  <div className="mt-1 text-[13px] leading-snug text-gray-500">share in their single biggest town</div>
                </div>
              </div>
              <p className="mt-4 text-[15px] leading-[1.75] text-gray-600">
                The median top agent is credited with <strong>{nf(th.median_deals)} HDB resale deals across {th.median_towns} of {totalTowns} towns</strong>,
                with their biggest single town only <strong>{th.median_top_town_share}%</strong> of their volume. Only{" "}
                {th.single_town_dominant} of the {nf(th.agents)} do even half their deals in one town, while{" "}
                {th.spread_under30} of them spread so thin that no single town is even 30% of their record. At least one is
                credited with sales in all {th.max_towns} towns. No individual personally closes that many flats across the
                whole island.
              </p>
            </section>

            {/* Finding 3: the mechanism */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">3. The mechanism: teams logged under one name</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                Singapore agents work in teams, and a deal is often recorded under the team leader rather than the
                colleague who handled it. That is what the island-wide spread shows from the geography angle, and the
                calendar shows the same thing: the record contains a single agent with{" "}
                <strong>{pk.max_month_resale} HDB resale deals logged in one month</strong>, which is physically
                impossible for one person. {nf(pk.agentmonths_over12)} agent-months in the data exceed what an individual
                could close alone.
              </p>
              <p className="mt-3 text-[15px] leading-[1.75] text-gray-600">
                We handle this openly rather than hide it. Our{" "}
                <Link href="/how-we-score" className="font-medium text-[var(--blue)] underline">AgentScore</Link>{" "}
                caps implausible single-month volume so parked team deals cannot inflate a ranking, and any profile whose
                record contains such a month carries a visible <em>team-attributed volume</em> flag. The full method and
                its limits are on our{" "}
                <Link href="/trust" className="font-medium text-[var(--blue)] underline">trust and data page</Link>.
              </p>
            </section>

            {/* What it means */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">What this means if you are selling</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  A &ldquo;top producer&rdquo; badge or a high league-table rank often measures a team brand, not the
                  person who will actually handle your sale. The colleague who turns up at your flat may have a thin
                  personal record, even if the name on the sign is near the top of a leaderboard.
                </p>
                <p>
                  The fix is the same as always: judge on the record, in your area, recently. Ask how many homes{" "}
                  <em>this specific person</em> has sold in <em>your</em> town in the last year, not what the team
                  closed island-wide. You can check any agent&apos;s real CEA record{" "}
                  <Link href="/property-agents/check" className="font-medium text-[var(--blue)] underline">here</Link>, or{" "}
                  <Link href="/sell" className="font-medium text-[var(--blue)] underline">get a free shortlist</Link>{" "}
                  of the agents who genuinely sell properties like yours.
                </p>
              </div>
            </section>

            {/* FAQ */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Frequently asked questions</h2>
              <div className="mt-4 space-y-5">
                {faqItems.map((f, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-gray-900">{f.q}</h3>
                    <p className="mt-1.5 text-[15px] leading-[1.75] text-gray-600">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Compare in your area */}
            <div className="rounded-xl border border-[var(--line-2)] bg-[var(--blue-wash)] p-6">
              <h3 className="text-lg font-bold text-gray-900">See who actually sells in your town</h3>
              <p className="mt-2 text-[15px] text-gray-600">
                Every ranking is built on real CEA sale transactions in that area, recency-weighted, with team-attributed
                volume capped. Not on advertising.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {townChips.map((t) => (
                  <Link key={t.slug} href={`/property-agents/hdb/${t.slug}`}
                    className="rounded-lg border border-[var(--line-2)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--blue-deep)] transition hover:bg-[var(--blue-wash)]">
                    {townDisplayName(t.name)}
                  </Link>
                ))}
              </div>
            </div>

            {/* Methodology */}
            <section className="rounded-xl border border-gray-100 bg-gray-50 p-6">
              <h2 className="text-base font-bold text-gray-900">Methodology and caveats</h2>
              <div className="mt-2 space-y-3 text-[13px] leading-[1.7] text-gray-500">
                <p>
                  Based on the public CEA salesperson transaction records, {wStart} to {wEnd}. &ldquo;Home sales&rdquo;
                  means resale, new-sale and sub-sale transactions; rentals are excluded. Concentration is the share of a
                  segment&apos;s sales recorded by its busiest 1%, 10% and 20% of agents, counted only among agents with at
                  least one sale in that segment. Town spread is measured for the top 1% of HDB resale agents by volume.
                </p>
                <p>
                  Team attribution is the key caveat and the central point: because deals can be logged under a team
                  leader, a single name can carry volume that several people produced. We treat that as a signal to
                  surface, not a number to trust at face value, which is why high single-month volumes are capped in the
                  AgentScore and flagged on profiles. We set out every limitation on our{" "}
                  <Link href="/trust" className="font-medium text-[var(--blue)] underline">trust and data page</Link>.
                </p>
                <p>Source: CEA salesperson transaction records and public register. Analysis by FairComparisons.</p>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Key Numbers</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Top 20% do</dt><dd className="font-bold text-gray-900">{all.top20}% of sales</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Most concentrated</dt><dd className="font-bold text-gray-900">HDB resale ({hdb?.top20 ?? 72}%)</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Least concentrated</dt><dd className="font-bold text-gray-900">Condo resale ({condo?.top20 ?? 61}%)</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Top HDB agent reach</dt><dd className="font-bold text-gray-900">{th.median_towns} of {totalTowns} towns</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Worst single month</dt><dd className="font-bold text-gray-900">{pk.max_month_resale} resale deals</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border border-[var(--line-2)] bg-[var(--blue-wash)] p-5">
              <h3 className="text-sm font-bold text-gray-900">Read the full agent study</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                Why 66% of registered agents have no sale on file, and 63% of activity is rentals.
              </p>
              <Link href="/insights/property-agent-statistics-singapore" className="mt-3 inline-block text-sm font-semibold text-[var(--blue)]">Singapore property agent statistics &rarr;</Link>
            </div>

            <EmailCapture
              variant="sidebar"
              source="insight-league-tables"
              pagePath="/insights/property-agent-league-tables-singapore"
              heading="Get market insights"
              description="New data analyses and market reports delivered to your inbox."
            />

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">More Insights</h3>
              <div className="mt-3 space-y-2">
                <Link href="/insights/top-agents-2026" className="block text-sm text-gray-600 hover:text-[var(--blue)]">The actual top agents in Singapore</Link>
                <Link href="/insights/million-dollar-hdb" className="block text-sm text-gray-600 hover:text-[var(--blue)]">Million-Dollar HDB Tracker</Link>
                <Link href="/guides/how-to-choose-property-agent" className="block text-sm text-gray-600 hover:text-[var(--blue)]">How to choose a property agent</Link>
                <Link href="/trust" className="block text-sm text-gray-600 hover:text-[var(--blue)]">How we handle the data</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <SellCtaBand source="insight-league-tables" heading="Skip the league tables. Find who sells in your town." sub="Get a free shortlist of the agents who actually sell properties like yours, ranked on real CEA sale data with team-attributed volume capped." />
    </>
  );
}
