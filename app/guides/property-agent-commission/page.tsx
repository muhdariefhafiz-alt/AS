import Link from "next/link";
import type { Metadata } from "next";
import SellCtaBand from "../../components/SellCtaBand";

export const metadata: Metadata = {
  title: "Property Agent Commission Rates in Singapore (2026 Guide)",
  description: "How much do property agents charge in Singapore? Standard commission rates for HDB, condo, and landed property. Buyer vs seller commission, what is included, and how to negotiate.",
  alternates: { canonical: "https://fair-comparisons.com/guides/property-agent-commission" },
};

const commissionRates = [
  {
    type: "HDB Resale",
    partyA: "Seller",
    partyB: "Buyer",
    rateA: "1% of sale price",
    rateB: "1% of purchase price",
    note: "The most standardized segment. Both sides typically pay 1% to their respective agents. On a S$600,000 HDB resale, that is S$6,000 per side.",
  },
  {
    type: "Private Resale (Condo)",
    partyA: "Seller",
    partyB: "Buyer",
    rateA: "1% to 2% of sale price",
    rateB: "1% of purchase price",
    note: "Seller commission is higher because private property marketing tends to be more involved. Buyer agents typically receive 1%, sometimes shared from the seller's agent commission via co-broking.",
  },
  {
    type: "Private Resale (Landed)",
    partyA: "Seller",
    partyB: "Buyer",
    rateA: "1% to 2% of sale price",
    rateB: "1% of purchase price",
    note: "Landed properties often involve more complex negotiations and longer transaction timelines. Commission rates are similar to condo resale.",
  },
  {
    type: "New Launch (Developer Sale)",
    partyA: "Seller",
    partyB: "Buyer",
    rateA: "Paid by developer (2% to 5%)",
    rateB: "Typically no fee",
    note: "For new developments, the developer pays the agent commission. Buyers usually do not pay any agent fee. This is why many agents actively market new launches.",
  },
  {
    type: "Rental",
    partyA: "Landlord",
    partyB: "Tenant",
    rateA: "0.5 to 1 month's rent",
    rateB: "0.5 to 1 month's rent",
    note: "For leases of 2 years, landlords typically pay 1 month's rent and tenants pay 0.5 to 1 month's rent. For 1-year leases, both parties typically pay 0.5 month's rent.",
  },
];

const faqItems = [
  {
    q: "Is there a standard property agent commission rate in Singapore?",
    a: "There is no legally fixed commission rate in Singapore. The rates mentioned (1% for HDB, 1-2% for private) are market norms, not regulations. The Council for Estate Agencies (CEA) explicitly states that commission rates are negotiable between the agent and client. Always agree on the rate in writing before signing any agency agreement.",
  },
  {
    q: "Do I pay agent commission if I am the buyer?",
    a: "If you engage your own buyer's agent, you pay them directly, typically 1% of the purchase price. If you do not engage an agent and deal directly with the seller's agent, you do not pay any commission. For new launches, buyers typically do not pay any commission as the developer covers the agent's fee.",
  },
  {
    q: "When is commission paid?",
    a: "Commission is payable upon successful completion of the transaction. For property sales, this means after the sale is completed and keys are handed over. For HDB resale, commission is typically deducted from the sale proceeds on completion day. You should not pay commission upfront or before the deal is finalized.",
  },
  {
    q: "Can I negotiate the agent commission rate?",
    a: "Yes. Commission rates are always negotiable. However, understand that a lower commission may affect the agent's motivation to market your property aggressively or prioritize your listing. Instead of negotiating purely on rate, consider negotiating on what services are included (professional photography, 3D tours, premium portal listings) at the standard rate.",
  },
  {
    q: "What happens if I have both a buyer's agent and seller's agent?",
    a: "Each party pays their own agent. The seller pays their agent (typically 1-2% for private, 1% for HDB) and the buyer pays their agent (typically 1%). The two agents co-broke the deal, meaning they coordinate the transaction between both parties. The commissions are separate and do not affect the sale price.",
  },
  {
    q: "Is GST charged on agent commission?",
    a: "It depends on whether the agent's agency is GST-registered. Larger agencies are typically GST-registered, meaning 9% GST is added on top of the commission. A 1% commission on a S$600,000 flat would be S$6,000 + S$540 GST = S$6,540 total. Check with your agent whether GST applies.",
  },
];

export default function PropertyAgentCommissionPage() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://fair-comparisons.com/guides" },
        { "@type": "ListItem", position: 3, name: "Agent Commission Rates", item: "https://fair-comparisons.com/guides/property-agent-commission" },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/guides" className="hover:text-gray-600">Guides</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">Agent Commission Rates</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Costs</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Property Agent Commission Rates in Singapore</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            How much do property agents charge? A clear breakdown of commission rates for HDB, condo, landed, new launches, and rental transactions. All rates reflect current market norms, not fixed regulations.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <article className="space-y-10">

            {/* Key Point */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--blue-wash)] p-6">
              <h2 className="text-lg font-bold text-gray-900">The key thing to know</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                There is no legally fixed property agent commission rate in Singapore. The Council for Estate Agencies (CEA) does not set rates. The percentages below are market norms that have been stable for years, but they are always negotiable between agent and client. Always agree on the rate in writing before signing an agency agreement.
              </p>
            </div>

            {/* Commission Table */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Commission Rates by Property Type</h2>
              <div className="mt-4 space-y-4">
                {commissionRates.map((r) => (
                  <div key={r.type} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <h3 className="text-[15px] font-bold text-gray-900">{r.type}</h3>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-400">{r.partyA}</p>
                        <p className="mt-1 text-sm font-bold text-[var(--blue-deep)]">{r.rateA}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-400">{r.partyB}</p>
                        <p className="mt-1 text-sm font-bold text-[var(--blue-deep)]">{r.rateB}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-gray-500">{r.note}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* What's Included */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">What Is Included in the Commission?</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  The commission covers the agent&apos;s services throughout the transaction. What exactly is included varies by agent and agency, but the standard services are:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li><strong>Market analysis and pricing advice</strong> based on recent comparable transactions</li>
                  <li><strong>Marketing</strong> including portal listings on PropertyGuru, 99.co, and similar platforms</li>
                  <li><strong>Photography</strong> (basic photography is usually included; professional or 3D virtual tours may cost extra with some agents)</li>
                  <li><strong>Coordinating viewings</strong> with prospective buyers or tenants</li>
                  <li><strong>Negotiation</strong> on price and terms</li>
                  <li><strong>Paperwork</strong> including the Option to Purchase, resale application (for HDB), and coordination with lawyers</li>
                </ul>
                <p>
                  Some agents offer premium packages with drone photography, staging advice, or video walkthroughs. If these are important to you, ask what is included at the quoted commission rate before signing.
                </p>
              </div>
            </section>

            {/* Buyer vs Seller */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Buyer vs Seller Commission</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  In Singapore, buyer and seller each pay their own agent. This is different from some markets (like the US) where the seller historically pays both sides.
                </p>
                <p>
                  <strong>As a seller:</strong> You pay your listing agent, typically 1% for HDB or 1-2% for private property. This is deducted from the sale proceeds.
                </p>
                <p>
                  <strong>As a buyer:</strong> If you engage your own agent to represent you, you pay them directly (typically 1%). If you choose not to engage an agent and deal with the seller&apos;s agent directly, you do not pay any commission. However, keep in mind that the seller&apos;s agent represents the seller&apos;s interests, not yours.
                </p>
                <p>
                  <strong>Co-broking:</strong> When both buyer and seller have agents, the two agents co-broke the deal. Each agent is paid by their respective client. The agents coordinate the transaction between them.
                </p>
              </div>
            </section>

            {/* Negotiation Tips */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Negotiating Commission</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  Commission is negotiable, but approach negotiation thoughtfully:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li><strong>Understand the trade-off.</strong> A lower commission may mean less marketing spend or lower priority for your listing. An agent who earns S$3,000 instead of S$6,000 has less incentive to invest in premium photography or portal upgrades.</li>
                  <li><strong>Negotiate on scope, not just rate.</strong> Instead of asking for 0.5% instead of 1%, ask what additional services they can include at 1% (professional photography, 3D tour, premium listing).</li>
                  <li><strong>Consider the property value.</strong> On a S$2 million condo, 1% is S$20,000, which leaves more room for negotiation than 1% on a S$400,000 HDB flat (S$4,000).</li>
                  <li><strong>Get it in writing.</strong> Whatever rate you agree on, ensure it is documented in the agency agreement, along with what services are included.</li>
                </ul>
              </div>
            </section>

            {/* FAQ */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h2>
              <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100">
                {faqItems.map((f) => (
                  <details key={f.q} className="group px-5 py-4">
                    <summary className="cursor-pointer text-[15px] font-medium text-gray-900 group-open:text-[var(--blue-deep)]">{f.q}</summary>
                    <p className="mt-3 text-sm leading-relaxed text-gray-500">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>

          </article>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Compare Agents</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">See how agents compare on transaction volume, area specialization, and client reviews.</p>
              <Link href="/property-agents/compare" className="mt-4 block rounded-lg bg-[var(--blue)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[var(--blue-deep)]">
                Compare agents
              </Link>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">For Agents</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Your profile and AgentScore are already live. Claim it to add contact details and manage your listing.</p>
              <Link href="/for-agents" className="mt-4 block rounded-lg border border-[var(--line-2)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--blue-deep)] transition hover:bg-[var(--blue-wash)]">
                Claim your profile
              </Link>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Related Guides</h3>
              <ul className="mt-3 space-y-2">
                <li><Link href="/tools/commission-calculator" className="text-sm font-semibold text-[var(--blue)] hover:underline">Commission calculator (free tool)</Link></li>
                <li><Link href="/guides/how-to-choose-property-agent" className="text-sm text-[var(--blue)] hover:underline">How to choose an agent</Link></li>
                <li><Link href="/guides/property-agent-vs-diy" className="text-sm text-[var(--blue)] hover:underline">Selling without an agent</Link></li>
                <li><Link href="/guides/hdb-resale-process" className="text-sm text-[var(--blue)] hover:underline">HDB resale process</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <SellCtaBand source="guide_commission" heading="Compare agents on fees, not guesswork" sub="Get a free shortlist of the agents who actually sell homes like yours. Each invited agent quotes their own commission, so you compare real numbers side by side." />
    </>
  );
}
