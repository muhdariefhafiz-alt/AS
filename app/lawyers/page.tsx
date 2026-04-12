import Link from "next/link";
import type { Metadata } from "next";
import WaitlistForm from "./WaitlistForm";

export const metadata: Metadata = {
  title: "Compare Lawyers in Singapore - Court Record Analysis (Coming Soon)",
  description: "Singapore's first data-driven lawyer comparison. 5,204 court judgments analysed across 8,021 lawyers. Join the waitlist.",
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
          The first platform to track Singapore lawyers on actual court appearances.
        </p>
      </div>

      <div className="mt-12 space-y-6 text-[15px] leading-[1.75] text-gray-600">
        <p>
          We are analysing <strong>5,204 court judgments</strong> from Singapore&apos;s eLitigation database
          covering <strong>8,021 lawyers</strong> across Supreme Court, District Court, and Family Court.
          Each profile will show case volume, practice areas, courts handled, and firm history.
        </p>
        <p>
          This data is publicly available in court records but has never been structured, aggregated,
          or made searchable. Until now.
        </p>

        <h2 className="mt-8 text-xl font-bold text-gray-900">What you will be able to see</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="font-semibold text-gray-900">Case Volume</p>
            <p className="mt-1 text-sm text-gray-500">How many cases handled, across which courts, over what period</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="font-semibold text-gray-900">Specialization</p>
            <p className="mt-1 text-sm text-gray-500">Family, commercial, criminal, IP, employment: derived from case types</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="font-semibold text-gray-900">Court History</p>
            <p className="mt-1 text-sm text-gray-500">Supreme Court, District Court, Family Court: where they appear most</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="font-semibold text-gray-900">Firm Tracking</p>
            <p className="mt-1 text-sm text-gray-500">Current and historical firm affiliations from court records</p>
          </div>
        </div>

        <h2 className="mt-8 text-xl font-bold text-gray-900">Data sources</h2>
        <p>
          All data comes from public government sources:
          <strong> eLitigation.sg</strong> (Singapore Courts judgments, 2015-2025) and the
          <strong> MinLaw LSRA</strong> register of practicing lawyers.
          No private data. No self-reported profiles. Just court records.
        </p>
      </div>

      {/* Waitlist */}
      <div className="mt-12 rounded-xl border border-coral-200 bg-coral-50 p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900">Get notified when we launch</h2>
        <p className="mt-2 text-sm text-gray-500">
          Join the waitlist. We will notify you when lawyer profiles go live.
        </p>
        <WaitlistForm />
        <p className="mt-3 text-xs text-gray-400">No spam. One email when we launch.</p>
      </div>

      {/* Lawyer interest */}
      <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-6 text-center">
        <p className="font-semibold text-gray-900">Are you a lawyer?</p>
        <p className="mt-1 text-sm text-gray-500">
          Your court appearances are already in our database. Claim your profile early to control how clients see you.
        </p>
        <WaitlistForm lawyerMode />
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-gray-400 hover:text-teal-600">Back to home</Link>
      </div>
    </div>
  );
}
