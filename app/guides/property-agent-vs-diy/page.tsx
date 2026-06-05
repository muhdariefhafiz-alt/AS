import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Selling Property Without an Agent in Singapore: DIY Guide (2026)",
  description: "Can you sell your property without an agent in Singapore? What an agent does, when DIY works, legal requirements, and the real costs of going solo vs hiring a professional.",
  alternates: { canonical: "https://fair-comparisons.com/guides/property-agent-vs-diy" },
};

const agentTasks = [
  {
    task: "Market analysis and pricing",
    diyDifficulty: "Medium",
    diyHow: "Check recent transactions on URA REALIS (for private) or HDB Resale Price Index. Look at comparable transactions in your block and nearby blocks on data.gov.sg. The data is public, but interpreting it correctly requires understanding what makes a valid comparison (same floor level, facing, unit type, renovation condition).",
  },
  {
    task: "Photography and marketing materials",
    diyDifficulty: "Low",
    diyHow: "Smartphone photos can work if your property is well-staged and well-lit. Professional photography costs S$200 to S$500 independently. You can create your own floor plan using free tools or pay S$100 to S$200 for a professional one.",
  },
  {
    task: "Portal listings",
    diyDifficulty: "Low",
    diyHow: "PropertyGuru and 99.co both accept listings from individual owners. There is usually a fee for owner listings (around S$50 to S$200 per month depending on the package). Some portals offer free basic listings.",
  },
  {
    task: "Coordinating viewings",
    diyDifficulty: "Medium",
    diyHow: "You handle scheduling, showing the property, and answering buyer questions directly. This can be time-consuming, especially if you are working full-time. Weekend viewings are most common.",
  },
  {
    task: "Negotiation",
    diyDifficulty: "High",
    diyHow: "Negotiating directly with a buyer (who may have their own agent) requires composure, market knowledge, and an understanding of standard terms. An agent acts as a buffer and can negotiate more objectively. This is where many DIY sellers feel least comfortable.",
  },
  {
    task: "Paperwork and legal process",
    diyDifficulty: "Medium to High",
    diyHow: "For HDB: The HDB Resale Portal handles most documentation. For private property: You will need a conveyancing lawyer regardless. The Option to Purchase (OTP) has standard legal terms, but errors can be costly. Many DIY sellers engage a lawyer earlier than usual to help with the OTP.",
  },
];

const faqItems = [
  {
    q: "Is it legal to sell property without an agent in Singapore?",
    a: "Yes, completely legal. There is no law requiring you to use a property agent for any type of property transaction in Singapore. You can sell your HDB flat, condo, or landed property directly to a buyer without an agent. The only professional you must engage for private property transactions is a conveyancing lawyer.",
  },
  {
    q: "How much can I save by selling without an agent?",
    a: "The seller's agent commission is typically 1% for HDB and 1-2% for private property. On a S$600,000 HDB flat, that is S$6,000. On a S$1.5 million condo at 2%, that is S$30,000. However, you should factor in the cost of portal listings (S$50-S$200/month), professional photography (S$200-S$500), and most importantly, whether a lack of agent representation might result in a lower sale price.",
  },
  {
    q: "What if the buyer has an agent but I do not?",
    a: "This is common. The buyer's agent will handle their client's side of the transaction. You deal with the buyer's agent directly for negotiation and coordination. The buyer pays their own agent's commission. You do not pay the buyer's agent anything. However, be aware that the buyer's agent represents the buyer's interests, not yours.",
  },
  {
    q: "Is it easier to DIY for HDB or private property?",
    a: "HDB resale is generally easier to DIY because the HDB Resale Portal standardizes most of the process, pricing data is freely available on data.gov.sg, and the transaction steps are well-documented. Private property (condo and landed) involves more variables: marketing is more competitive, the OTP terms are more complex, and the buyer pool may be more geographically dispersed.",
  },
  {
    q: "Do I still need a lawyer if I sell without an agent?",
    a: "For HDB resale, engaging a lawyer is not mandatory (HDB handles the conveyancing), but it is recommended for complex situations. For private property, you must engage a conveyancing lawyer to handle the legal transfer. Conveyancing fees typically range from S$2,000 to S$3,500.",
  },
  {
    q: "Can I start DIY and then switch to an agent later?",
    a: "Yes. There is nothing stopping you from listing independently and then engaging an agent if you are not getting results after a few weeks. Just be transparent with the agent about your earlier marketing efforts and any existing inquiries. Some agents may ask for a higher commission or exclusivity to take over a listing that has been on the market for a while.",
  },
];

export default function PropertyAgentVsDiyPage() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://fair-comparisons.com/guides" },
        { "@type": "ListItem", position: 3, name: "Agent vs DIY", item: "https://fair-comparisons.com/guides/property-agent-vs-diy" },
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
          <span className="text-gray-600">Agent vs DIY</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">DIY</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Selling Property Without an Agent in Singapore</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Can you sell your property without an agent? A practical breakdown of what agents do, which tasks you can handle yourself, and when it makes sense to go solo vs hiring a professional.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <article className="space-y-10">

            {/* Overview */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">The Short Answer</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  Yes, you can sell any property in Singapore without an agent. There is no legal requirement to use one. The question is whether it makes financial and practical sense for your specific situation.
                </p>
                <p>
                  The agent&apos;s commission (typically 1% for HDB, 1-2% for private property) is the cost you save. But that saving only materializes if you can achieve the same or a similar sale price, handle the marketing and paperwork, and invest the time required to manage the process.
                </p>
                <p>
                  Below is a task-by-task breakdown of what an agent does, how difficult each task is to handle yourself, and when it makes sense to go with or without one.
                </p>
              </div>
            </section>

            {/* Task Breakdown */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">What Does an Agent Actually Do?</h2>
              <div className="mt-4 space-y-4">
                {agentTasks.map((t) => (
                  <div key={t.task} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[15px] font-bold text-gray-900">{t.task}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        t.diyDifficulty === "Low"
                          ? "bg-green-50 text-green-700"
                          : t.diyDifficulty === "Medium"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}>
                        DIY: {t.diyDifficulty}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{t.diyHow}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* When DIY Makes Sense */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">When DIY Makes Sense</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  Selling without an agent tends to work better when:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li><strong>You are selling an HDB flat in a popular town.</strong> High demand means buyers come to you. The HDB Resale Portal handles most paperwork. Pricing data is freely available.</li>
                  <li><strong>You have time to manage the process.</strong> Viewings, inquiries, and negotiations require availability, especially on evenings and weekends.</li>
                  <li><strong>You are comfortable with negotiation.</strong> You will be negotiating directly with buyers or their agents.</li>
                  <li><strong>Your property is competitively priced.</strong> A well-priced property in good condition sells itself more easily.</li>
                  <li><strong>You have sold property before.</strong> Experience with the process reduces the learning curve.</li>
                </ul>
              </div>
            </section>

            {/* When to Hire an Agent */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">When to Hire an Agent</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  An agent adds more value when:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li><strong>You are selling private property (condo or landed).</strong> The buyer pool is wider, marketing is more competitive, and the legal process is more complex.</li>
                  <li><strong>You need to sell quickly.</strong> An experienced agent with an existing network of buyers and co-broking contacts can accelerate the process.</li>
                  <li><strong>You are unfamiliar with current market pricing.</strong> Overpricing by even 5% can result in your listing sitting for months, which is more costly than the agent&apos;s commission.</li>
                  <li><strong>You are selling in a buyer&apos;s market.</strong> When supply exceeds demand, an agent&apos;s marketing and negotiation skills become more valuable.</li>
                  <li><strong>You are selling from overseas.</strong> Managing viewings and negotiations remotely is difficult without a local representative.</li>
                </ul>
                <p>
                  If you decide to engage an agent, use{" "}
                  <Link href="/search" className="text-[var(--blue)] underline hover:text-[var(--blue-deep)]">FairComparisons</Link>{" "}
                  to compare agents on actual transaction data rather than marketing claims. The{" "}
                  <Link href="/property-agents/compare" className="text-[var(--blue)] underline hover:text-[var(--blue-deep)]">side-by-side comparison tool</Link>{" "}
                  lets you evaluate agents on volume, recency, and area specialization.
                </p>
              </div>
            </section>

            {/* Legal Requirements */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Legal Requirements for DIY Sellers</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  Even without an agent, you are still responsible for meeting all legal requirements:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li><strong>HDB resale:</strong> Register your Intent to Sell on the HDB Resale Portal. Grant the OTP through the portal. Both buyer and seller submit the resale application. Attend the completion appointment at HDB Hub.</li>
                  <li><strong>Private property:</strong> Engage a conveyancing lawyer (mandatory for the legal transfer). Prepare the Option to Purchase correctly. Lodge the caveat with the Singapore Land Authority. Handle stamp duty obligations.</li>
                  <li><strong>Both:</strong> Comply with anti-money laundering requirements. Ensure all co-owners consent to the sale. Discharge any existing mortgage before or at completion.</li>
                </ul>
                <p>
                  For a detailed walkthrough of the HDB process, see our{" "}
                  <Link href="/guides/hdb-resale-process" className="text-[var(--blue)] underline hover:text-[var(--blue-deep)]">HDB Resale Process guide</Link>.
                  For commission rates and what agents include in their fees, see the{" "}
                  <Link href="/guides/property-agent-commission" className="text-[var(--blue)] underline hover:text-[var(--blue-deep)]">agent commission guide</Link>.
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
              <h3 className="text-sm font-bold text-gray-900">Decided to Hire an Agent?</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Compare agents on actual transaction data. Find the best-performing agents in your area.</p>
              <Link href="/search" className="mt-4 block rounded-lg bg-[var(--blue)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[var(--blue-deep)]">
                Search agents
              </Link>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Compare Side by Side</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Pick any two agents and compare their transaction history, area focus, and AgentScore breakdown.</p>
              <Link href="/property-agents/compare" className="mt-4 block rounded-lg border border-[var(--line-2)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--blue-deep)] transition hover:bg-[var(--blue-wash)]">
                Compare agents
              </Link>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Related Guides</h3>
              <ul className="mt-3 space-y-2">
                <li><Link href="/guides/property-agent-commission" className="text-sm text-[var(--blue)] hover:underline">Agent commission rates</Link></li>
                <li><Link href="/guides/hdb-resale-process" className="text-sm text-[var(--blue)] hover:underline">HDB resale process</Link></li>
                <li><Link href="/guides/how-to-choose-property-agent" className="text-sm text-[var(--blue)] hover:underline">How to choose an agent</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
