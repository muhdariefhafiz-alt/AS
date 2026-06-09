import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { HDB_TOWNS, townDisplayName } from "../../lib/hdbData";
import EmailCapture from "../../components/EmailCapture";
import SellCtaBand from "../../components/SellCtaBand";
import type { Metadata } from "next";

export const revalidate = 86400; // 24h; study refreshes as the dataset grows

export const metadata: Metadata = {
  title: "Singapore Property Agent Statistics: What 730,000 Transactions Reveal",
  description:
    "A study of Singapore's property agents from CEA transaction records. 66% of registered agents have no transaction on file, 63% of activity is rentals not sales, and the top 20% handle 70% of home sales.",
  alternates: { canonical: "https://fair-comparisons.com/insights/property-agent-statistics-singapore" },
};

type Study = {
  register_total: number;
  ever_transacted: number;
  register_matched: number;
  active_24_25: number;
  total_txns: number;
  rental_rows: number;
  sale_rows: number;
  min_date: string;
  max_date: string;
  all_top1: number;
  all_top5: number;
  all_top10: number;
  all_top20: number;
  median_active: number;
  agents_who_sold: number;
  total_sales: number;
  sales_top1: number;
  sales_top10: number;
  sales_top20: number;
  sales_median: number;
};

const MONTHS: Record<string, string> = {
  JAN: "January", FEB: "February", MAR: "March", APR: "April", MAY: "May", JUN: "June",
  JUL: "July", AUG: "August", SEP: "September", OCT: "October", NOV: "November", DEC: "December",
};
function fmtMonthYear(s: string | null): string {
  if (!s) return "";
  const [mon, yr] = s.split("-");
  return `${MONTHS[mon?.toUpperCase()] ?? mon} ${yr}`;
}
const pct = (num: number, den: number) => (den > 0 ? Math.round(((num ?? 0) / den) * 100) : 0);
const nf = (n: number) => (n ?? 0).toLocaleString("en-SG");

export default async function PropertyAgentStatisticsPage() {
  // Read the precomputed snapshot (refreshed by the daily cron). The underlying
  // aggregate scans 730k rows, which exceeds the anon API statement timeout, so
  // we serve it from a cached single-row table.
  const { data: row } = await supabase
    .from("agent_market_stats")
    .select("data")
    .eq("id", 1)
    .single();
  const d = ((row?.data ?? {}) as Study);

  const withRecordPct = pct(d.register_matched, d.register_total);
  const noRecordPct = 100 - withRecordPct;
  const active2425Pct = pct(d.active_24_25, d.register_total);
  const everSoldPct = pct(d.agents_who_sold, d.register_total);
  const rentalPct = pct(d.rental_rows, d.total_txns);
  const salePct = 100 - rentalPct;
  const windowStart = fmtMonthYear(d.min_date);
  const windowEnd = fmtMonthYear(d.max_date);

  const concentration = [
    { label: "Top 1% of active agents", share: d.all_top1 },
    { label: "Top 5% of active agents", share: d.all_top5 },
    { label: "Top 10% of active agents", share: d.all_top10 },
    { label: "Top 20% of active agents", share: d.all_top20 },
  ];

  const faqItems = [
    {
      q: "How many property agents are there in Singapore?",
      a: `There are ${nf(d.register_total)} property salespersons in our dataset, sourced from the public CEA register. However, only ${nf(d.register_matched)} of them (about ${withRecordPct}%) appear in the public CEA transaction record between ${windowStart} and ${windowEnd}. The remaining ${noRecordPct}% have no transaction on file for that period.`,
    },
    {
      q: "What percentage of property agents actually sell homes?",
      a: `Only ${nf(d.agents_who_sold)} agents (about ${everSoldPct}% of the register) have recorded at least one property sale in the CEA data we cover. Among those who do sell, the median agent recorded just ${d.sales_median} sales across roughly eight and a half years, or about one a year.`,
    },
    {
      q: "Do property agents in Singapore mostly sell or rent?",
      a: `Most agent activity is rental, not sales. Of the ${nf(d.total_txns)} transactions analysed, ${rentalPct}% are rentals and only ${salePct}% are sales. A high transaction count therefore does not mean an agent regularly sells homes, which is why a count alone is a poor way to choose a selling agent.`,
    },
    {
      q: "How concentrated is the property agent market?",
      a: `Very concentrated. Among agents who transact, the top 20% handle ${d.all_top20}% of all deals and the top 5% handle ${d.all_top5}%. For home sales specifically, the top 10% of selling agents account for ${d.sales_top10}% of all recorded sales.`,
    },
  ];

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Insights", item: "https://fair-comparisons.com/insights" },
        { "@type": "ListItem", position: 3, name: "Property Agent Statistics", item: "https://fair-comparisons.com/insights/property-agent-statistics-singapore" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Singapore Property Agent Statistics: What 730,000 Transactions Reveal",
      description: metadata.description,
      datePublished: "2026-06-09",
      dateModified: "2026-06-09",
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
          <span className="text-gray-600">Property Agent Statistics</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-[var(--line-2)] bg-[var(--blue-wash)] px-3 py-1 text-xs font-semibold text-[var(--blue-deep)]">Agent Market Study</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Singapore Property Agent Statistics</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            What {nf(d.total_txns)} CEA transaction records reveal about Singapore&apos;s {nf(d.register_total)} property
            agents: how many actually transact, how concentrated the market is, and why a high deal count rarely means an
            agent sells homes. Covering {windowStart} to {windowEnd}.
          </p>
        </div>
      </section>

      {/* Lede / headline finding */}
      <div className="mx-auto max-w-[1120px] px-5 pt-8 md:px-8">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">The headline: most registered agents barely transact</h2>
          <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
            Singapore has <strong>{nf(d.register_total)} property salespersons</strong> on the public CEA register. Yet only{" "}
            <strong>{nf(d.register_matched)} of them (about {withRecordPct}%)</strong> appear anywhere in the public CEA
            transaction record between {windowStart} and {windowEnd}. Just <strong>{nf(d.active_24_25)} ({active2425Pct}% of the register)</strong>{" "}
            recorded a transaction in 2024 or 2025. The market runs on a small, active minority, and the headline agent count
            tells you almost nothing about who actually closes deals.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-10 lg:col-span-3">

            {/* Finding 1 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">1. A small minority does most of the work</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                Among the {nf(d.ever_transacted)} agents who do transact, activity is heavily concentrated. The busiest{" "}
                <strong>20% of agents handle {d.all_top20}%</strong> of all recorded deals. The top 5% alone handle{" "}
                {d.all_top5}%, and the single busiest 1% handle {d.all_top1}%. The median active agent recorded{" "}
                {d.median_active} transactions across the whole {windowStart} to {windowEnd} window, roughly two to
                three a year.
              </p>
              <div className="mt-4 space-y-2.5">
                {concentration.map((c) => (
                  <div key={c.label} className="rounded-lg border border-gray-100 bg-white px-4 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{c.label}</span>
                      <span className="font-bold text-gray-900">{c.share}% of all deals</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-[var(--blue)]" style={{ width: `${Math.min(c.share, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Finding 2 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">2. Most agent activity is renting, not selling</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                Of the {nf(d.total_txns)} transactions in the record, <strong>{rentalPct}% are rentals</strong> and only{" "}
                <strong>{salePct}% are sales</strong> ({nf(d.sale_rows)} sale transactions). That matters for a home seller:
                an agent with an impressive total deal count may be running a high-volume rental practice and rarely sell a
                home like yours. It is the reason our{" "}
                <Link href="/how-we-score" className="font-medium text-[var(--blue)] underline">AgentScore</Link>{" "}
                weights sales more heavily than rentals rather than treating every transaction as equal.
              </p>
            </section>

            {/* Finding 3 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">3. Even among agents who sell, output is thin</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                Only <strong>{nf(d.agents_who_sold)} agents</strong>, about {everSoldPct}% of the register, have
                recorded even a single property sale. Among those who do, the <strong>median agent recorded {d.sales_median} sales</strong>{" "}
                across roughly eight and a half years: about one a year. Home sales are concentrated even more tightly than
                rentals: the top 10% of selling agents account for <strong>{d.sales_top10}%</strong> of all recorded sales, and
                the top 20% account for <strong>{d.sales_top20}%</strong>.
              </p>
            </section>

            {/* What it means */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">What this means if you are selling</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  The takeaway is not that most agents are bad. It is that &ldquo;registered agent&rdquo; and &ldquo;agent who
                  regularly sells homes like yours&rdquo; are very different things, and the gap is enormous. A referral or a
                  glossy profile tells you nothing about an agent&rsquo;s actual sales record.
                </p>
                <p>
                  The fix is to compare on the record, not the marketing. Look at how many <em>sales</em> (not rentals) an
                  agent has closed, in <em>your</em> area, recently. That is exactly what{" "}
                  <Link href="/property-agents" className="font-medium text-[var(--blue)] underline">our agent rankings</Link>{" "}
                  are built on, and you can{" "}
                  <Link href="/sell" className="font-medium text-[var(--blue)] underline">get a free shortlist</Link>{" "}
                  of the agents who actually sell properties like yours.
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
              <h3 className="text-lg font-bold text-gray-900">See the agents who actually sell in your area</h3>
              <p className="mt-2 text-[15px] text-gray-600">
                Every ranking below is built on real CEA sale transactions, recency-weighted, not on advertising.
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
                  Figures are derived from {nf(d.total_txns)} salesperson transaction records published by the Council for
                  Estate Agencies (CEA), covering {windowStart} to {windowEnd}, joined to the public CEA salesperson register
                  ({nf(d.register_total)} salespersons in our dataset). &ldquo;No transaction on file&rdquo; means a registered
                  salesperson does not appear in the published CEA transaction record for this window; it does not prove zero
                  activity, since records are published with a lag and some arrangements may not surface in the per-salesperson
                  record.
                </p>
                <p>
                  Rentals include both landlord-side and tenant-side representation; sales include HDB resale and private
                  resale and new-sale transactions as classified in the source data. Concentration figures (top 1/5/10/20%)
                  are calculated only across agents who recorded at least one transaction in the window, so they understate
                  concentration relative to the full register. This is observational data, not a judgement of any individual
                  agent. Agents can request corrections against the official record on their profile page.
                </p>
                <p>Source: CEA salesperson transaction records and public register. Analysis by FairComparisons.</p>
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Key Numbers</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Agents on register</dt><dd className="font-bold text-gray-900">{nf(d.register_total)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">With any record</dt><dd className="font-bold text-gray-900">{withRecordPct}%</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Active in 2024-25</dt><dd className="font-bold text-gray-900">{active2425Pct}%</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Activity that is rentals</dt><dd className="font-bold text-gray-900">{rentalPct}%</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Sales by top 20%</dt><dd className="font-bold text-gray-900">{d.sales_top20}%</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border border-[var(--line-2)] bg-[var(--blue-wash)] p-5">
              <h3 className="text-sm font-bold text-gray-900">See the actual top agents</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                We rank every CEA-registered agent on real sale transactions, not advertising.
              </p>
              <Link href="/insights/top-agents-2026" className="mt-3 inline-block text-sm font-semibold text-[var(--blue)]">Top agents in Singapore &rarr;</Link>
            </div>

            <EmailCapture
              variant="sidebar"
              source="insight-agent-stats"
              pagePath="/insights/property-agent-statistics-singapore"
              heading="Get market insights"
              description="New data analyses and market reports delivered to your inbox."
            />

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">More Insights</h3>
              <div className="mt-3 space-y-2">
                <Link href="/insights/million-dollar-hdb" className="block text-sm text-gray-600 hover:text-[var(--blue)]">Million-Dollar HDB Tracker</Link>
                <Link href="/insights/freehold-premium" className="block text-sm text-gray-600 hover:text-[var(--blue)]">Freehold Premium by District</Link>
                <Link href="/how-we-score" className="block text-sm text-gray-600 hover:text-[var(--blue)]">How AgentScore works</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <SellCtaBand source="insight-agent-stats" heading="Most agents barely sell. Find the ones who do." sub="Get a free shortlist of the agents who actually sell properties like yours, ranked on the same CEA transaction data behind this study." />
    </>
  );
}
