import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HDB Resale Process in Singapore: Complete Step-by-Step Guide (2026)",
  description: "The full HDB resale process explained: eligibility, Option to Purchase, HDB Resale Portal steps, timeline, costs, and agent commission. Updated for 2026.",
  alternates: { canonical: "https://fair-comparisons.com/guides/hdb-resale-process" },
};

const timelineSteps = [
  {
    step: "1",
    title: "Check Your Eligibility",
    duration: "Before listing",
    content: "Before you can sell your HDB flat, you must have fulfilled the Minimum Occupation Period (MOP), which is typically 5 years from the date of key collection. You can check your eligibility on the HDB website under My Flat > Purchased Flat > Eligibility to Sell. If you have an outstanding HDB loan, you will need to calculate the expected sale proceeds to ensure you can repay the loan plus any CPF refunds.",
  },
  {
    step: "2",
    title: "Register Your Intent to Sell",
    duration: "Instant",
    content: "Log in to the HDB Resale Portal with your Singpass and register your Intent to Sell. This step is free and confirms that you meet the eligibility conditions. The Intent to Sell is valid for 12 months. You do not need an agent to do this, but many sellers have their agent handle it.",
  },
  {
    step: "3",
    title: "Market Your Flat and Find a Buyer",
    duration: "2 to 12 weeks (varies)",
    content: "This is where most of the agent's work happens. They will advise on pricing (based on recent comparable sales in your block and neighbourhood), arrange professional photography, list the property on portals like PropertyGuru and 99.co, coordinate viewings, and negotiate with prospective buyers. The time to find a buyer depends on pricing, location, and market conditions.",
  },
  {
    step: "4",
    title: "Negotiate and Grant the Option to Purchase (OTP)",
    duration: "1 to 2 weeks",
    content: "Once you agree on a price with a buyer, you grant them an Option to Purchase (OTP) through the HDB Resale Portal. The buyer pays you an option fee of between S$1 and S$1,000 (as agreed between parties). The OTP is valid for 21 calendar days, during which the buyer must decide whether to exercise it. If the buyer does not exercise the OTP within 21 days, it expires and the option fee is forfeited to you.",
  },
  {
    step: "5",
    title: "Buyer Exercises the OTP",
    duration: "Within 21 days of OTP",
    content: "If the buyer decides to proceed, they exercise the OTP through the HDB Resale Portal and pay an additional option exercise fee. The combined option fee and exercise fee is typically capped at S$5,000. At this point, both parties are committed to the transaction.",
  },
  {
    step: "6",
    title: "Submit Resale Application",
    duration: "Within 7 days of exercising OTP",
    content: "Both buyer and seller must submit the resale application through the HDB Resale Portal within 7 days of the OTP being exercised. Each party submits their respective portion of the application. You will need to provide details about your flat, any outstanding loans, and your CPF usage.",
  },
  {
    step: "7",
    title: "HDB Processes the Application",
    duration: "Approximately 8 weeks",
    content: "HDB will process the resale application and schedule an appointment at the HDB Hub. During this period, HDB verifies all information, checks ethnic integration policy quotas, and prepares the necessary documents. Both parties will receive a letter confirming the completion appointment date.",
  },
  {
    step: "8",
    title: "Completion Appointment",
    duration: "1 day",
    content: "Both buyer and seller attend the completion appointment at the HDB Hub. This is where the transaction is finalized: the title transfers, loans are disbursed, CPF refunds are processed, and you receive your sale proceeds. The process typically takes about an hour. You must hand over the keys to the buyer at this appointment.",
  },
];

const costItems = [
  { item: "Agent commission (seller)", amount: "Typically 1% of sale price", note: "Negotiable. No standard fixed by law." },
  { item: "Agent commission (buyer)", amount: "Typically 1% of sale price", note: "Buyer pays their own agent if they use one." },
  { item: "Conveyancing fees", amount: "S$2,000 to S$3,500", note: "Legal fees for a lawyer to handle the conveyance. Optional for HDB but recommended." },
  { item: "HDB resale levy", amount: "Varies (S$15,000 to S$50,000)", note: "Only applies if you bought your current flat directly from HDB (first-timer grant) and are buying a second subsidised flat." },
  { item: "CPF accrued interest", amount: "Varies", note: "If you used CPF to pay for your flat, you must refund the CPF principal plus 2.5% accrued interest to your CPF Ordinary Account." },
  { item: "Outstanding loan repayment", amount: "Remaining balance", note: "Settled from sale proceeds on completion day." },
];

const faqItems = [
  {
    q: "How long does the entire HDB resale process take?",
    a: "From listing to key handover, the typical timeline is 3 to 5 months. The main variable is how long it takes to find a buyer (2 to 12 weeks). Once the OTP is exercised, the HDB processing and completion appointment take approximately 8 to 10 weeks.",
  },
  {
    q: "Do I need an agent to sell my HDB flat?",
    a: "No. There is no legal requirement to use an agent for an HDB resale transaction. The HDB Resale Portal is designed to allow direct buyer-seller transactions. However, most sellers use an agent for pricing advice, marketing, negotiation, and to coordinate the paperwork. The commission is typically 1% of the sale price.",
  },
  {
    q: "What happens to my CPF when I sell my HDB flat?",
    a: "You must refund the CPF principal amount used for the flat purchase (including housing grants) plus 2.5% accrued interest to your CPF Ordinary Account. This is automatically deducted from the sale proceeds on completion day. Any remaining proceeds after loan repayment and CPF refund are paid to you in cash.",
  },
  {
    q: "Can I sell my HDB flat before the 5-year MOP?",
    a: "Generally no. The 5-year MOP must be fulfilled before you can sell on the open market. There are limited exceptions for severe financial hardship or other compassionate grounds, but these require HDB approval and are rarely granted. You can check your MOP date on the HDB website.",
  },
  {
    q: "What is the difference between an OTP and an exercise of OTP for HDB?",
    a: "The OTP (Option to Purchase) is the initial agreement where the seller gives the buyer the right to buy the flat at the agreed price. The buyer pays a small option fee (S$1 to S$1,000). Exercising the OTP means the buyer formally commits to the purchase within the 21-day validity period by paying the exercise fee (bringing the total to up to S$5,000). Once exercised, both parties are legally committed.",
  },
];

export default function HdbResaleProcessPage() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://fair-comparisons.com/guides" },
        { "@type": "ListItem", position: 3, name: "HDB Resale Process", item: "https://fair-comparisons.com/guides/hdb-resale-process" },
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
          <span className="text-gray-600">HDB Resale Process</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">HDB</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">HDB Resale Process: Step-by-Step Guide</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            The complete process for selling an HDB resale flat in Singapore, from eligibility check to key handover. Covers timeline, costs, the HDB Resale Portal, and the role of a property agent.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <article className="space-y-10">

            {/* Overview */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Overview</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  The HDB resale process in Singapore is largely standardized through the HDB Resale Portal, a government platform that handles most of the paperwork digitally. The entire process, from listing your flat to handing over the keys, typically takes 3 to 5 months.
                </p>
                <p>
                  The main stages are: checking eligibility, registering your Intent to Sell, finding a buyer, granting and exercising the Option to Purchase (OTP), submitting the resale application, and attending the completion appointment at the HDB Hub.
                </p>
                <p>
                  While you can complete the entire process without a property agent, most sellers engage one. An agent helps with pricing, marketing, negotiation, and coordination. The typical agent commission for HDB resale is 1% of the sale price from the seller, with the buyer paying their own agent separately.
                </p>
              </div>
            </section>

            {/* Timeline */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Step-by-Step Timeline</h2>
              <div className="mt-6 space-y-0">
                {timelineSteps.map((s, i) => (
                  <div key={s.step} className="relative flex gap-4 pb-8">
                    {/* Vertical line */}
                    {i < timelineSteps.length - 1 && (
                      <div className="absolute left-[17px] top-10 h-[calc(100%-32px)] w-0.5 bg-gray-200" />
                    )}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--blue)] text-sm font-bold text-white">
                      {s.step}
                    </div>
                    <div className="pt-0.5">
                      <h3 className="text-[15px] font-bold text-gray-900">{s.title}</h3>
                      <span className="mt-0.5 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">{s.duration}</span>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Costs */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Costs Involved in Selling an HDB Flat</h2>
              <div className="mt-4 space-y-3">
                {costItems.map((c) => (
                  <div key={c.item} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{c.item}</h3>
                        <p className="mt-1 text-xs text-gray-400">{c.note}</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-[var(--blue-deep)]">{c.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[15px] leading-[1.75] text-gray-600">
                For a detailed breakdown of agent fees, see our{" "}
                <Link href="/guides/property-agent-commission" className="text-[var(--blue)] underline hover:text-[var(--blue-deep)]">guide on agent commission rates</Link>.
              </p>
            </section>

            {/* Role of the Agent */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">What Does a Property Agent Do in an HDB Resale?</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  A property agent handles several tasks that can be time-consuming for a DIY seller:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li><strong>Pricing advice</strong> based on recent comparable transactions in your block and neighbourhood</li>
                  <li><strong>Marketing</strong> including professional photography, portal listings (PropertyGuru, 99.co), and social media promotion</li>
                  <li><strong>Coordinating viewings</strong> with prospective buyers</li>
                  <li><strong>Negotiation</strong> on price and terms</li>
                  <li><strong>Paperwork</strong> including the OTP process and HDB Resale Portal submissions</li>
                  <li><strong>Coordination</strong> with the buyer&apos;s agent, lawyers, and HDB</li>
                </ul>
                <p>
                  Not all agents provide the same level of service. Use{" "}
                  <Link href="/search" className="text-[var(--blue)] underline hover:text-[var(--blue-deep)]">FairComparisons</Link>{" "}
                  to find agents who specialize in HDB resale in your town. You can browse the{" "}
                  <Link href="/property-agents/best/hdb/ang-mo-kio" className="text-[var(--blue)] underline hover:text-[var(--blue-deep)]">top HDB agents by town</Link>{" "}
                  to compare track records.
                </p>
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
              <h3 className="text-sm font-bold text-gray-900">Find HDB Specialists</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Search for agents who have the strongest HDB resale track record in your town.</p>
              <Link href="/search" className="mt-4 block rounded-lg bg-[var(--blue)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[var(--blue-deep)]">
                Search agents
              </Link>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">HDB Resources</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="https://www.hdb.gov.sg/residential/selling-a-flat" target="_blank" rel="noopener noreferrer" className="text-[var(--blue)] hover:underline">HDB: Selling a Flat (official)</a></li>
                <li><Link href="/insights/million-dollar-hdb" className="text-[var(--blue)] hover:underline">Million-Dollar HDB Tracker</Link></li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Related Guides</h3>
              <ul className="mt-3 space-y-2">
                <li><Link href="/guides/property-agent-commission" className="text-sm text-[var(--blue)] hover:underline">Agent commission rates</Link></li>
                <li><Link href="/guides/property-agent-vs-diy" className="text-sm text-[var(--blue)] hover:underline">Selling without an agent</Link></li>
                <li><Link href="/guides/how-to-choose-property-agent" className="text-sm text-[var(--blue)] hover:underline">How to choose an agent</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
