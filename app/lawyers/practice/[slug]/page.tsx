import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: area } = await supabase
    .from("sg_practice_areas")
    .select("name, case_count, lawyer_count")
    .eq("slug", slug)
    .single();

  if (!area) return {};

  return {
    title: `${area.name} Lawyers in Singapore - ${area.case_count} Court Cases`,
    description: `Find Singapore lawyers specializing in ${area.name}. ${area.case_count} court cases and ${area.lawyer_count || 'multiple'} lawyers tracked. Based on eLitigation.sg court records.`,
    alternates: { canonical: `https://fair-comparisons.com/lawyers/practice/${slug}` },
  };
}

export async function generateStaticParams() {
  const { data } = await supabase
    .from("sg_practice_areas")
    .select("slug")
    .gte("case_count", 10)
    .order("case_count", { ascending: false })
    .limit(100);
  return (data ?? []).map(a => ({ slug: a.slug }));
}

export default async function PracticeAreaPage({ params }: Props) {
  const { slug } = await params;
  const { data: area } = await supabase.from("sg_practice_areas").select("*").eq("slug", slug).single();
  if (!area) notFound();

  // Get lawyers with this practice area
  const { data: lawyers } = await supabase
    .from("sg_lawyers")
    .select("name, slug, primary_firm, case_count, courts, first_case_year, last_case_year")
    .contains("practice_areas", [area.name])
    .order("case_count", { ascending: false })
    .limit(50);

  const lawyerList = lawyers ?? [];

  // Get top firms
  const firmCounts: Record<string, number> = {};
  for (const l of lawyerList) {
    if (l.primary_firm) firmCounts[l.primary_firm] = (firmCounts[l.primary_firm] || 0) + 1;
  }
  const topFirms = Object.entries(firmCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Get recent cases
  const { data: recentCases } = await supabase
    .from("sg_court_cases")
    .select("citation, case_name, court, year, decision_date")
    .contains("case_types", [area.name])
    .order("year", { ascending: false })
    .limit(10);

  // Get all practice areas for sidebar
  const { data: allAreas } = await supabase
    .from("sg_practice_areas")
    .select("name, slug, case_count")
    .gte("case_count", 10)
    .order("case_count", { ascending: false })
    .limit(25);

  const topLevel = area.name.split(' — ')[0];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How many ${topLevel} lawyers are there in Singapore?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Based on eLitigation.sg court records, ${lawyerList.length} lawyers have appeared in ${area.case_count} ${topLevel} cases in Singapore courts.${topFirms.length > 0 ? ` The most active firm is ${topFirms[0][0]} with ${topFirms[0][1]} lawyers handling these cases.` : ''}`,
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/lawyers" className="hover:text-gray-600">Lawyers</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">{topLevel}</span>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-coral-900 via-coral-800 to-coral-900">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8 md:py-20">
          <h1 className="text-3xl font-extrabold text-white md:text-4xl">{area.name}</h1>
          <p className="mt-3 max-w-xl text-lg text-white/60">
            {area.case_count} court cases - {lawyerList.length} lawyers tracked from eLitigation.sg records.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-8 md:px-8">
        <p className="text-[15px] leading-[1.75] text-gray-600">
          {area.name} is a practice area in Singapore law with {area.case_count} recorded court cases in our database.
          {lawyerList.length > 0 ? ` ${lawyerList.length} lawyers have appeared in these cases, ` : ""}
          {topFirms.length > 0 ? `with ${topFirms[0][0]} being the most active firm (${topFirms[0][1]} lawyers).` : ""}
          All data is sourced from publicly available judgments on eLitigation.sg.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-7">
          <div className="space-y-8 lg:col-span-5">
            {/* Top lawyers */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Lawyers with {topLevel} experience</h2>
              <div className="mt-4 space-y-2">
                {lawyerList.slice(0, 20).map((l, i) => (
                  <Link
                    key={l.slug}
                    href={`/lawyers/${l.slug}`}
                    className="group flex items-center gap-4 rounded-lg border border-gray-100 bg-white p-4 transition hover:border-coral-200 hover:shadow-sm"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                      i < 3 ? "bg-coral-500" : "bg-gray-400"
                    }`}>{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 group-hover:text-coral-600">{l.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {l.primary_firm} - {l.first_case_year}-{l.last_case_year}
                      </p>
                    </div>
                    <div className="flex flex-col items-center rounded-lg border border-coral-100 bg-coral-50 px-3 py-1.5">
                      <span className="text-lg font-extrabold text-coral-600">{l.case_count}</span>
                      <span className="text-[8px] uppercase tracking-widest text-gray-400">Cases</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Recent cases */}
            {(recentCases ?? []).length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Recent {topLevel} cases</h2>
                <div className="mt-4 space-y-2">
                  {(recentCases ?? []).map(c => (
                    <div key={c.citation} className="rounded-lg border border-gray-100 bg-white p-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.case_name}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{c.citation} - {c.court} - {c.decision_date}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:col-span-2">
            {topFirms.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Top Firms</h3>
                <div className="mt-3 space-y-2">
                  {topFirms.map(([firm, count]) => (
                    <div key={firm} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 truncate">{firm}</span>
                      <span className="text-gray-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Practice Areas</h3>
              <div className="mt-3 space-y-1">
                {(allAreas ?? []).filter(a => a.slug !== slug).slice(0, 15).map(a => (
                  <Link key={a.slug} href={`/lawyers/practice/${a.slug}`}
                    className="block text-sm text-gray-600 hover:text-coral-600 truncate">
                    {a.name.split(' — ')[0]} ({a.case_count})
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
