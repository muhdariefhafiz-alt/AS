import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { formatPrice } from "../../../lib/narrativeHelpers";
import EmailCapture from "../../../components/EmailCapture";
import type { Metadata } from "next";
import { seoTitle } from "../../../lib/seoTitle";

export const revalidate = false;
export const dynamicParams = false;

type Props = { params: Promise<{ year: string }> };

const VALID_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

export async function generateStaticParams() {
  return VALID_YEARS.map((y) => ({ year: y.toString() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  const y = parseInt(year);
  if (!VALID_YEARS.includes(y)) return {};
  return {
    title: seoTitle(`Singapore Property Market ${y}`),
    description: `Singapore property market review for ${y}. Private property and HDB resale transaction volumes, most active agents and agencies, and market trends. Based on URA and HDB data.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/market/${year}` },
  };
}

export default async function MarketYearPage({ params }: Props) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr);
  if (!VALID_YEARS.includes(year)) notFound();

  const prevYear = year - 1;
  const hasPrev = VALID_YEARS.includes(prevYear);

  // Date formats: private = MMYY (e.g. "0124"), HDB = YYYY-MM, agent = MMM-YYYY (e.g. "APR-2024")
  const yy = String(year).slice(2); // "24" for 2024
  const prevYy = String(prevYear).slice(2);
  const privateYearSuffixes = Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, "0")}${yy}`);
  const privatePrevSuffixes = Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, "0")}${prevYy}`);
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const agentYearDates = MONTHS.map((m) => `${m}-${year}`);

  const [
    privateCountRes,
    privatePrevCountRes,
    hdbCountRes,
    hdbPrevCountRes,
    topAgentsRes,
    districtRes,
  ] = await Promise.all([
    supabase
      .from("sg_private_transactions")
      .select("id", { count: "exact", head: true })
      .in("contract_date", privateYearSuffixes),
    hasPrev
      ? supabase
          .from("sg_private_transactions")
          .select("id", { count: "exact", head: true })
          .in("contract_date", privatePrevSuffixes)
      : Promise.resolve({ count: null }),
    supabase
      .from("sg_hdb_transactions")
      .select("id", { count: "exact", head: true })
      .gte("month", `${year}-01`)
      .lte("month", `${year}-12`),
    hasPrev
      ? supabase
          .from("sg_hdb_transactions")
          .select("id", { count: "exact", head: true })
          .gte("month", `${prevYear}-01`)
          .lte("month", `${prevYear}-12`)
      : Promise.resolve({ count: null }),
    // Top agents: filter by MMM-YYYY format
    supabase
      .from("sg_agent_transactions")
      .select("agent_name, agent_license, agency_name")
      .in("transaction_date", agentYearDates)
      .limit(10000),
    supabase.from("sg_districts").select("code, name, slug").not("slug", "is", null).order("code"),
  ]);

  const privateTxns = privateCountRes.count ?? 0;
  const privatePrevTxns = (privatePrevCountRes as { count: number | null }).count ?? 0;
  const hdbTxns = hdbCountRes.count ?? 0;
  const hdbPrevTxns = (hdbPrevCountRes as { count: number | null }).count ?? 0;
  const totalTxns = privateTxns + hdbTxns;
  const totalPrevTxns = privatePrevTxns + hdbPrevTxns;

  // Aggregate agent transactions
  const agentCounts: Record<string, { name: string; license: string; agency: string; count: number }> = {};
  for (const t of topAgentsRes.data ?? []) {
    const key = t.agent_license;
    if (!agentCounts[key]) {
      agentCounts[key] = { name: t.agent_name, license: t.agent_license, agency: t.agency_name ?? "", count: 0 };
    }
    agentCounts[key].count++;
  }
  const topAgents = Object.values(agentCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Aggregate by agency
  const agencyCounts: Record<string, { name: string; count: number }> = {};
  for (const t of topAgentsRes.data ?? []) {
    const key = t.agency_name ?? "Independent";
    if (!agencyCounts[key]) agencyCounts[key] = { name: key, count: 0 };
    agencyCounts[key].count++;
  }
  const topAgencies = Object.values(agencyCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const pctChange = (a: number, b: number) => {
    if (!b) return "N/A";
    const p = Math.round(((a - b) / b) * 100);
    return p > 0 ? `+${p}%` : `${p}%`;
  };

  const districts = districtRes.data ?? [];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How many property transactions were there in Singapore in ${year}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `In ${year}, there were ${totalTxns.toLocaleString()} recorded property transactions in Singapore, comprising ${privateTxns.toLocaleString()} private property transactions and ${hdbTxns.toLocaleString()} HDB resale transactions.${hasPrev && totalPrevTxns > 0 ? ` This is ${pctChange(totalTxns, totalPrevTxns)} compared to ${prevYear}.` : ""}`,
        },
      },
      ...(topAgents.length > 0
        ? [
            {
              "@type": "Question" as const,
              name: `Who were the most active property agents in Singapore in ${year}?`,
              acceptedAnswer: {
                "@type": "Answer" as const,
                text: `The most active property agent in ${year} was ${topAgents[0].name} from ${topAgents[0].agency} with ${topAgents[0].count} recorded transactions.`,
              },
            },
          ]
        : []),
    ],
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "Property Agents", item: "https://fair-comparisons.com/property-agents" },
      { "@type": "ListItem", position: 3, name: `Market ${year}` },
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
          <span className="text-gray-600">Market {year}</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8 md:py-20">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue)]">Market Overview</p>
          <h1 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
            Singapore Property Market {year}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-400">
            {totalTxns > 0
              ? `${totalTxns.toLocaleString()} property transactions recorded. Private sales, HDB resale, and agent activity based on official data.`
              : `Market overview for ${year} based on available transaction data.`}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{totalTxns.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">total transactions</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{privateTxns.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">private sales</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{hdbTxns.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">HDB resale</p>
            </div>
            {hasPrev && totalPrevTxns > 0 && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
                <p className={`text-2xl font-extrabold ${totalTxns >= totalPrevTxns ? "text-[var(--slate-2)]" : "text-red-300"}`}>
                  {pctChange(totalTxns, totalPrevTxns)}
                </p>
                <p className="mt-1 text-xs text-slate-500">vs {prevYear}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        {/* Definition block */}
        <p className="text-[15px] leading-[1.75] text-gray-600">
          {totalTxns > 0 ? (
            <>
              In {year}, Singapore&apos;s property market recorded {totalTxns.toLocaleString()} transactions across private property and HDB resale segments.
              {hasPrev && totalPrevTxns > 0 && ` This represents a ${pctChange(totalTxns, totalPrevTxns)} change compared to ${prevYear} (${totalPrevTxns.toLocaleString()} transactions).`}
              {` The private property segment accounted for ${privateTxns.toLocaleString()} sales while HDB resale saw ${hdbTxns.toLocaleString()} transactions.`}
              {topAgents.length > 0 && ` The most active agent was ${topAgents[0].name} (${topAgents[0].agency}) with ${topAgents[0].count} recorded transactions.`}
              {" All figures are based on URA and HDB transaction records."}
            </>
          ) : (
            <>Transaction data for {year} is being compiled from URA and HDB records.</>
          )}
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-7">
          <div className="space-y-10 lg:col-span-5">
            {/* Top agents */}
            {topAgents.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Most active agents in {year}</h2>
                <p className="mt-2 text-sm text-gray-500">Ranked by number of recorded transactions.</p>
                <div className="mt-4 space-y-2">
                  {topAgents.slice(0, 15).map((a, i) => (
                    <Link
                      key={a.license}
                      href={`/property-agents/agent/${a.license.toLowerCase()}`}
                      className="group flex items-center gap-4 rounded-lg border border-gray-100 bg-white p-4 transition hover:border-[var(--line-2)] hover:shadow-sm"
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-slate-600"
                      }`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 group-hover:text-[var(--blue)]">{a.name}</p>
                        <p className="text-xs text-gray-500 truncate">{a.agency}</p>
                      </div>
                      <div className="flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <span className="text-lg font-extrabold text-slate-700">{a.count}</span>
                        <span className="text-[8px] uppercase tracking-widest text-gray-400">Txns</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Top agencies */}
            {topAgencies.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Most active agencies in {year}</h2>
                <div className="mt-4 space-y-2">
                  {topAgencies.map((a) => {
                    const pct = topAgentsRes.data ? Math.round((a.count / topAgentsRes.data.length) * 100) : 0;
                    return (
                      <div key={a.name} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{a.name}</p>
                        </div>
                        <div className="w-24 h-2 rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-[var(--blue)]" style={{ width: `${Math.min(pct * 3, 100)}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-16 text-right">{a.count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* YoY comparison */}
            {hasPrev && totalPrevTxns > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">{year} vs {prevYear}</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Segment</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-900">{year}</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-900">{prevYear}</th>
                        <th className="pl-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3.5 pr-4 font-medium text-gray-900">Total</td>
                        <td className="px-4 py-3.5 text-center font-medium text-gray-900">{totalTxns.toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-center text-gray-600">{totalPrevTxns.toLocaleString()}</td>
                        <td className={`pl-4 py-3.5 text-center text-xs font-medium ${totalTxns >= totalPrevTxns ? "text-[var(--blue)]" : "text-red-600"}`}>
                          {pctChange(totalTxns, totalPrevTxns)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 pr-4 text-gray-700">Private sales</td>
                        <td className="px-4 py-3.5 text-center text-gray-900">{privateTxns.toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-center text-gray-600">{privatePrevTxns.toLocaleString()}</td>
                        <td className={`pl-4 py-3.5 text-center text-xs font-medium ${privateTxns >= privatePrevTxns ? "text-[var(--blue)]" : "text-red-600"}`}>
                          {pctChange(privateTxns, privatePrevTxns)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 pr-4 text-gray-700">HDB resale</td>
                        <td className="px-4 py-3.5 text-center text-gray-900">{hdbTxns.toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-center text-gray-600">{hdbPrevTxns.toLocaleString()}</td>
                        <td className={`pl-4 py-3.5 text-center text-xs font-medium ${hdbTxns >= hdbPrevTxns ? "text-[var(--blue)]" : "text-red-600"}`}>
                          {pctChange(hdbTxns, hdbPrevTxns)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Other years</h3>
              <div className="mt-3 space-y-1">
                {VALID_YEARS.filter((y) => y !== year).map((y) => (
                  <Link key={y} href={`/property-agents/market/${y}`}
                    className="block text-sm text-gray-600 hover:text-[var(--blue)]">
                    Market {y}
                  </Link>
                ))}
              </div>
            </div>

            <EmailCapture
              variant="sidebar"
              source="market-year"
              pagePath={`/property-agents/market/${yearStr}`}
              heading="Market updates"
              description="Get notified when new market data and annual reports are published."
            />

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Browse districts</h3>
              <div className="mt-3 space-y-1">
                {districts.slice(0, 10).map((d) => (
                  <Link key={d.code} href={`/property-agents/district/${d.slug}`}
                    className="block text-sm text-gray-600 hover:text-[var(--blue)] truncate">
                    {d.code} {d.name.split(",")[0]}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          Transaction data from URA (private property) and HDB (resale flats). Agent activity based on CEA transaction records.
          All figures reflect completed transactions, not listings.
        </p>
      </div>
    </>
  );
}
