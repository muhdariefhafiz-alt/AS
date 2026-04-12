import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: lawyer } = await supabase
    .from("sg_lawyers")
    .select("name, primary_firm, case_count, practice_areas, courts, first_case_year, last_case_year")
    .eq("slug", slug)
    .single();

  if (!lawyer) return {};

  const areas = (lawyer.practice_areas || []).slice(0, 3).map((a: string) => a.split(' — ')[0]).join(", ");
  const isThin = (lawyer.case_count ?? 0) < 3;

  return {
    title: `${lawyer.name} - Lawyer at ${lawyer.primary_firm || 'Singapore'}`,
    description: `${lawyer.name} at ${lawyer.primary_firm || 'Singapore'}. ${lawyer.case_count} court appearances (${lawyer.first_case_year}-${lawyer.last_case_year}). ${areas ? `Practice areas: ${areas}.` : ''} Based on eLitigation.sg court records.`,
    alternates: { canonical: `https://fair-comparisons.com/lawyers/${slug}` },
    ...(isThin && { robots: { index: false, follow: true } }),
  };
}

export async function generateStaticParams() {
  const { data } = await supabase
    .from("sg_lawyers")
    .select("slug")
    .gte("case_count", 3)
    .order("case_count", { ascending: false })
    .limit(500);
  return (data ?? []).map(l => ({ slug: l.slug }));
}

export default async function LawyerProfilePage({ params }: Props) {
  const { slug } = await params;
  const { data: lawyer } = await supabase.from("sg_lawyers").select("*").eq("slug", slug).single();
  if (!lawyer) notFound();

  // Get all case appearances
  const { data: appearances } = await supabase
    .from("sg_case_counsel")
    .select("citation, role, law_firm")
    .eq("lawyer_name", lawyer.name)
    .limit(200);

  // Get case details for each appearance
  const citations = [...new Set((appearances ?? []).map(a => a.citation))];
  const { data: cases } = citations.length > 0
    ? await supabase
        .from("sg_court_cases")
        .select("citation, case_name, court, year, decision_date, case_types, case_url")
        .in("citation", citations)
        .order("year", { ascending: false })
    : { data: [] };

  const caseList = cases ?? [];
  const courts = [...new Set(caseList.map(c => c.court).filter(Boolean))];
  const topAreas = getTopPracticeAreas(caseList);
  const firms = [...new Set((appearances ?? []).map(a => a.law_firm).filter(Boolean))];
  const roles = getRoleSummary(appearances ?? []);
  const yearRange = lawyer.first_case_year && lawyer.last_case_year
    ? `${lawyer.first_case_year}-${lawyer.last_case_year}` : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: lawyer.name,
    jobTitle: "Lawyer",
    ...(lawyer.primary_firm && { worksFor: { "@type": "Organization", name: lawyer.primary_firm } }),
    address: { "@type": "PostalAddress", addressLocality: "Singapore", addressCountry: "SG" },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "Lawyers", item: "https://fair-comparisons.com/lawyers" },
      { "@type": "ListItem", position: 3, name: lawyer.name },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/lawyers" className="hover:text-gray-600">Lawyers</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">{lawyer.name}</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-slate-50/40 to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-8 pt-8 md:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-xl font-bold text-teal-700">
              {lawyer.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">{lawyer.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {lawyer.primary_firm && (
                  <Link href={`/lawyers/firm/${firms.length > 0 ? slugify(lawyer.primary_firm) : ''}`} className="text-teal-600 hover:underline">
                    {lawyer.primary_firm}
                  </Link>
                )}
                {yearRange && <span className="ml-2 text-gray-400">Active {yearRange}</span>}
              </p>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-teal-200 bg-white px-4 py-3 shadow-sm">
              <span className="text-3xl font-extrabold text-teal-600">{lawyer.case_count}</span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Court Cases</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-8 md:px-8">
        {/* Definition block for AI SEO */}
        <p className="text-[15px] leading-[1.75] text-gray-600">
          {lawyer.name} is a Singapore-based lawyer {lawyer.primary_firm ? `at ${lawyer.primary_firm}` : ""} with {lawyer.case_count} recorded court appearances
          {yearRange ? ` between ${lawyer.first_case_year} and ${lawyer.last_case_year}` : ""}.
          {courts.length > 0 ? ` Active in ${courts.join(", ")}.` : ""}
          {topAreas.length > 0 ? ` Primary practice areas include ${topAreas.slice(0, 3).map(a => a.name).join(", ")}.` : ""}
          This profile is compiled from publicly available eLitigation.sg court records.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-7">
          <div className="space-y-8 lg:col-span-5">

            {/* Practice areas */}
            {topAreas.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Practice Areas</h2>
                <div className="mt-4 space-y-2">
                  {topAreas.map(area => (
                    <Link key={area.name} href={`/lawyers/practice/${slugify(area.name)}`}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 transition hover:border-teal-200 hover:bg-teal-50/30">
                      <span className="text-sm text-gray-700">{area.name}</span>
                      <span className="text-sm text-gray-400">{area.count} cases</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Role breakdown */}
            {roles.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Representation</h2>
                <p className="mt-2 text-sm text-gray-500">Who this lawyer typically represents in court:</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {roles.map(r => (
                    <span key={r.role} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
                      {r.role} ({r.count})
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Court appearances */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Court Appearances ({caseList.length})</h2>
              <div className="mt-4 space-y-2">
                {caseList.slice(0, 30).map(c => (
                  <div key={c.citation} className="rounded-lg border border-gray-100 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.case_name}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {c.citation} - {c.court} - {c.decision_date}
                        </p>
                        {c.case_types && c.case_types.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {c.case_types.filter((t: string) => !t.match(/^\d/) && t.length > 3).slice(0, 3).map((t: string) => (
                              <Link key={t} href={`/lawyers/practice/${slugify(t)}`} className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 hover:bg-teal-50 hover:text-teal-600">{t.split(' — ')[0]}</Link>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 rounded bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-600">{c.year}</span>
                    </div>
                  </div>
                ))}
                {caseList.length > 30 && (
                  <p className="text-center text-sm text-gray-400">Showing 30 of {caseList.length} cases</p>
                )}
              </div>
              <p className="mt-4 text-[11px] text-gray-400">Source: eLitigation.sg (Singapore Courts). Data compiled by FairComparisons.</p>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Profile</h3>
              <dl className="mt-3 space-y-3 text-sm">
                {lawyer.primary_firm && (
                  <div><dt className="text-gray-400">Firm</dt><dd className="font-medium text-gray-900">{lawyer.primary_firm}</dd></div>
                )}
                {courts.length > 0 && (
                  <div><dt className="text-gray-400">Courts</dt><dd className="font-medium text-gray-900">{courts.join(", ")}</dd></div>
                )}
                <div><dt className="text-gray-400">Cases</dt><dd className="font-medium text-gray-900">{lawyer.case_count}</dd></div>
                {yearRange && (
                  <div><dt className="text-gray-400">Active</dt><dd className="font-medium text-gray-900">{yearRange}</dd></div>
                )}
              </dl>
            </div>

            {firms.length > 1 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Firm History</h3>
                <div className="mt-3 space-y-1">
                  {firms.map(f => (
                    <p key={f} className="text-sm text-gray-600">{f}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Disclaimer</h3>
              <p className="mt-2 text-xs text-gray-500">
                This profile is compiled from publicly available court records on eLitigation.sg.
                It does not constitute a recommendation or endorsement. The number of court appearances
                does not indicate quality of legal services.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

// Helpers
function getTopPracticeAreas(cases: { case_types: string[] | null }[]): { name: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const c of cases) {
    for (const t of (c.case_types ?? [])) {
      const top = t.split(' — ')[0].trim();
      if (top.length > 3 && !top.match(/^\d/)) counts[top] = (counts[top] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
}

function getRoleSummary(appearances: { role: string | null }[]): { role: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const a of appearances) {
    if (a.role) {
      const clean = a.role.replace(/\s*\(.*$/, "").trim();
      if (clean.length > 1) counts[clean] = (counts[clean] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([role, count]) => ({ role, count }));
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}
