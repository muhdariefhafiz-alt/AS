import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "../../lib/supabase";

export const revalidate = false;

export const metadata: Metadata = {
  title: "PropertyGuru Alternative for Agents - FairComparisons",
  description:
    "Spending S$2,000+/mo on PropertyGuru? FairComparisons gives property agents unlimited visibility from S$0/mo. Data-driven AgentScore, no pay-to-play rankings.",
  alternates: {
    canonical: "https://fair-comparisons.com/for-agents/propertyguru-alternative",
  },
  openGraph: {
    title: "PropertyGuru Alternative for Agents - FairComparisons",
    description:
      "Spending S$2,000+/mo on PropertyGuru? FairComparisons gives property agents unlimited visibility from S$0/mo.",
    url: "https://fair-comparisons.com/for-agents/propertyguru-alternative",
    siteName: "FairComparisons",
    locale: "en_SG",
    type: "website",
  },
};

async function getStats() {
  const [scored, agencies, total] = await Promise.all([
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).not("score", "is", null),
    supabase.from("sg_agencies").select("id", { count: "exact", head: true }),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }),
  ]);
  return {
    scored: scored.count ?? 10594,
    agencies: agencies.count ?? 930,
    total: total.count ?? 30000,
  };
}

const faqItems = [
  {
    question: "Does FairComparisons replace PropertyGuru?",
    answer:
      "No. PropertyGuru is a listing portal where buyers search for properties. FairComparisons is a comparison platform where buyers search for agents. Many agents use both. We are complementary to portals, not a replacement.",
  },
  {
    question: "How much does it cost compared to PropertyGuru?",
    answer:
      "Claiming and maintaining your FairComparisons profile is free forever, and we never take a cut of a sale. Optional subscriptions add reputation and analytics tools: Verified S$29/mo, Professional S$69/mo, Elite S$149/mo. PropertyGuru agent packages range from S$163/mo (Entry) to S$2,861/mo (Business Plus), depending on features and listing credits.",
  },
  {
    question: "Can I cancel my PropertyGuru subscription if I join FairComparisons?",
    answer:
      "That depends on your business. If most of your leads come from portal listings, you may still need PropertyGuru. FairComparisons works differently: instead of paying per listing, you build a public track record that buyers find through Google search. Some agents reduce portal spend over time as organic leads grow, but we would not recommend cancelling any channel that is currently working for you.",
  },
  {
    question: "How is the AgentScore calculated?",
    answer:
      "The AgentScore is calculated from public CEA transaction data. It factors in sale-weighted transaction volume (30 points; completed sales count most, rentals least), recency (25 points), diversity of property types (15 points), and years of experience (15 points), plus the agency's review standing. Payment does not influence your score or ranking position.",
  },
  {
    question: "What do I get with a free profile?",
    answer:
      "A free claimed profile lets you add your photo and WhatsApp number, write a practice area description, receive notifications when buyers view your profile, and embed your AgentScore widget on your own website. Your AgentScore, transaction history, and ranking are all included at no cost.",
  },
];

export default async function PropertyGuruAlternativePage() {
  const stats = await getStats();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }}
      />

      {/* Breadcrumb */}
      <nav className="mx-auto max-w-[1120px] px-5 pt-4 md:px-8">
        <ol className="flex items-center gap-1.5 text-xs text-gray-400">
          <li><Link href="/" className="hover:text-gray-600">Home</Link></li>
          <li>/</li>
          <li><Link href="/for-agents" className="hover:text-gray-600">For Agents</Link></li>
          <li>/</li>
          <li className="text-gray-600">PropertyGuru Alternative</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[var(--ink)] via-[var(--ink-2)] to-[var(--ink)] mt-4">
        <div className="mx-auto max-w-[900px] px-5 py-16 text-center md:px-8 md:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--slate-2)]">
            For Property Agents
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white md:text-5xl">
            Spending S$2,000+/mo on PropertyGuru?
            <br />
            <span className="text-[var(--slate-2)]">There&apos;s a smarter way.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/60">
            FairComparisons profiles {stats.scored.toLocaleString()} scored property agents across
            Singapore. Buyers find you through Google, see your track record, and reach out directly.
            No listing fees. No pay-to-play rankings.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/search"
              className="inline-block rounded-lg bg-[var(--blue)] px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-[var(--blue)]"
            >
              Find your profile
            </Link>
            <Link
              href="/for-agents"
              className="inline-block rounded-lg border border-white/20 px-8 py-4 font-semibold text-white transition hover:bg-white/10"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          PropertyGuru vs FairComparisons
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-gray-500">
          PropertyGuru pricing is based on publicly available 2024 rate cards. FairComparisons pricing
          is current as of today.
        </p>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Plan</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Monthly cost</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">What you get</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                  PropertyGuru Agent Plans
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Entry</td>
                <td className="px-4 py-3 text-gray-700">S$163</td>
                <td className="px-4 py-3 text-gray-500">Basic listing credits, agent profile</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Advance</td>
                <td className="px-4 py-3 text-gray-700">S$488</td>
                <td className="px-4 py-3 text-gray-500">More listing credits, featured placement</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Professional</td>
                <td className="px-4 py-3 text-gray-700">S$976</td>
                <td className="px-4 py-3 text-gray-500">Premium listings, priority search results</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Business</td>
                <td className="px-4 py-3 text-gray-700">S$1,464</td>
                <td className="px-4 py-3 text-gray-500">Top-tier listings, analytics dashboard</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Business Plus</td>
                <td className="px-4 py-3 text-gray-700">S$2,861</td>
                <td className="px-4 py-3 text-gray-500">Maximum visibility, all features</td>
              </tr>

              <tr className="bg-[var(--blue-wash)]">
                <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--blue)]">
                  FairComparisons
                </td>
              </tr>
              <tr className="bg-[var(--blue-wash)]">
                <td className="px-4 py-3 font-medium text-gray-900">Free</td>
                <td className="px-4 py-3 font-bold text-[var(--blue)]">S$0</td>
                <td className="px-4 py-3 text-gray-700">
                  Full profile, AgentScore, photo, WhatsApp, transaction history
                </td>
              </tr>
              <tr className="bg-[var(--blue-wash)]">
                <td className="px-4 py-3 font-medium text-gray-900">Verified</td>
                <td className="px-4 py-3 font-bold text-[var(--blue)]">S$29</td>
                <td className="px-4 py-3 text-gray-700">
                  Verified badge, view + enquiry analytics (no placement)
                </td>
              </tr>
              <tr className="bg-[var(--blue-wash)]">
                <td className="px-4 py-3 font-medium text-gray-900">Professional</td>
                <td className="px-4 py-3 font-bold text-[var(--blue)]">S$69</td>
                <td className="px-4 py-3 text-gray-700">
                  Comparable-transaction data, deeper analytics (no placement)
                </td>
              </tr>
              <tr className="bg-[var(--blue-wash)]">
                <td className="px-4 py-3 font-medium text-gray-900">Elite</td>
                <td className="px-4 py-3 font-bold text-[var(--blue)]">S$149</td>
                <td className="px-4 py-3 text-gray-700">
                  District analytics, dedicated support, market insights (no placement)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Key differentiators */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Different model, different value
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              {
                pg: "PropertyGuru sells listings.",
                fc: "We sell your track record.",
                detail:
                  "PropertyGuru helps buyers find properties. FairComparisons helps buyers find the right agent based on actual transaction data.",
              },
              {
                pg: "PropertyGuru charges per listing.",
                fc: "We give you unlimited visibility.",
                detail:
                  "Your profile, AgentScore, and full transaction history are visible to every buyer who searches for you. No listing limits, no credit system.",
              },
              {
                pg: "PropertyGuru rankings are pay-to-play.",
                fc: "Our AgentScore is data-driven.",
                detail:
                  "Your AgentScore is calculated from CEA transaction records. Payment never influences your ranking position. The only way to rank higher is to close more deals.",
              },
              {
                pg: "PropertyGuru prices rose 72% since 2019.",
                fc: "Our Free tier stays free forever.",
                detail:
                  "A full claimed profile with photo, contact details, and AgentScore costs nothing, and we never take a cut of a sale. Optional subscriptions add reputation and analytics tools, never visibility or ranking.",
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
                <p className="text-sm text-gray-400 line-through">{item.pg}</p>
                <p className="mt-1 text-base font-bold text-[var(--blue)]">{item.fc}</p>
                <p className="mt-3 text-sm text-gray-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">What you get</h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-gray-500">
          Claiming your profile is free. Every feature below is included at no cost.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border-2 border-[var(--line-2)] bg-[var(--blue-wash)] p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue)]">
              Free claimed profile
            </p>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue)]">+</span> Your photo and WhatsApp number on your profile
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue)]">+</span> AgentScore based on CEA transaction records
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue)]">+</span> Full transaction history visible to buyers
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue)]">+</span> Practice area description in your own words
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue)]">+</span> Notifications when buyers view your profile
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue)]">+</span> Embeddable AgentScore widget for your website
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Optional subscription tools
            </p>
            <ul className="mt-4 space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue)]">+</span> Verified badge on your profile (Verified)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue)]">+</span> Weekly profile view + enquiry analytics (Verified)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue)]">+</span> Comparable-transaction data for pricing (Professional)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue)]">+</span> Full district analytics dashboard (Elite)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue)]">+</span> Dedicated account support (Elite)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue)]">+</span> Monthly market insights for your area (Elite)
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Live stats */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[900px] px-5 py-14 text-center md:px-8">
          <h2 className="text-2xl font-bold text-gray-900">Already live on FairComparisons</h2>
          <div className="mt-8 flex justify-center gap-10">
            <div className="text-center">
              <span className="text-3xl font-extrabold text-[var(--blue)]">
                {stats.total.toLocaleString()}
              </span>
              <p className="mt-1 text-xs text-gray-400">agents profiled</p>
            </div>
            <div className="text-center">
              <span className="text-3xl font-extrabold text-[var(--blue)]">
                {stats.scored.toLocaleString()}
              </span>
              <p className="mt-1 text-xs text-gray-400">agents scored</p>
            </div>
            <div className="text-center">
              <span className="text-3xl font-extrabold text-[var(--blue)]">
                {stats.agencies.toLocaleString()}
              </span>
              <p className="mt-1 text-xs text-gray-400">agencies</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Data sourced from CEA public records. Updated regularly.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          Frequently asked questions
        </h2>
        <div className="mx-auto mt-8 max-w-[720px] divide-y divide-gray-200">
          {faqItems.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-gray-900">
                {item.question}
                <span className="ml-4 text-gray-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-gray-100 bg-gradient-to-br from-[var(--ink)] via-[var(--ink-2)] to-[var(--ink)]">
        <div className="mx-auto max-w-[600px] px-5 py-16 text-center md:px-8">
          <h2 className="text-2xl font-bold text-white">
            Your profile is already live. Claim it for free.
          </h2>
          <p className="mt-3 text-white/60">
            No credit card needed. No listing fees. Just your track record, working for you.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/search"
              className="inline-block rounded-lg bg-[var(--blue)] px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-[var(--blue)]"
            >
              Find your profile
            </Link>
            <Link
              href="/for-agents"
              className="inline-block rounded-lg border border-white/20 px-8 py-4 font-semibold text-white transition hover:bg-white/10"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/40">
            Questions?{" "}
            <a
              href="mailto:hello@fair-comparisons.com"
              className="text-white/60 underline hover:text-white"
            >
              hello@fair-comparisons.com
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
