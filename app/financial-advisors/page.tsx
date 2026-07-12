import Link from "next/link";
import { supabase } from "../lib/supabase";
import type { Metadata } from "next";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Compare MAS-Licensed Financial Advisors SG",
  description: "Compare MAS-licensed financial advisors, insurance brokers, and capital markets firms in Singapore. Independent comparison based on government regulatory data.",
  alternates: { canonical: "https://fair-comparisons.com/financial-advisors" },
};

const SECTORS = [
  { name: "Financial Advisory", slug: "financial-advisory", icon: "\ud83d\udcb0", desc: "Licensed and exempt financial advisors" },
  { name: "Insurance", slug: "insurance", icon: "\ud83d\udee1\ufe0f", desc: "Life, general, and composite insurers, brokers" },
  { name: "Capital Markets", slug: "capital-markets", icon: "\ud83d\udcc8", desc: "Fund managers, brokers, trading platforms" },
  { name: "Banking", slug: "banking", icon: "\ud83c\udfe6", desc: "Local, foreign, wholesale, and merchant banks" },
  { name: "Payments", slug: "payments", icon: "\ud83d\udcb3", desc: "Payment institutions, money changers" },
];

export default async function FinancialAdvisorsHub() {
  const [fiCountRes, categoryCounts] = await Promise.all([
    supabase.from("sg_financial_institutions").select("id", { count: "exact", head: true }),
    supabase.from("sg_financial_institutions").select("category, sector").limit(5000),
  ]);

  const totalFi = fiCountRes.count ?? 0;
  const cats = categoryCounts.data ?? [];

  // Count by sector
  const sectorCounts: Record<string, number> = {};
  for (const c of cats) {
    const s = c.sector || "Other";
    sectorCounts[s] = (sectorCounts[s] || 0) + 1;
  }

  // Count by category
  const catCounts: Record<string, number> = {};
  for (const c of cats) {
    catCounts[c.category] = (catCounts[c.category] || 0) + 1;
  }
  const topCategories = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);

  return (
    <>
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
        <div className="mx-auto max-w-[1120px] px-5 py-16 md:px-8 md:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Financial Services</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            Every MAS-licensed financial<br />
            <span className="text-blue-300">institution in Singapore.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/60">
            {totalFi > 0 ? `${totalFi.toLocaleString()} financial institutions` : "Financial institutions"} regulated by the Monetary Authority of Singapore.
            Banks, insurers, financial advisors, capital markets firms, and payment providers.
          </p>
          {totalFi > 0 && (
            <div className="mt-8 flex flex-wrap gap-6 border-t border-white/10 pt-8">
              {SECTORS.map(s => (
                <div key={s.slug} className="text-center">
                  <span className="text-2xl font-extrabold text-white">{sectorCounts[s.name] ?? 0}</span>
                  <p className="text-xs text-white/40">{s.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sectors */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-2xl font-bold text-gray-900">Browse by sector</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTORS.map(s => (
            <Link key={s.slug} href={`/financial-advisors/${s.slug}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">{s.name}</h3>
                  <p className="text-xs text-gray-400">{sectorCounts[s.name] ?? 0} institutions</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Top categories */}
      {topCategories.length > 0 && (
        <section className="border-t border-gray-100 bg-gray-50">
          <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
            <h2 className="text-2xl font-bold text-gray-900">By licence type</h2>
            <div className="mt-6 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {topCategories.map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
                  <span className="text-sm text-gray-700 truncate">{cat}</span>
                  <span className="shrink-0 text-sm text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Data source */}
      <section className="border-t border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-8 text-center md:px-8">
          <p className="text-xs text-gray-400">
            All data from the Monetary Authority of Singapore (MAS) Financial Institutions Directory.
            Updated regularly. For the most current information, visit eservices.mas.gov.sg.
          </p>
        </div>
      </section>
    </>
  );
}
