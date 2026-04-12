import Link from "next/link";
import { supabase } from "../lib/supabase";
import type { Metadata } from "next";
import WaitlistForm from "./WaitlistForm";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Compare Lawyers in Singapore - Court Record Analysis",
  description: "Singapore's first data-driven lawyer comparison. 5,204 court judgments, 8,021 lawyers, 1,253 law firms tracked from eLitigation.sg court records.",
  alternates: { canonical: "https://fair-comparisons.com/lawyers" },
};

export default async function LawyersHub() {
  const [lawyerCountRes, firmCountRes, caseCountRes, topLawyersRes, topFirmsRes, topAreasRes] = await Promise.all([
    supabase.from("sg_lawyers").select("id", { count: "exact", head: true }),
    supabase.from("sg_law_firms").select("id", { count: "exact", head: true }),
    supabase.from("sg_court_cases").select("id", { count: "exact", head: true }),
    supabase.from("sg_lawyers").select("name, slug, primary_firm, case_count").order("case_count", { ascending: false }).limit(10),
    supabase.from("sg_law_firms").select("name, slug, lawyer_count, case_count").order("case_count", { ascending: false }).limit(10),
    supabase.from("sg_practice_areas").select("name, slug, case_count, lawyer_count").gte("case_count", 10).order("case_count", { ascending: false }).limit(20),
  ]);

  const lawyerCount = lawyerCountRes.count ?? 7072;
  const firmCount = firmCountRes.count ?? 1253;
  const caseCount = caseCountRes.count ?? 5204;
  const topLawyers = topLawyersRes.data ?? [];
  const topFirms = topFirmsRes.data ?? [];
  const topAreas = topAreasRes.data ?? [];

  return (
    <>
      <section className="bg-gradient-to-br from-coral-900 via-coral-800 to-coral-900">
        <div className="mx-auto max-w-[1120px] px-5 py-16 md:px-8 md:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-coral-300">Lawyer Comparison</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            {lawyerCount.toLocaleString()} lawyers.<br />
            <span className="text-coral-300">{caseCount.toLocaleString()} court cases.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/60">
            Singapore's first platform to track lawyers on actual court appearances.
            Every profile is built from eLitigation.sg public judgments. Not self-reported.
          </p>
          <div className="mt-8 flex flex-wrap gap-6 border-t border-white/10 pt-8">
            <div className="text-center">
              <span className="text-2xl font-extrabold text-white">{lawyerCount.toLocaleString()}</span>
              <p className="text-xs text-white/40">lawyers tracked</p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-extrabold text-white">{caseCount.toLocaleString()}</span>
              <p className="text-xs text-white/40">court cases</p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-extrabold text-white">{firmCount.toLocaleString()}</span>
              <p className="text-xs text-white/40">law firms</p>
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
              className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition hover:border-coral-200 hover:shadow-sm"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-coral-600"
              }`}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 group-hover:text-coral-600">{l.name}</p>
                <p className="text-xs text-gray-500 truncate">{l.primary_firm}</p>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-coral-100 bg-coral-50 px-3 py-1.5">
                <span className="text-lg font-extrabold text-coral-600">{l.case_count}</span>
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
            {topAreas.map(a => (
              <Link key={a.slug} href={`/lawyers/practice/${a.slug}`}
                className="group rounded-lg border border-gray-200 bg-white p-3 transition hover:border-coral-300 hover:shadow-sm">
                <div className="text-sm font-medium text-gray-900 group-hover:text-coral-600 truncate">{a.name.split(' — ')[0]}</div>
                <p className="mt-1 text-xs text-gray-400">{a.case_count} cases</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Top firms */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-2xl font-bold text-gray-900">Largest firms by court activity</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topFirms.map(f => (
            <Link key={f.slug} href={`/lawyers/firm/${f.slug}`}
              className="group rounded-lg border border-gray-200 bg-white p-4 transition hover:border-coral-300 hover:shadow-sm">
              <div className="font-semibold text-gray-900 group-hover:text-coral-600">{f.name}</div>
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
          <div className="rounded-xl border border-coral-200 bg-coral-50 p-8 text-center">
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
