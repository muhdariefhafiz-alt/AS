import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Choose a Property Agent in Singapore (2026 Guide)",
  description: "What to look for when choosing a property agent in Singapore. CEA registration, track record, specialization, red flags, and the right questions to ask before signing an agreement.",
  alternates: { canonical: "https://fair-comparisons.com/guides/how-to-choose-property-agent" },
};

const faqItems = [
  {
    q: "How do I check if a property agent is registered with CEA?",
    a: "Visit the CEA Public Register at https://www.cea.gov.sg/aceas/public-register and search by name or registration number. Every licensed property agent in Singapore must hold a valid CEA registration. You can verify their registration status, the agency they are registered under, and whether they have any disciplinary actions on record.",
  },
  {
    q: "What commission rate should I expect to pay a property agent in Singapore?",
    a: "For HDB resale transactions, the standard rate is 1% of the sale price from each side (buyer and seller). For private property sales, commissions typically range from 1% to 2%. There is no fixed rate set by law, so commissions are negotiable. Always clarify the rate and what services are included before signing any agreement.",
  },
  {
    q: "Should I work with one agent or interview multiple agents?",
    a: "It is recommended to meet at least 2 to 3 agents before committing. Compare their knowledge of your area, their recent transaction record, how they plan to market your property, and their communication style. Avoid signing an exclusive agreement until you are confident in your choice.",
  },
  {
    q: "What is the difference between an exclusive and non-exclusive agency agreement?",
    a: "An exclusive agreement means only that agent (and their agency) can market and sell your property for the agreed period, typically 3 to 6 months. A non-exclusive agreement allows you to engage multiple agents simultaneously. Exclusive agreements can incentivize the agent to invest more in marketing, but they also remove your flexibility to switch if the relationship is not working.",
  },
  {
    q: "Can I sell my property without an agent in Singapore?",
    a: "Yes, there is no legal requirement to use a property agent for any property transaction in Singapore. However, agents handle valuation, marketing, negotiations, paperwork, and coordination with buyers, lawyers, and HDB or URA. For HDB resale, the process is well-documented on the HDB Resale Portal, making DIY more feasible than for private property.",
  },
];

export default function HowToChooseAgentPage() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://fair-comparisons.com/guides" },
        { "@type": "ListItem", position: 3, name: "How to Choose a Property Agent", item: "https://fair-comparisons.com/guides/how-to-choose-property-agent" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/guides" className="hover:text-gray-600">Guides</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">How to Choose a Property Agent</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-teal-50/60 to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">Agent Selection</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">How to Choose a Property Agent in Singapore</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Your property agent will handle one of the largest financial transactions of your life. Here is how to evaluate agents based on track record, specialization, and professionalism rather than marketing.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <article className="space-y-10">

            {/* Section 1: CEA Registration */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Start with CEA Registration</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  Every property agent in Singapore must be registered with the Council for Estate Agencies (CEA). This is not optional. Operating without registration is a criminal offence under the Estate Agents Act.
                </p>
                <p>
                  Before engaging any agent, verify their registration on the{" "}
                  <a href="https://www.cea.gov.sg/aceas/public-register" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline hover:text-teal-800">CEA Public Register</a>.
                  This will show you:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>Whether their registration is currently active</li>
                  <li>Which agency they are registered under</li>
                  <li>How long they have been registered</li>
                  <li>Any disciplinary actions or suspensions on record</li>
                </ul>
                <p>
                  An agent who has been registered for many years is not automatically better, but registration history gives you a baseline for experience. You can cross-reference this with their actual transaction record.
                </p>
              </div>
            </section>

            {/* Section 2: Track Record */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Evaluate Their Track Record</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  The most reliable indicator of agent quality is their transaction history. CEA requires agents to report all property transactions, and this data is publicly available. Look for:
                </p>
                <div className="space-y-3">
                  {[
                    { label: "Transaction volume", desc: "How many deals has the agent closed in the past 1 to 2 years? An agent with consistent, recent transactions is actively working the market." },
                    { label: "Property type match", desc: "If you are selling an HDB flat, you want an agent who regularly handles HDB resale, not one who primarily does condo launches." },
                    { label: "Area knowledge", desc: "An agent who has closed multiple transactions in your town or district will know the local pricing, buyer demographics, and recent comparable sales." },
                    { label: "Transaction recency", desc: "An agent with 200 lifetime transactions but nothing in the past year may be semi-retired or inactive." },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                      <h3 className="font-semibold text-gray-900">{item.label}</h3>
                      <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <p>
                  You can check an agent&apos;s transaction history on{" "}
                  <Link href="/search" className="text-teal-600 underline hover:text-teal-800">FairComparisons</Link>,
                  which compiles CEA transaction records and calculates an independent AgentScore based on volume, recency, diversity, experience, and reviews.
                </p>
              </div>
            </section>

            {/* Section 3: Specialization */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Check Their Specialization</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  The Singapore property market has distinct segments, and agents tend to specialize. The main segments are:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li><strong>HDB resale</strong> -- governed by HDB rules, Minimum Occupation Period (MOP), ethnic quotas, and the HDB Resale Portal process</li>
                  <li><strong>Private resale (condo/landed)</strong> -- involves URA caveats, option to purchase, and often more complex negotiations</li>
                  <li><strong>New launches</strong> -- agents represent the developer and earn commissions from the developer side</li>
                  <li><strong>Rental</strong> -- shorter transaction cycles, different client expectations</li>
                </ul>
                <p>
                  An agent who excels at marketing new condo launches may not be the right fit for navigating the HDB resale process. Ask specifically about their experience with your property type.
                </p>
                <p>
                  Use our{" "}
                  <Link href="/property-agents/compare" className="text-teal-600 underline hover:text-teal-800">agent comparison tool</Link>{" "}
                  to compare agents side by side on specialization and transaction history.
                </p>
              </div>
            </section>

            {/* Section 4: Red Flags */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Red Flags to Watch For</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  Be cautious if an agent:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li><strong>Refuses to share their CEA registration number.</strong> Legitimate agents display it openly. It is required on all marketing materials.</li>
                  <li><strong>Pressures you to sign an exclusive agreement immediately.</strong> A good agent should be confident enough to let you compare options.</li>
                  <li><strong>Gives an unrealistically high valuation.</strong> Some agents inflate the expected sale price to win the listing, then gradually pressure you to lower it. Check recent comparable transactions independently.</li>
                  <li><strong>Cannot name specific recent transactions in your area.</strong> Vague claims about market knowledge without concrete examples are a warning sign.</li>
                  <li><strong>Asks for upfront fees beyond the agreed commission.</strong> Standard practice in Singapore is commission payable only upon successful completion of the transaction.</li>
                  <li><strong>Has disciplinary actions on the CEA register.</strong> Check before you engage.</li>
                </ul>
              </div>
            </section>

            {/* Section 5: Questions to Ask */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Questions to Ask Before Engaging an Agent</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  When you meet a prospective agent, ask these questions to assess their fit:
                </p>
                <ol className="list-decimal space-y-3 pl-6">
                  <li><strong>How many transactions have you completed in the past 12 months?</strong> This tells you if they are actively working.</li>
                  <li><strong>How many of those were in my area or for my property type?</strong> Relevance matters more than total volume.</li>
                  <li><strong>What is your commission rate and what does it include?</strong> Get clarity on marketing costs, photography, and administrative work.</li>
                  <li><strong>What is your marketing plan for my property?</strong> Look for specifics: which portals, professional photography, viewing schedules.</li>
                  <li><strong>What is the realistic price range based on recent comparable sales?</strong> An honest agent will cite specific transactions rather than giving you an inflated number.</li>
                  <li><strong>Will you be handling my transaction personally, or will it be passed to a co-broker or team member?</strong> Know who you will actually be working with.</li>
                  <li><strong>What is the duration and terms of the agency agreement?</strong> Understand the commitment before signing.</li>
                </ol>
              </div>
            </section>

            {/* Section 6: How FairComparisons Helps */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Using Data to Compare Agents</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  FairComparisons provides an independent, data-driven way to evaluate agents before you meet them. Every agent profile includes:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>AgentScore (0-100) based on CEA transaction records and Google reviews</li>
                  <li>Full transaction history by property type and area</li>
                  <li>Area rankings showing the top-performing agents in each district or HDB town</li>
                  <li>Side-by-side comparison of any two agents</li>
                </ul>
                <p>
                  Start by browsing the{" "}
                  <Link href="/property-agents/best/bukit-timah" className="text-teal-600 underline hover:text-teal-800">top agents in your area</Link>,
                  or use the{" "}
                  <Link href="/search" className="text-teal-600 underline hover:text-teal-800">search tool</Link>{" "}
                  to find agents who match your property type and location.
                </p>
              </div>
            </section>

            {/* FAQ */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h2>
              <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100">
                {faqItems.map((f) => (
                  <details key={f.q} className="group px-5 py-4">
                    <summary className="cursor-pointer text-[15px] font-medium text-gray-900 group-open:text-teal-700">{f.q}</summary>
                    <p className="mt-3 text-sm leading-relaxed text-gray-500">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>

          </article>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Find Top Agents</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Search by area, property type, or agent name. Compare agents on actual transaction data.</p>
              <Link href="/search" className="mt-4 block rounded-lg bg-teal-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-teal-500">
                Search agents
              </Link>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Are You an Agent?</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Your profile is already live on FairComparisons. Claim it to add your photo, contact details, and manage how buyers see you.</p>
              <Link href="/for-agents" className="mt-4 block rounded-lg border border-teal-200 px-4 py-2.5 text-center text-sm font-semibold text-teal-700 transition hover:bg-teal-50">
                Claim your profile
              </Link>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Related Guides</h3>
              <ul className="mt-3 space-y-2">
                <li><Link href="/guides/property-agent-commission" className="text-sm text-teal-600 hover:underline">Agent commission rates</Link></li>
                <li><Link href="/guides/property-agent-vs-diy" className="text-sm text-teal-600 hover:underline">Selling without an agent</Link></li>
                <li><Link href="/guides/hdb-resale-process" className="text-sm text-teal-600 hover:underline">HDB resale process</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
