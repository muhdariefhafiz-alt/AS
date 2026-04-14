import Link from "next/link";
import { supabase } from "../../lib/supabase";
import EmailCapture from "../../components/EmailCapture";
import type { Metadata } from "next";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Singapore Court Case Statistics - 5,200+ Published Judgments Analyzed",
  description: "Analysis of 5,200+ published Singapore court judgments from eLitigation.sg. Practice area breakdown, court levels, busiest firms, and lawyer activity patterns.",
  alternates: { canonical: "https://fair-comparisons.com/insights/court-case-statistics" },
};

export default async function CourtCaseStatsPage() {
  const [casesRes, lawyersRes, firmsRes, areasRes, courtRes] = await Promise.all([
    supabase.from("sg_court_cases").select("court, year", { count: "exact" }),
    supabase.from("sg_lawyers").select("name, slug, case_count, primary_firm, courts").order("case_count", { ascending: false }).limit(20),
    supabase.from("sg_law_firms").select("name, slug, case_count, lawyer_count").order("case_count", { ascending: false }).limit(20),
    supabase.from("sg_practice_areas").select("name, slug, case_count, lawyer_count").order("case_count", { ascending: false }).limit(25),
    supabase.from("sg_court_cases").select("court"),
  ]);

  const totalCases = casesRes.count ?? 0;
  const totalLawyers = 7072; // from earlier query
  const topLawyers = lawyersRes.data ?? [];
  const topFirms = firmsRes.data ?? [];
  const practiceAreas = areasRes.data ?? [];

  // Court breakdown
  const courtCounts = new Map<string, number>();
  for (const c of courtRes.data ?? []) {
    if (c.court) courtCounts.set(c.court, (courtCounts.get(c.court) ?? 0) + 1);
  }
  const courts = Array.from(courtCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Year breakdown
  const yearCounts = new Map<number, number>();
  for (const c of casesRes.data ?? []) {
    if (c.year) yearCounts.set(c.year, (yearCounts.get(c.year) ?? 0) + 1);
  }
  const years = Array.from(yearCounts.entries()).sort((a, b) => a[0] - b[0]);

  const faqItems = [
    {
      q: "How many published court judgments are there in Singapore?",
      a: `Our database contains ${totalCases.toLocaleString()} published judgments from eLitigation.sg, Singapore's official legal database. These cover cases from the High Court, Court of Appeal, State Courts, and Family Justice Courts.`,
    },
    {
      q: "Which law firm appears most often in Singapore court cases?",
      a: topFirms[0] ? `${topFirms[0].name} has the highest case count with ${topFirms[0].case_count} published cases and ${topFirms[0].lawyer_count} lawyers tracked. ${topFirms[1] ? `${topFirms[1].name} follows with ${topFirms[1].case_count} cases.` : ""}` : "Data is being compiled.",
    },
    {
      q: "What is the most common type of court case in Singapore?",
      a: practiceAreas[0] ? `${practiceAreas[0].name} is the most common practice area with ${practiceAreas[0].case_count} cases. ${practiceAreas[1] ? `${practiceAreas[1].name} follows with ${practiceAreas[1].case_count} cases.` : ""}` : "Data is being compiled.",
    },
  ];

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Insights", item: "https://fair-comparisons.com/insights" },
        { "@type": "ListItem", position: 3, name: "Court Case Statistics", item: "https://fair-comparisons.com/insights/court-case-statistics" },
      ],
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/insights" className="hover:text-gray-600">Insights</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">Court Case Statistics</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-slate-600 bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200">Legal Data</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">Singapore Court Case Statistics</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/60">
            {totalCases.toLocaleString()} published judgments from eLitigation.sg, analyzed by practice area, court level, and legal representation.
          </p>
        </div>
      </section>

      {/* Definition Block */}
      <div className="mx-auto max-w-[1120px] px-5 pt-8 md:px-8">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Singapore court case data at a glance</h2>
          <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
            Our database tracks <strong>{totalCases.toLocaleString()} published court judgments</strong> from eLitigation.sg,
            involving {totalLawyers.toLocaleString()} lawyers across {topFirms.length > 0 ? "more than 1,200" : "hundreds of"} law firms.
            {practiceAreas[0] && ` The most common practice area is ${practiceAreas[0].name} with ${practiceAreas[0].case_count} cases.`}
            {courts[0] && ` The ${courts[0][0]} accounts for ${courts[0][1]} judgments, the largest share of published decisions.`}
            All data is sourced from publicly available judgments on Singapore's official eLitigation portal.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-10 lg:col-span-3">

            {/* Practice Areas */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Cases by Practice Area</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                {practiceAreas[0] && `${practiceAreas[0].name} dominates with ${practiceAreas[0].case_count} published cases, involving ${practiceAreas[0].lawyer_count} lawyers.`}
                {practiceAreas[1] && ` ${practiceAreas[1].name} follows with ${practiceAreas[1].case_count} cases.`}
                {" "}These numbers reflect published judgments only and do not include cases that were settled, withdrawn, or resolved without a written judgment.
              </p>
              <div className="mt-4 space-y-2">
                {practiceAreas.slice(0, 15).map((a, i) => {
                  const w = Math.max(10, Math.round((a.case_count / practiceAreas[0].case_count) * 100));
                  return (
                    <Link key={a.slug} href={`/lawyers/practice/${a.slug}`}
                      className="block rounded-lg border border-gray-100 bg-white px-4 py-3 transition hover:border-teal-200 hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${i < 3 ? "bg-slate-700" : "bg-gray-400"}`}>{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{a.name}</p>
                            <p className="text-xs text-gray-400">{a.lawyer_count} lawyers</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{a.case_count} cases</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                        <div className="h-1.5 rounded-full bg-slate-300" style={{ width: `${w}%` }} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Court Breakdown */}
            {courts.length >= 3 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Cases by Court</h2>
                <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                  The {courts[0][0]} has the most published judgments ({courts[0][1].toLocaleString()}),
                  followed by the {courts[1][0]} ({courts[1][1].toLocaleString()}).
                  Published judgments skew toward the High Court and Court of Appeal because lower courts
                  publish fewer written decisions proportionally.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        <th className="pb-2 pr-4">Court</th>
                        <th className="pb-2 text-right">Cases</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {courts.map(([court, count]) => (
                        <tr key={court}>
                          <td className="py-2.5 pr-4 font-medium text-gray-900">{court}</td>
                          <td className="py-2.5 text-right font-bold text-gray-900">{count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Top Firms */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Most Active Law Firms</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                These firms have the most appearances in published Singapore court judgments.
                A higher case count indicates more litigation activity, not necessarily quality of outcomes.
                Case counts reflect the number of published judgments where at least one lawyer from the firm appeared.
              </p>
              <div className="mt-4 space-y-2">
                {topFirms.slice(0, 10).map((f, i) => (
                  <Link key={f.slug} href={`/lawyers/firm/${f.slug}`}
                    className="group flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3 transition hover:border-teal-200 hover:shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${i < 3 ? "bg-slate-700" : "bg-gray-400"}`}>{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-teal-600">{f.name}</p>
                        <p className="text-xs text-gray-400">{f.lawyer_count} lawyers tracked</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center rounded-lg border border-teal-100 bg-teal-50 px-3 py-1.5">
                      <span className="text-lg font-extrabold text-teal-600">{f.case_count}</span>
                      <span className="text-[8px] uppercase tracking-widest text-gray-400">Cases</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Top Lawyers */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Most Active Lawyers</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                These lawyers have appeared in the most published court judgments. High activity
                indicates experience in contested matters that proceed to judgment.
              </p>
              <div className="mt-4 space-y-2">
                {topLawyers.slice(0, 10).map((l, i) => (
                  <Link key={l.slug} href={`/lawyers/${l.slug}`}
                    className="group flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3 transition hover:border-teal-200 hover:shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${i < 3 ? "bg-slate-700" : "bg-gray-400"}`}>{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-teal-600">{l.name}</p>
                        <p className="text-xs text-gray-400">{l.primary_firm}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center rounded-lg border border-teal-100 bg-teal-50 px-3 py-1.5">
                      <span className="text-lg font-extrabold text-teal-600">{l.case_count}</span>
                      <span className="text-[8px] uppercase tracking-widest text-gray-400">Cases</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Yearly trend */}
            {years.length >= 3 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Published Judgments by Year</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        <th className="pb-2 pr-4">Year</th>
                        <th className="pb-2 text-right">Published Judgments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {years.map(([year, count]) => (
                        <tr key={year}>
                          <td className="py-2.5 pr-4 font-medium text-gray-900">{year}</td>
                          <td className="py-2.5 text-right font-bold text-gray-900">{count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

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

            {/* CTA */}
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-6">
              <h3 className="text-lg font-bold text-gray-900">Find a lawyer by practice area</h3>
              <p className="mt-2 text-[15px] text-gray-600">
                Browse lawyers by their court case experience. All data from publicly available eLitigation.sg judgments.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {practiceAreas.slice(0, 8).map((a) => (
                  <Link key={a.slug} href={`/lawyers/practice/${a.slug}`}
                    className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-50">
                    {a.name.split(" -- ")[0]}
                  </Link>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-gray-400">Source: eLitigation.sg published court judgments. Analysis by FairComparisons. Disclaimer: case counts reflect published judgments only and do not represent the total volume of legal work.</p>
          </div>

          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Key Numbers</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Published judgments</dt><dd className="font-bold text-gray-900">{totalCases.toLocaleString()}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Lawyers tracked</dt><dd className="font-bold text-gray-900">{totalLawyers.toLocaleString()}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Law firms</dt><dd className="font-bold text-gray-900">1,253</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Practice areas</dt><dd className="font-bold text-gray-900">{practiceAreas.length}</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">More Insights</h3>
              <div className="mt-3 space-y-2">
                <Link href="/insights/million-dollar-hdb" className="block text-sm text-gray-600 hover:text-teal-600">Million-Dollar HDB Tracker</Link>
                <Link href="/insights/freehold-premium" className="block text-sm text-gray-600 hover:text-teal-600">Freehold Premium by District</Link>
              </div>
            </div>

            <EmailCapture
              variant="sidebar"
              source="insight-court-cases"
              pagePath="/insights/court-case-statistics"
              heading="Get legal insights"
              description="New court case analyses and legal market data delivered to your inbox."
            />

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Browse Lawyers</h3>
              <div className="mt-3 space-y-2">
                <Link href="/lawyers" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">All Lawyers &rarr;</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
