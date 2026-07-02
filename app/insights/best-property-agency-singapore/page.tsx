import Link from "next/link";
import { supabase } from "../../lib/supabase";
import EmailCapture from "../../components/EmailCapture";
import SellCtaBand from "../../components/SellCtaBand";
import type { Metadata } from "next";

export const revalidate = 86400; // 24h; the cache refreshes in-DB daily

const URL = "https://fair-comparisons.com/insights/best-property-agency-singapore";
const TITLE = "Which property agency is best in Singapore? The data says: not the biggest";

export const metadata: Metadata = {
  title: TITLE,
  description:
    "A CEA-record league table of Singapore's property agencies: home sales, rental share, and sales per selling agent. The biggest brands top the volume chart, but only about 1 in 6 of their agents recorded a home sale, and small focused agencies sell several times more per agent.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Singapore property agency league table, from the CEA record",
    description:
      "The biggest agencies win on volume, small focused agencies win per agent, and at every big brand most of the roster recorded no home sale at all.",
    url: URL,
    type: "article",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Which property agency is best in Singapore?",
    description:
      "CEA-record league table: sales volume, rental share, and sales per selling agent, by agency.",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

type Row = {
  agency_name: string;
  roster_agents: number;
  selling_agents: number;
  sales: number;
  seller_sales: number;
  rentals: number;
  pct_selling: number;
  per_agent: number;
  rental_pct: number;
  slug: string | null;
  google_rating: number | null;
  google_review_count: number | null;
};
type League = {
  window_start: string;
  window_end: string;
  totals: { agencies_with_sale: number; sales: number; rentals: number };
  by_sales: Row[];
  by_efficiency: Row[];
};

const nf = (n: number) => (n ?? 0).toLocaleString("en-SG");

function displayName(raw: string): string {
  // CEA agency names are shouty legal names; render them readable.
  return raw
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bPte\.? Ltd\.?$/i, "")
    .replace(/\bLlp$/i, "LLP")
    .trim();
}

function AgencyCell({ r }: { r: Row }) {
  const name = displayName(r.agency_name);
  return r.slug ? (
    <Link href={`/property-agents/agency/${r.slug}`} className="font-medium text-gray-900 hover:text-[var(--blue)]">
      {name}
    </Link>
  ) : (
    <span className="font-medium text-gray-900">{name}</span>
  );
}

export default async function AgencyLeaguePage() {
  const { data: row } = await supabase
    .from("agency_league_stats")
    .select("data, updated_at")
    .eq("id", 1)
    .single();
  const d = (row?.data ?? {}) as League;
  const refreshedAt = row?.updated_at ? String(row.updated_at).slice(0, 10) : "2026-07-02";

  const bySales = (d.by_sales ?? []).slice(0, 10);
  const byEff = (d.by_efficiency ?? []).slice(0, 10);
  const totals = d.totals ?? { agencies_with_sale: 0, sales: 0, rentals: 0 };
  const wStart = d.window_start ?? "Apr 2025";
  const wEnd = d.window_end ?? "Mar 2026";

  const top = bySales[0];
  const topEff = byEff[0];
  const bigFour = bySales.slice(0, 4);
  const avgBigPctSelling = bigFour.length
    ? Math.round(bigFour.reduce((s, r) => s + Number(r.pct_selling || 0), 0) / bigFour.length)
    : 0;
  const avgBigPerAgent = bigFour.length
    ? (bigFour.reduce((s, r) => s + Number(r.per_agent || 0), 0) / bigFour.length).toFixed(1)
    : "0";

  const faqItems = [
    {
      q: "Which property agency is best in Singapore?",
      a: `It depends on what "best" measures. By recorded home-sale volume (${wStart} to ${wEnd}), ${top ? displayName(top.agency_name) : "the largest brand"} leads with ${top ? nf(top.sales) : "the most"} recorded sales. By sales per selling agent, small focused agencies lead: ${topEff ? displayName(topEff.agency_name) : "the leader"} recorded ${topEff ? topEff.per_agent : "many"} home sales per selling agent, several times the large-brand average of about ${avgBigPerAgent}. There is no single "best agency": the productive unit in Singapore property is the individual agent, and every large roster contains mostly agents with no recorded home sale in the window.`,
    },
    {
      q: "Does a bigger agency sell my home faster?",
      a: `The CEA record does not support that assumption. At the four biggest brands, on average only about ${avgBigPctSelling}% of registered agents recorded even one home sale in the 12-month window, and rentals made up roughly ${bigFour.length ? Math.round(bigFour.reduce((s, r) => s + Number(r.rental_pct || 0), 0) / bigFour.length) : 0}% of their recorded activity. A big brand gives you a big roster, not necessarily a productive seller. What predicts your outcome is the individual agent's recent sale record in your area and property type.`,
    },
    {
      q: "How many property agencies are there in Singapore?",
      a: `Singapore has around 930 licensed agencies on the public register, but only ${nf(totals.agencies_with_sale)} recorded at least one home sale in the ${wStart} to ${wEnd} window, and only ${byEff.length >= 10 ? "about ten" : String(byEff.length)} recorded 100 or more. Most licensed agencies are small or focus on rentals and other work rather than home sales.`,
    },
    {
      q: "Should I pick the agency or the agent?",
      a: `The agent. Agency-level averages hide enormous spread: the same brand contains top sellers and thousands of agents with no recorded sale. Check the individual agent's CEA transaction record for recent sales in your town or district before signing. You can look up any agent's record for free on FairComparisons.`,
    },
  ];

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Insights", item: "https://fair-comparisons.com/insights" },
        { "@type": "ListItem", position: 3, name: "Property Agency League Table", item: URL },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: TITLE,
      description: metadata.description,
      datePublished: "2026-07-02",
      dateModified: refreshedAt,
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/insights" className="hover:text-gray-600">Insights</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">Agency league table</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-[var(--line-2)] bg-[var(--blue-wash)] px-3 py-1 text-xs font-semibold text-[var(--blue-deep)]">Agency Market Study</span>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
            Which property agency is best in Singapore? The data says: not the biggest
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            We built a league table of every agency in the CEA record, {wStart} to {wEnd}: home sales, rental share,
            and sales per selling agent. The volume chart and the productivity chart tell two different stories, and
            both undercut the idea that a famous brand is the safe choice.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 pt-8 md:px-8">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">The headline: volume and productivity crown different agencies</h2>
          <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
            Of roughly 930 licensed agencies, <strong>{nf(totals.agencies_with_sale)} recorded at least one home sale</strong>{" "}
            in the window, and only about ten recorded a hundred or more. The biggest brands dominate total volume, but
            at those same brands <strong>most registered agents recorded no home sale at all</strong>, and the majority
            of their recorded activity is rentals. Meanwhile a handful of small, sales-focused agencies close several
            times more homes per agent.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-10 lg:col-span-3">

            <section>
              <h2 className="text-xl font-bold text-gray-900">1. The volume league: scale, with an asterisk</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                Ranked by recorded home sales (resale, new sale and sub-sale; rentals excluded), the league looks the
                way the advertising suggests: the household names on top. The asterisk is in the last two columns.
                {top ? (
                  <> {displayName(top.agency_name)} leads with {nf(top.sales)} recorded sales, but only {top.pct_selling}%
                  of its {nf(top.roster_agents)} registered agents recorded even one home sale, and {top.rental_pct}% of
                  its recorded activity is rentals.</>
                ) : null}
              </p>
              <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-2.5 font-semibold">Agency</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Home sales</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Registered agents</th>
                      <th className="px-4 py-2.5 text-right font-semibold">% with a sale</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Rental share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySales.map((r) => (
                      <tr key={r.agency_name} className="border-t border-gray-100">
                        <td className="px-4 py-2.5"><AgencyCell r={r} /></td>
                        <td className="px-4 py-2.5 text-right font-bold tabular-nums text-gray-900">{nf(r.sales)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{nf(r.roster_agents)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{r.pct_selling}%</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{r.rental_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-gray-400">
                Top 10 agencies by recorded home sales, {wStart} to {wEnd}. &ldquo;% with a sale&rdquo; is the share of
                the agency&apos;s currently registered agents who recorded at least one home sale in the window.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">2. The productivity league: small and focused wins per head</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                Divide each agency&apos;s home sales by the number of its agents who actually sold, and the table turns
                upside down. Among agencies with at least 100 recorded sales,
                {topEff ? (
                  <> the leader is {displayName(topEff.agency_name)} at <strong>{topEff.per_agent} home sales per selling
                  agent</strong>,</>
                ) : null}{" "}
                while the four biggest brands average about {avgBigPerAgent}. Business model explains most of it: some
                small firms run salaried or tightly focused sales teams, while mega-agencies carry huge rosters of
                part-time and rental-focused agents.
              </p>
              <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-2.5 font-semibold">Agency</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Sales / selling agent</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Home sales</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Selling agents</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Seller-side</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byEff.map((r) => (
                      <tr key={r.agency_name} className="border-t border-gray-100">
                        <td className="px-4 py-2.5"><AgencyCell r={r} /></td>
                        <td className="px-4 py-2.5 text-right font-bold tabular-nums text-gray-900">{r.per_agent}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{nf(r.sales)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{nf(r.selling_agents)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{nf(r.seller_sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-gray-400">
                Agencies with at least 100 recorded home sales in the window, ranked by sales per selling agent.
                Only {byEff.length} agencies clear that 100-sale floor.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">3. What it means: pick the agent, not the logo</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  Both tables point the same way. An agency brand tells you almost nothing about the person who will
                  actually market your home, because every large roster is mostly agents with no recorded home sale in
                  the last year. The productive unit in this market is the individual agent, and the public CEA record
                  lets you judge that individual directly.
                </p>
                <p>
                  Before you sign with anyone, look up how many homes <em>that specific person</em> has sold recently in
                  your town and property type. You can{" "}
                  <Link href="/property-agents/check" className="font-medium text-[var(--blue)] underline">check any agent&apos;s record</Link>{" "}
                  for free, or <Link href="/sell" className="font-medium text-[var(--blue)] underline">get a shortlist</Link>{" "}
                  of the agents who genuinely sell properties like yours, whatever logo is on their card.
                </p>
              </div>
            </section>

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

            <section className="rounded-xl border border-gray-100 bg-gray-50 p-6">
              <h2 className="text-base font-bold text-gray-900">Methodology and caveats</h2>
              <div className="mt-2 space-y-3 text-[13px] leading-[1.7] text-gray-500">
                <p>
                  Based on the public CEA salesperson transaction records, {wStart} to {wEnd}. &ldquo;Home sales&rdquo;
                  means resale, new-sale and sub-sale records; rentals are counted separately. Records are per
                  salesperson per transaction side, not unique deals. Transactions are attributed to the agent&apos;s
                  current agency because the public record does not state the agency at transaction time; agents who
                  switched brands carry their record with them. The newest month in the record is typically still
                  filling due to CEA publication lag, which affects all agencies alike, so rankings hold while absolute
                  counts slightly understate. The productivity table applies a 100-sale floor so tiny samples cannot
                  top the list. All figures are recomputed from the live record; last refresh {refreshedAt}.
                </p>
                <p>Source: CEA salesperson transaction records and public register. Analysis by FairComparisons.</p>
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Key Numbers</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Agencies with a sale</dt><dd className="font-bold text-gray-900">{nf(totals.agencies_with_sale)} of ~930</dd></div>
                {top ? <div className="flex justify-between"><dt className="text-gray-500">Volume leader</dt><dd className="font-bold text-gray-900">{nf(top.sales)} sales</dd></div> : null}
                {top ? <div className="flex justify-between"><dt className="text-gray-500">...whose roster selling</dt><dd className="font-bold text-gray-900">{top.pct_selling}%</dd></div> : null}
                {topEff ? <div className="flex justify-between"><dt className="text-gray-500">Productivity leader</dt><dd className="font-bold text-gray-900">{topEff.per_agent} per agent</dd></div> : null}
                <div className="flex justify-between"><dt className="text-gray-500">Big-brand average</dt><dd className="font-bold text-gray-900">{avgBigPerAgent} per agent</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border border-[var(--line-2)] bg-[var(--blue-wash)] p-5">
              <h3 className="text-sm font-bold text-gray-900">Why the top names are teams</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                The companion study: the busiest individual agents are credited with sales across 23 of 26 HDB towns at
                once. League tables measure teams, not people.
              </p>
              <Link href="/insights/property-agent-league-tables-singapore" className="mt-3 inline-block text-sm font-semibold text-[var(--blue)]">Agent league tables &rarr;</Link>
            </div>

            <EmailCapture
              variant="sidebar"
              source="insight-agency-league"
              pagePath="/insights/best-property-agency-singapore"
              heading="Get market insights"
              description="New data analyses and market reports delivered to your inbox."
            />

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">More Insights</h3>
              <div className="mt-3 space-y-2">
                <Link href="/insights/property-agent-statistics-singapore" className="block text-sm text-gray-600 hover:text-[var(--blue)]">Singapore property agent statistics</Link>
                <Link href="/insights/top-agents-2026" className="block text-sm text-gray-600 hover:text-[var(--blue)]">The actual top agents in Singapore</Link>
                <Link href="/guides/how-to-choose-property-agent" className="block text-sm text-gray-600 hover:text-[var(--blue)]">How to choose a property agent</Link>
                <Link href="/trust" className="block text-sm text-gray-600 hover:text-[var(--blue)]">How we handle the data</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <SellCtaBand source="insight-agency-league" heading="Skip the logo. Find who actually sells in your area." sub="Get a free shortlist of the agents who genuinely sell properties like yours, ranked on real CEA sale data, whatever brand is on their card." />
    </>
  );
}
