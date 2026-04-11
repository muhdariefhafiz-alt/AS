import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Lawyers in Singapore - Court Record Analysis (Coming Soon)",
  description: "Singapore's first data-driven lawyer comparison. 10,568 court judgments analysed for win rates, specialization, and case volume. Launching soon.",
  alternates: { canonical: "https://fair-comparisons.com/lawyers" },
  robots: { index: false, follow: true },
};

export default function LawyersPage() {
  return (
    <div className="mx-auto max-w-[800px] px-5 py-20 md:px-8">
      <div className="text-center">
        <span className="inline-block rounded-full bg-coral-50 px-4 py-1.5 text-sm font-semibold text-coral-600">Coming Soon</span>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900">
          Compare Lawyers in Singapore
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          The first platform to rate Singapore lawyers on actual court outcomes.
        </p>
      </div>

      <div className="mt-12 space-y-6 text-[15px] leading-[1.75] text-gray-600">
        <p>
          We are analysing <strong>10,568 court judgments</strong> from Singapore&apos;s eLitigation database
          to build comprehensive profiles for every practicing lawyer. Each profile will show case volume,
          win/loss ratios by practice area, judicial patterns, and firm history.
        </p>
        <p>
          This data is publicly available in court records but has never been structured, aggregated,
          or made searchable. Until now.
        </p>

        <h2 className="mt-8 text-xl font-bold text-gray-900">What you will be able to see</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="font-semibold text-gray-900">Win/Loss Ratio</p>
            <p className="mt-1 text-sm text-gray-500">Per lawyer, per practice area, based on actual court outcomes</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="font-semibold text-gray-900">Case Volume</p>
            <p className="mt-1 text-sm text-gray-500">How many cases handled, across which courts, over what period</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="font-semibold text-gray-900">Specialization</p>
            <p className="mt-1 text-sm text-gray-500">Family, commercial, criminal, IP, employment: derived from case types</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="font-semibold text-gray-900">Firm Comparisons</p>
            <p className="mt-1 text-sm text-gray-500">Head-to-head performance between Singapore&apos;s top law firms</p>
          </div>
        </div>

        <h2 className="mt-8 text-xl font-bold text-gray-900">Data sources</h2>
        <p>
          All data comes from public government sources:
          <strong> eLitigation.sg</strong> (Singapore Courts judgments, 2000-2026) and the
          <strong> MinLaw LSRA</strong> register of practicing lawyers.
          No private data. No self-reported profiles. Just court records.
        </p>
      </div>

      <div className="mt-12 text-center">
        <Link href="/" className="rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-teal-700">
          Back to home
        </Link>
      </div>
    </div>
  );
}
