import Link from "next/link";
import { supabase } from "../lib/supabase";
import type { Metadata } from "next";
import WaitlistForm from "./WaitlistForm";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Compare Lawyers in Singapore - Court Record Analysis",
  description: "Singapore's first data-driven lawyer comparison. 5,204 court judgments, 7,072 lawyers, 1,253 law firms tracked from eLitigation.sg court records.",
  alternates: { canonical: "https://fair-comparisons.com/lawyers" },
};

export default async function LawyersHub() {
  const [lawyerCountRes, firmCountRes, caseCountRes, topLawyersRes, topFirmsRes, topAreasRes] = await Promise.all([
    supabase.from("sg_lawyers").select("id", { count: "exact", head: true }),
    supabase.from("sg_law_firms").select("id", { count: "exact", head: true }),
    supabase.from("sg_court_cases").select("id", { count: "exact", head: true }),
    supabase.from("sg_lawyers").select("name, slug, primary_firm, case_count").order("case_count", { ascending: false }).limit(10),
    supabase.from("sg_law_firms").select("name, slug, lawyer_count, case_count").order("case_count", { ascending: false }).limit(10),
    supabase.from("sg_practice_areas").select("name, slug, case_count, lawyer_count").gte("case_count", 10).order("case_count", { ascending: false }).limit(40),
  ]);

  const lawyerCount = lawyerCountRes.count ?? 7072;
  const firmCount = firmCountRes.count ?? 1253;
  const caseCount = caseCountRes.count ?? 5204;
  const topLawyers = topLawyersRes.data ?? [];
  const topFirms = topFirmsRes.data ?? [];

  // Deduplicate practice areas: group by top-level category, keep highest case_count
  const rawAreas = topAreasRes.data ?? [];
  const areaMap = new Map<string, typeof rawAreas[0]>();
  for (const a of rawAreas) {
    // Normalize: split on " — " or " - " to get top-level category
    const topLevel = a.name.split(/\s[—-]\s/)[0].trim();
    const existing = areaMap.get(topLevel);
    if (!existing || a.case_count > existing.case_count) {
      areaMap.set(topLevel, a);
    }
  }
  const topAreas = [...areaMap.values()]
    .sort((a, b) => b.case_count - a.case_count)
    .slice(0, 12);

  // Deduplicate firms by name
  const seenFirms = new Set<string>();
  const uniqueFirms = (topFirmsRes.data ?? []).filter(f => {
    if (seenFirms.has(f.name)) return false;
    seenFirms.add(f.name);
    return true;
  });

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-auto max-w-[1120px] px-5 py-16 md:px-8 md:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-400">Lawyer Comparison</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            {lawyerCount.toLocaleString()} lawyers.<br />
            <span className="text-teal-300">{caseCount.toLocaleString()} court cases.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-400">
            Singapore&apos;s first platform to track lawyers on actual court appearances.
            Every profile is built from eLitigation.sg public judgments. Not self-reported.
          </p>
          <div className="mt-8 flex flex-wrap gap-8 border-t border-white/10 pt-8">
            <div>
              <span className="text-2xl font-extrabold text-white">{lawyerCount.toLocaleString()}</span>
              <p className="text-xs text-slate-500">lawyers tracked</p>
            </div>
            <div>
              <span className="text-2xl font-extrabold text-white">{caseCount.toLocaleString()}</span>
              <p className="text-xs text-slate-500">court cases</p>
            </div>
            <div>
              <span className="text-2xl font-extrabold text-white">{firmCount.toLocaleString()}</span>
              <p className="text-xs text-slate-500">law firms</p>
            </div>
          </div>
        </div>
      </section>

      {/* Top lawyers */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-2xl font-bold text-gray-900">Most active lawyers</h2>
        <p className="mt-2 text-sm text-gray-500">Ranked by number of court appearances in published judgments.</p>
        <div className="mt-6 space-y-2">
          {topLawyers.map((l, i) => (
            <Link
              key={l.slug}
              href={`/lawyers/${l.slug}`}
              className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition hover:border-teal-200 hover:shadow-sm"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-slate-700"
              }`}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 group-hover:text-teal-600">{l.name}</p>
                <p className="text-xs text-gray-500 truncate">{l.primary_firm}</p>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                <span className="text-lg font-extrabold text-slate-700">{l.case_count}</span>
                <span className="text-[8px] uppercase tracking-widest text-gray-400">Cases</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Practice areas */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
          <h2 className="text-2xl font-bold text-gray-900">Browse by practice area</h2>
          <div className="mt-6 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {topAreas.map(a => {
              const displayName = a.name.split(/\s[—-]\s/)[0].trim();
              return (
                <Link key={a.slug} href={`/lawyers/practice/${a.slug}`}
                  className="group rounded-lg border border-gray-200 bg-white p-3 transition hover:border-teal-300 hover:shadow-sm">
                  <div className="text-sm font-medium text-gray-900 group-hover:text-teal-600 truncate">{displayName}</div>
                  <p className="mt-1 text-xs text-gray-400">{a.case_count} cases</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Top firms */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-2xl font-bold text-gray-900">Largest firms by court activity</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {uniqueFirms.map(f => (
            <Link key={f.slug} href={`/lawyers/firm/${f.slug}`}
              className="group rounded-lg border border-gray-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm">
              <div className="font-semibold text-gray-900 group-hover:text-teal-600">{f.name}</div>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>{f.lawyer_count} lawyers</span>
                <span>{f.case_count} cases</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Waitlist + lawyer interest */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[600px] px-5 py-14 md:px-8">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900">Get notified about updates</h2>
            <p className="mt-2 text-sm text-gray-500">
              We are adding LSRA registration data, more court records, and enhanced firm profiles.
            </p>
            <WaitlistForm />
          </div>

          <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-6 text-center">
            <p className="font-semibold text-gray-900">Are you a lawyer?</p>
            <p className="mt-1 text-sm text-gray-500">
              Your court appearances are in our database. Claim your profile to add contact details and practice description.
            </p>
            <WaitlistForm lawyerMode />
          </div>
        </div>
      </section>

      {/* Data source */}
      <section className="border-t border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-8 text-center md:px-8">
          <p className="text-xs text-gray-400">
            All data from eLitigation.sg (Singapore Courts). Court appearances do not indicate quality of legal services.
            This platform provides public record transparency, not recommendations.
          </p>
        </div>
      </section>
    </>
  );
}
