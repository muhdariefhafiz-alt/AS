import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "../../lib/supabase";
import { cleanAgency } from "../../lib/names";
import SellCtaBand from "../../components/SellCtaBand";

export const revalidate = 86400; // 24h

export const metadata: Metadata = {
  title: "Compare Singapore Property Agencies",
  description:
    "Compare Singapore's property agencies by size and Google rating: PropNex, ERA, Huttons, OrangeTee and more. See why the biggest agency is not the same as the best agent for your sale.",
  alternates: { canonical: "https://fair-comparisons.com/property-agents/agencies" },
};

type Agency = {
  name: string;
  slug: string;
  agent_count: number;
  google_rating: number | null;
  google_review_count: number | null;
};

// Popular head-to-head comparisons (slugs match the agency-compare routes).
const COMPARISONS: Array<{ a: string; b: string; aSlug: string; bSlug: string }> = [
  { a: "PropNex", b: "ERA", aSlug: "propnex-realty-pte-ltd", bSlug: "era-realty-network-pte-ltd" },
  { a: "PropNex", b: "Huttons", aSlug: "propnex-realty-pte-ltd", bSlug: "huttons-asia-pte-ltd" },
  { a: "ERA", b: "Huttons", aSlug: "era-realty-network-pte-ltd", bSlug: "huttons-asia-pte-ltd" },
  { a: "Huttons", b: "OrangeTee", aSlug: "huttons-asia-pte-ltd", bSlug: "orangetee-tie-pte-ltd" },
  { a: "PropNex", b: "OrangeTee", aSlug: "propnex-realty-pte-ltd", bSlug: "orangetee-tie-pte-ltd" },
  { a: "ERA", b: "OrangeTee", aSlug: "era-realty-network-pte-ltd", bSlug: "orangetee-tie-pte-ltd" },
];

type LeagueRow = {
  slug: string;
  agency_name: string;
  sales: number;
  seller_sales: number;
  rentals: number;
  per_agent: number;
  pct_selling: number;
  rental_pct: number;
  roster_agents: number;
  selling_agents: number;
  google_rating: number | null;
};
type LeagueData = {
  totals: { sales: number; rentals: number; agencies_with_sale: number };
  by_sales: LeagueRow[];
  by_efficiency: LeagueRow[];
  window_start: string;
  window_end: string;
};

export default async function AgenciesHubPage() {
  const [{ data }, { data: leagueRow }] = await Promise.all([
    supabase
      .from("sg_agencies")
      .select("name, slug, agent_count, google_rating, google_review_count")
      .not("agent_count", "is", null)
      .order("agent_count", { ascending: false })
      .limit(30),
    supabase.from("agency_league_stats").select("data").eq("id", 1).single(),
  ]);

  const agencies = (data ?? []) as Agency[];
  const league = (leagueRow?.data ?? null) as LeagueData | null;
  // Efficiency only means something with a real sample: a 3-agent shop with two
  // lucky deals is not "the most productive agency". Gate to agencies with
  // enough roster + volume so the per-agent figure is not statistical noise.
  const efficiencyLeague = (league?.by_efficiency ?? [])
    .filter((r) => r.roster_agents >= 10 && r.sales >= 50)
    .slice(0, 10);
  const salesLeague = (league?.by_sales ?? []).slice(0, 12);
  const biggest = agencies[0];
  const totalAgents = agencies.reduce((s, a) => s + (a.agent_count ?? 0), 0);

  const faqItems = [
    {
      q: "What is the biggest property agency in Singapore?",
      a: biggest
        ? `${cleanAgency(biggest.name)} is the largest property agency in Singapore by registered salespersons, with ${biggest.agent_count.toLocaleString()} agents. ERA and Huttons follow. Agency size reflects headcount, not how active or successful any individual agent is.`
        : "PropNex is the largest property agency in Singapore by number of registered salespersons, followed by ERA and Huttons.",
    },
    {
      q: "Does it matter which agency my property agent is from?",
      a: "Less than most people think. The agency is a brand and a support structure, but you hire an individual agent, and agent performance varies enormously within every agency. Our study of CEA transaction records found the median agent who sells closes about one home a year, so the right question is whether your specific agent has a strong, recent track record selling homes like yours, not which logo is on their name card.",
    },
    {
      q: "Is PropNex or ERA better?",
      a: "Both are large, established agencies with thousands of agents and similar Google ratings. There is no single 'better' agency for everyone. What matters is the individual agent you work with. You can compare PropNex and ERA head to head on agent count, AgentScore and reviews, then compare the actual agents within each.",
    },
    {
      q: "Are these agency rankings paid or sponsored?",
      a: "No. Agencies are listed by number of registered agents from the public CEA register, alongside their Google rating. Agencies cannot pay for placement, and FairComparisons takes no commission on any sale.",
    },
  ];

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Property Agents", item: "https://fair-comparisons.com/property-agents" },
        { "@type": "ListItem", position: 3, name: "Agencies", item: "https://fair-comparisons.com/property-agents/agencies" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: agencies.slice(0, 10).map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: cleanAgency(a.name),
        url: `https://fair-comparisons.com/property-agents/agency/${a.slug}`,
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
          <Link href="/property-agents" className="hover:text-gray-600">Property Agents</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">Agencies</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-[var(--line-2)] bg-[var(--blue-wash)] px-3 py-1 text-xs font-semibold text-[var(--blue-deep)]">Agencies</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Singapore Property Agencies</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Compare the major property agencies in Singapore by size and reputation: PropNex, ERA, Huttons, OrangeTee and more. Then go a level deeper and compare the individual agents who actually sell homes like yours.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-10 lg:col-span-3">

            {/* Lede / thesis */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">The biggest agency is not the same as the best agent</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                {biggest ? `${cleanAgency(biggest.name)} alone has ${biggest.agent_count.toLocaleString()} registered agents. ` : ""}
                Agency size tells you about headcount and brand, not about whether the specific agent you hire is any good. Performance varies enormously within every agency. Our{" "}
                <Link href="/insights/property-agent-statistics-singapore" className="font-medium text-[var(--blue)] underline">study of 730,000 CEA transactions</Link>{" "}
                found the median agent who sells closes about one home a year, so the agency logo matters far less than the individual agent&apos;s recent, area-specific sales record.
              </p>
            </div>

            {/* Agencies table */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Largest Property Agencies in Singapore</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                Ranked by number of registered salespersons on the public CEA register. Google ratings are shown with their review count, because a high rating from a handful of reviews is not comparable to one from hundreds.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      <th className="pb-2 pr-3">#</th>
                      <th className="pb-2 pr-3">Agency</th>
                      <th className="pb-2 pr-3 text-right">Agents</th>
                      <th className="pb-2 text-right">Google rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {agencies.map((a, i) => (
                      <tr key={a.slug}>
                        <td className="py-2.5 pr-3 text-gray-400">{i + 1}</td>
                        <td className="py-2.5 pr-3">
                          <Link href={`/property-agents/agency/${a.slug}`} className="font-medium text-[var(--blue)] hover:underline">{cleanAgency(a.name)}</Link>
                        </td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-gray-900">{a.agent_count.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-gray-600">
                          {a.google_rating && a.google_review_count
                            ? `${Number(a.google_rating).toFixed(1)} (${a.google_review_count.toLocaleString()})`
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-gray-400">Source: CEA public register (agent counts) and Google (ratings). {totalAgents.toLocaleString()} agents across the agencies shown.</p>
            </section>

            {salesLeague.length > 0 && league && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Which agencies actually sell the most homes?</h2>
                <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                  Headcount is not sales. This ranks agencies by transactions their agents actually closed over the 12 months to {league.window_end}, from CEA records. The seller-side column counts only deals where the agency represented the seller, the side that matters if you are the one selling.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        <th className="pb-2 pr-3">#</th>
                        <th className="pb-2 pr-3">Agency</th>
                        <th className="pb-2 pr-3 text-right">Sales</th>
                        <th className="pb-2 pr-3 text-right">Seller-side</th>
                        <th className="pb-2 text-right">Per agent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {salesLeague.map((r, i) => (
                        <tr key={r.slug}>
                          <td className="py-2.5 pr-3 text-gray-400">{i + 1}</td>
                          <td className="py-2.5 pr-3">
                            <Link href={`/property-agents/agency/${r.slug}`} className="font-medium text-[var(--blue)] hover:underline">{cleanAgency(r.agency_name)}</Link>
                          </td>
                          <td className="py-2.5 pr-3 text-right font-semibold text-gray-900">{r.sales.toLocaleString()}</td>
                          <td className="py-2.5 pr-3 text-right text-gray-600">{r.seller_sales.toLocaleString()}</td>
                          <td className="py-2.5 text-right text-gray-600">{r.per_agent.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">Source: CEA transaction records, {league.window_start} to {league.window_end}. &quot;Per agent&quot; is sales divided by the agency&apos;s full registered roster.</p>
              </section>
            )}

            {efficiencyLeague.length > 0 && league && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">The most productive agencies, per agent</h2>
                <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                  The same records, read a different way. Dividing sales by roster size shows how much of an agency&apos;s volume comes from a genuinely active bench rather than a large name. A smaller, specialist agency often works each deal harder than a household name. Shown for agencies with at least 10 registered agents and 50 sales, so the ratio is not a fluke of one or two deals.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        <th className="pb-2 pr-3">#</th>
                        <th className="pb-2 pr-3">Agency</th>
                        <th className="pb-2 pr-3 text-right">Sales / agent</th>
                        <th className="pb-2 pr-3 text-right">Sales</th>
                        <th className="pb-2 text-right">Agents</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {efficiencyLeague.map((r, i) => (
                        <tr key={r.slug}>
                          <td className="py-2.5 pr-3 text-gray-400">{i + 1}</td>
                          <td className="py-2.5 pr-3">
                            <Link href={`/property-agents/agency/${r.slug}`} className="font-medium text-[var(--blue)] hover:underline">{cleanAgency(r.agency_name)}</Link>
                          </td>
                          <td className="py-2.5 pr-3 text-right font-semibold text-gray-900">{r.per_agent.toFixed(1)}</td>
                          <td className="py-2.5 pr-3 text-right text-gray-600">{r.sales.toLocaleString()}</td>
                          <td className="py-2.5 text-right text-gray-600">{r.roster_agents.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">Source: CEA transaction records, {league.window_start} to {league.window_end}. Ratio is total sales divided by registered roster size; it favours smaller specialist agencies.</p>
              </section>
            )}

            {/* Popular comparisons */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Popular Agency Comparisons</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                Head-to-head on agent count, AgentScore, transaction volume and reviews.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {COMPARISONS.map((c) => (
                  <Link key={`${c.aSlug}-${c.bSlug}`} href={`/property-agents/agency-compare/${c.aSlug}-vs-${c.bSlug}`}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3 transition hover:border-[var(--line-2)] hover:shadow-sm">
                    <span className="text-sm font-medium text-gray-900">{c.a} vs {c.b}</span>
                    <span className="text-sm font-semibold text-[var(--blue)]">Compare &rarr;</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h2>
              <div className="mt-4 space-y-5">
                {faqItems.map((f, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-gray-900">{f.q}</h3>
                    <p className="mt-1.5 text-[15px] leading-[1.75] text-gray-600">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-[var(--line-2)] bg-[var(--blue-wash)] p-5">
              <h3 className="text-sm font-bold text-gray-900">Compare agents, not just agencies</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                The agency is the brand; the agent does the work. Rank the individual agents who actually sell in your area.
              </p>
              <Link href="/property-agents" className="mt-3 inline-block text-sm font-semibold text-[var(--blue)]">Browse agent rankings &rarr;</Link>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Related</h3>
              <div className="mt-3 space-y-2">
                <Link href="/insights/property-agent-statistics-singapore" className="block text-sm text-gray-600 hover:text-[var(--blue)]">Singapore agent statistics study</Link>
                <Link href="/guides/property-agent-commission" className="block text-sm text-gray-600 hover:text-[var(--blue)]">Property agent commission rates</Link>
                <Link href="/guides/how-to-choose-property-agent" className="block text-sm text-gray-600 hover:text-[var(--blue)]">How to choose an agent</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <SellCtaBand source="agencies-hub" heading="Skip the agency guesswork. Compare the agents who sell." sub="Get a free shortlist of the agents who actually sell properties like yours, ranked on real CEA transaction data, whichever agency they belong to." />
    </>
  );
}
