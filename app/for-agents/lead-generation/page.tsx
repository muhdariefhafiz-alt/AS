import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "../../lib/supabase";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Property Agent Lead Generation Singapore - FairComparisons",
  description:
    "Buyers are already searching for agents like you. FairComparisons ranks in Google for agent name and area searches. Your track record sells itself.",
  alternates: {
    canonical: "https://fair-comparisons.com/for-agents/lead-generation",
  },
  openGraph: {
    title: "Property Agent Lead Generation Singapore - FairComparisons",
    description:
      "Buyers are already searching for agents like you. FairComparisons ranks in Google for agent name and area searches.",
    url: "https://fair-comparisons.com/for-agents/lead-generation",
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
    question: "How many leads will I get from FairComparisons?",
    answer:
      "We cannot guarantee a specific number of leads. FairComparisons works by making your profile visible in Google search results when buyers look for agents by name, area, or specialty. The volume depends on your AgentScore, your area, and how many buyers are actively searching. We do not make claims about lead volumes because they vary significantly.",
  },
  {
    question: "How is this different from buying leads?",
    answer:
      "We do not sell leads. Buyers find your profile organically through Google, review your transaction history and AgentScore, and contact you directly via WhatsApp if they want to work with you. There is no lead sharing, no bidding, and no competition for the same lead. When a buyer contacts you from your profile, they already know your track record.",
  },
  {
    question: "Do I need to pay to get contacted by buyers?",
    answer:
      "No. A free claimed profile includes your photo, WhatsApp number, full AgentScore, and seller leads matched on your transaction record. You pay a 0.25% success fee only when a referred sale completes. Optional paid tiers (S$99/mo Pro, S$299/mo Premium) add analytics and market data, but never placement or ranking position.",
  },
  {
    question: "What types of searches does FairComparisons rank for?",
    answer:
      "FairComparisons profiles rank in Google for searches like agent names (e.g., searching a specific agent by name), area-based searches (e.g., property agent Bishan), and comparison searches (e.g., best property agent District 15). We have over 1,000 indexed pages across agents, agencies, and districts.",
  },
  {
    question: "How long does it take to see results?",
    answer:
      "Your profile is already live and indexed in Google. When you claim it, your photo and WhatsApp number become visible immediately. Organic search visibility varies. Some agents see profile views within days of claiming, while for others it takes longer depending on search demand in their area.",
  },
];

export default async function LeadGenerationPage() {
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
          <li className="text-gray-600">Lead Generation</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[var(--ink)] via-[var(--ink-2)] to-[var(--ink)] mt-4">
        <div className="mx-auto max-w-[900px] px-5 py-16 text-center md:px-8 md:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--slate-2)]">
            For Property Agents
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white md:text-5xl">
            Buyers are already searching
            <br />
            <span className="text-[var(--slate-2)]">for agents like you</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/60">
            FairComparisons ranks in Google for agent name, area, and district searches. When buyers
            search, they find your profile. Your track record sells itself.
          </p>
          <div className="mt-8">
            <Link
              href="/search"
              className="inline-block rounded-lg bg-[var(--blue)] px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-[var(--blue)]"
            >
              Find your profile
            </Link>
          </div>
        </div>
      </section>

      {/* The pitch */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          Your next client is Googling right now
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-gray-500">
          Buyers and sellers research agents before making contact. They search for specific agent
          names, &quot;best agent in [area]&quot;, and &quot;property agent [district]&quot;.
          FairComparisons profiles appear in these search results with your AgentScore, transaction
          history, and contact details.
        </p>
        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-gray-200 bg-gray-50 p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Example searches where FairComparisons profiles appear
          </p>
          <div className="mt-4 space-y-2">
            {[
              '"[agent name] property agent"',
              '"best property agent Bishan"',
              '"property agent District 15"',
              '"compare property agents Singapore"',
              '"[agency name] reviews"',
            ].map((q, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-gray-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <span className="text-gray-600">{q}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Where agents typically spend */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Where agents typically spend on marketing
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-gray-500">
            Industry-typical monthly ranges for Singapore property agent marketing channels.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Channel</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Typical monthly cost</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3 text-gray-700">Listing portals (PropertyGuru, 99.co)</td>
                  <td className="px-4 py-3 text-gray-700">S$150 - S$2,861</td>
                  <td className="px-4 py-3 text-gray-500">Pay per listing / subscription tier</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-700">Meta and Google Ads</td>
                  <td className="px-4 py-3 text-gray-700">S$500 - S$10,000</td>
                  <td className="px-4 py-3 text-gray-500">Pay per click / impression</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-700">Lead-gen agencies</td>
                  <td className="px-4 py-3 text-gray-700">S$1,500 - S$15,000</td>
                  <td className="px-4 py-3 text-gray-500">Pay per lead / retainer</td>
                </tr>
                <tr className="bg-[var(--blue-wash)]">
                  <td className="px-4 py-3 font-medium text-[var(--blue-deep)]">FairComparisons</td>
                  <td className="px-4 py-3 font-bold text-[var(--blue)]">Free + 0.25% on completion</td>
                  <td className="px-4 py-3 text-[var(--blue-deep)]">Free profile + seller leads, pay only when you close</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-gray-400">
            Ranges are industry-typical estimates and will vary by agent. FairComparisons is not a
            direct substitute for all channels.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">How it works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "1",
              title: "Buyer searches Google",
              desc: 'A buyer or seller searches for an agent by name, area, or specialty. Example: "best property agent Tampines".',
            },
            {
              step: "2",
              title: "Finds your profile",
              desc: "Your FairComparisons profile appears in search results with your AgentScore and transaction summary.",
            },
            {
              step: "3",
              title: "Views your track record",
              desc: "The buyer reviews your full transaction history, specializations, and score breakdown. No fluff, just data.",
            },
            {
              step: "4",
              title: "Contacts you via WhatsApp",
              desc: "If your track record matches what they need, the buyer taps your WhatsApp button and reaches out directly.",
            },
          ].map((item) => (
            <div key={item.step} className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--blue-wash)] text-lg font-extrabold text-[var(--blue)]">
                {item.step}
              </div>
              <h3 className="mt-4 text-sm font-bold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Your profile is already live */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[900px] px-5 py-14 text-center md:px-8">
          <h2 className="text-2xl font-bold text-gray-900">Your profile is already live</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-gray-500">
            If you are a CEA-registered agent, we have already created your profile from public
            transaction data. Claim it to add your photo and WhatsApp number so buyers can reach you.
          </p>
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

      {/* Why track record matters */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          Why your track record matters more than ads
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-bold text-gray-900">Buyers do their homework</h3>
            <p className="mt-2 text-sm text-gray-500">
              Before contacting an agent, most buyers research online. They want to see actual
              transaction history, not just a profile photo and a tagline. Your CEA records speak for
              themselves.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-bold text-gray-900">No bidding, no sharing</h3>
            <p className="mt-2 text-sm text-gray-500">
              Unlike lead-gen services, we do not sell the same lead to multiple agents. When a buyer
              contacts you from your profile, they have already chosen you based on your track record.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-bold text-gray-900">Compounds over time</h3>
            <p className="mt-2 text-sm text-gray-500">
              Every transaction you close improves your AgentScore and strengthens your profile. Unlike
              ads that stop the moment you stop paying, your track record keeps working for you.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
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
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-[var(--ink)] via-[var(--ink-2)] to-[var(--ink)]">
        <div className="mx-auto max-w-[600px] px-5 py-16 text-center md:px-8">
          <h2 className="text-2xl font-bold text-white">
            Your profile is already being viewed by buyers.
          </h2>
          <p className="mt-3 text-white/60">
            Claim it to add your photo and WhatsApp number. Free, takes 2 minutes.
          </p>
          <div className="mt-8">
            <Link
              href="/search"
              className="inline-block rounded-lg bg-[var(--blue)] px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-[var(--blue)]"
            >
              Find and claim your profile
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
