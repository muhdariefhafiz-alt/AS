import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: firm } = await supabase
    .from("sg_law_firms")
    .select("name, lawyer_count, case_count, practice_areas, first_case_year, last_case_year")
    .eq("slug", slug)
    .single();

  if (!firm) return {};

  const isThin = (firm.case_count ?? 0) < 5;
  return {
    title: `${firm.name} - Law Firm in Singapore`,
    description: `${firm.name}: ${firm.lawyer_count} lawyers, ${firm.case_count} court appearances (${firm.first_case_year}-${firm.last_case_year}). View lawyer profiles and case history from eLitigation.sg.`,
    alternates: { canonical: `https://fair-comparisons.com/lawyers/firm/${slug}` },
    ...(isThin && { robots: { index: false, follow: true } }),
  };
}

export async function generateStaticParams() {
  const { data } = await supabase
    .from("sg_law_firms")
    .select("slug")
    .gte("case_count", 5)
    .order("case_count", { ascending: false })
    .limit(300);
  return (data ?? []).map(f => ({ slug: f.slug }));
}

export default async function FirmPage({ params }: Props) {
  const { slug } = await params;
  const { data: firm } = await supabase.from("sg_law_firms").select("*").eq("slug", slug).single();
  if (!firm) notFound();

  // Get lawyers at this firm
  const { data: lawyers } = await supabase
    .from("sg_lawyers")
    .select("name, slug, case_count, practice_areas, courts, first_case_year, last_case_year")
    .eq("primary_firm", firm.name)
    .order("case_count", { ascending: false })
    .limit(100);

  const lawyerList = lawyers ?? [];
  const totalCases = lawyerList.reduce((sum, l) => sum + (l.case_count ?? 0), 0);
  const courts = [...new Set(lawyerList.flatMap(l => l.courts ?? []))];
  const allAreas = lawyerList.flatMap(l => (l.practice_areas ?? []).map((a: string) => a.split(' — ')[0]));
  const areaCounts: Record<string, number> = {};
  for (const a of allAreas) { if (a.length > 3) areaCounts[a] = (areaCounts[a] || 0) + 1; }
  const topAreas = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);

  const yearRange = firm.first_case_year && firm.last_case_year ? `${firm.first_case_year}-${firm.last_case_year}` : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    name: firm.name,
    address: { "@type": "PostalAddress", addressLocality: "Singapore", addressCountry: "SG" },
    numberOfEmployees: { "@type": "QuantitativeValue", value: firm.lawyer_count },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "Lawyers", item: "https://fair-comparisons.com/lawyers" },
      { "@type": "ListItem", position: 3, name: firm.name },
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
          <span className="text-gray-600">{firm.name}</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-slate-50/40 to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-8 pt-8 md:px-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">{firm.name}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {firm.lawyer_count} lawyers - {totalCases} court appearances {yearRange && `(${yearRange})`}
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-center">
              <span className="text-xl font-extrabold text-teal-600">{firm.lawyer_count}</span>
              <p className="text-[10px] text-gray-400">Lawyers</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-center">
              <span className="text-xl font-extrabold text-gray-900">{totalCases}</span>
              <p className="text-[10px] text-gray-400">Cases</p>
            </div>
            {courts.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-center">
                <span className="text-xl font-extrabold text-gray-900">{courts.length}</span>
                <p className="text-[10px] text-gray-400">Courts</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-8 md:px-8">
        <p className="text-[15px] leading-[1.75] text-gray-600">
          {firm.name} is a Singapore law firm with {firm.lawyer_count} lawyers tracked in our court records database.
          The firm has {totalCases} recorded court appearances across {courts.join(", ") || "Singapore courts"}
          {yearRange ? ` from ${firm.first_case_year} to ${firm.last_case_year}` : ""}.
          {topAreas.length > 0 ? ` Key practice areas include ${topAreas.slice(0, 3).map(a => a[0]).join(", ")}.` : ""}
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-7">
          <div className="space-y-8 lg:col-span-5">
            {/* Lawyers */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Lawyers ({lawyerList.length})</h2>
              <div className="mt-4 space-y-2">
                {lawyerList.map(l => (
                  <Link
                    key={l.slug}
                    href={`/lawyers/${l.slug}`}
                    className="group flex items-center justify-between rounded-lg border border-gray-100 bg-white p-4 transition hover:border-teal-200 hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 group-hover:text-teal-600">{l.name}</p>
                      <p className="mt-0.5 text-xs text-gray-400 truncate">
                        {(l.practice_areas ?? []).slice(0, 2).map((a: string) => a.split(' — ')[0]).join(", ")}
                        {l.first_case_year && l.last_case_year ? ` - ${l.first_case_year}-${l.last_case_year}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-center rounded-lg border border-teal-100 bg-teal-50 px-3 py-1.5">
                      <span className="text-lg font-extrabold text-teal-600">{l.case_count}</span>
                      <span className="text-[8px] uppercase tracking-widest text-gray-400">Cases</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:col-span-2">
            {topAreas.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Practice Areas</h3>
                <div className="mt-3 space-y-2">
                  {topAreas.slice(0, 10).map(([area, count]) => (
                    <div key={area} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 truncate">{area}</span>
                      <span className="text-gray-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {courts.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Courts</h3>
                <div className="mt-3 space-y-1">
                  {courts.map(c => (
                    <p key={c} className="text-sm text-gray-600">{c}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
              <p className="text-xs text-gray-500">
                Data from eLitigation.sg court records. Does not represent all lawyers at this firm,
                only those appearing in published court judgments.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
