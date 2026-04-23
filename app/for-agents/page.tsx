import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "../lib/supabase";
import PricingCards from "../components/PricingCards";

export const revalidate = false;

export const metadata: Metadata = {
  title: "For Property Agents - Claim Your Profile",
  description: "Your FairComparisons profile is live. Claim it for free to add your photo, contact details, and connect with buyers searching your area.",
  alternates: { canonical: "https://fair-comparisons.com/for-agents" },
};

async function getStats() {
  const [scored, agencies, pages] = await Promise.all([
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).not("score", "is", null),
    supabase.from("sg_agencies").select("id", { count: "exact", head: true }),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }),
  ]);
  return {
    scored: scored.count ?? 10594,
    agencies: agencies.count ?? 930,
    total: pages.count ?? 30000,
  };
}

export default async function ForAgentsPage() {
  const stats = await getStats();
  return (
    <>
      <section className="bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900">
        <div className="mx-auto max-w-[900px] px-5 py-16 text-center md:px-8 md:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-300">For Property Agents</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            Your profile is already live.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/60">
            FairComparisons has scored {stats.scored.toLocaleString()} Singapore property agents across {stats.agencies.toLocaleString()} agencies based on CEA transaction records.
            If you are a CEA-registered agent, your profile and score are already public. Claim it to take control.
          </p>
          <div className="mt-6 flex justify-center gap-6">
            <div className="text-center"><span className="text-2xl font-extrabold text-white">{stats.total.toLocaleString()}</span><p className="text-[10px] text-white/40">agents profiled</p></div>
            <div className="text-center"><span className="text-2xl font-extrabold text-white">{stats.scored.toLocaleString()}</span><p className="text-[10px] text-white/40">agents scored</p></div>
            <div className="text-center"><span className="text-2xl font-extrabold text-white">28</span><p className="text-[10px] text-white/40">districts</p></div>
          </div>
          <div className="mt-8">
            <Link href="/search" className="inline-block rounded-lg bg-teal-500 px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-teal-400">
              Find your profile
            </Link>
          </div>
        </div>
      </section>

      {/* Claimed vs unclaimed */}
      <section className="mx-auto max-w-[900px] px-5 py-14 md:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">Claimed vs unclaimed profiles</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Unclaimed (current)</p>
            <ul className="mt-4 space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2"><span className="text-gray-300">-</span> Name and CEA registration visible</li>
              <li className="flex items-start gap-2"><span className="text-gray-300">-</span> AgentScore and transaction history public</li>
              <li className="flex items-start gap-2"><span className="text-gray-300">-</span> No photo, no contact details</li>
              <li className="flex items-start gap-2"><span className="text-gray-300">-</span> Buyers cannot reach you</li>
            </ul>
          </div>
          <div className="rounded-xl border-2 border-teal-300 bg-teal-50 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-600">Claimed (free)</p>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2"><span className="text-teal-500">+</span> Add your photo and WhatsApp number</li>
              <li className="flex items-start gap-2"><span className="text-teal-500">+</span> Write your practice area description</li>
              <li className="flex items-start gap-2"><span className="text-teal-500">+</span> Get notified when buyers view your profile</li>
              <li className="flex items-start gap-2"><span className="text-teal-500">+</span> Embed your AgentScore widget on your site</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How scoring works */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[900px] px-5 py-14 md:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">How your score is calculated</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-gray-500">
            The AgentScore is fully automated. Payment does not influence your ranking. The only way to improve your score is to close more transactions and deliver better service.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            {[
              { label: "Volume", pts: 30, desc: "Total CEA transactions" },
              { label: "Recency", pts: 25, desc: "Recent activity weighted higher" },
              { label: "Diversity", pts: 15, desc: "Property types and transaction types" },
              { label: "Experience", pts: 15, desc: "Years registered and consistency" },
            ].map(d => (
              <div key={d.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <span className="text-2xl font-extrabold text-teal-600">{d.pts}</span>
                <p className="mt-1 text-xs font-bold text-gray-900">{d.label}</p>
                <p className="mt-1 text-[10px] text-gray-400">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-[900px] px-5 py-14 md:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">Simple pricing</h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-gray-500">
          Claiming your profile is free. Upgrade when you want more visibility.
        </p>
        <PricingCards />
      </section>

      {/* Related pages for agents */}
      <section className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-[900px] px-5 py-14 md:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">Resources for agents</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Link href="/for-agents/propertyguru-alternative" className="group rounded-xl border border-gray-200 bg-white p-6 transition hover:border-teal-300 hover:shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-600">Compare</p>
              <p className="mt-2 text-lg font-bold text-gray-900 group-hover:text-teal-600">PropertyGuru Alternative</p>
              <p className="mt-2 text-sm text-gray-500">How FairComparisons compares to PropertyGuru on pricing, features, and visibility. See the side-by-side breakdown.</p>
            </Link>
            <Link href="/for-agents/lead-generation" className="group rounded-xl border border-gray-200 bg-white p-6 transition hover:border-teal-300 hover:shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-600">Lead Generation</p>
              <p className="mt-2 text-lg font-bold text-gray-900 group-hover:text-teal-600">How Agents Get Leads on FairComparisons</p>
              <p className="mt-2 text-sm text-gray-500">Buyers search Google for agents in their area. Your track record does the selling. See how it works.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-gray-100 bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900">
        <div className="mx-auto max-w-[600px] px-5 py-16 text-center md:px-8">
          <h2 className="text-2xl font-bold text-white">Your profile is already being viewed by buyers.</h2>
          <p className="mt-3 text-white/60">Claim it to control what they see.</p>
          <Link href="/search" className="mt-6 inline-block rounded-lg bg-teal-500 px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-teal-400">
            Find and claim your profile
          </Link>
          <p className="mt-4 text-sm text-white/40">
            Questions? <a href="mailto:hello@fair-comparisons.com" className="text-white/60 underline hover:text-white">hello@fair-comparisons.com</a>
          </p>
        </div>
      </section>
    </>
  );
}
