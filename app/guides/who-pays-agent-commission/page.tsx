import Link from "next/link";
import type { Metadata } from "next";
import SellCtaBand from "../../components/SellCtaBand";
import ScrollReveal from "../../components/ScrollReveal";
import { KeyLine } from "../../components/LineArt";

export const metadata: Metadata = {
  // Buyer-side intent: "who pays the agent when buying a house in singapore",
  // "do buyers pay agent fees". Title answers the question directly. 55 chars.
  title: { absolute: "Who Pays Agent Commission in Singapore? Buyer or Seller" },
  description:
    "Who pays the agent when buying in Singapore? Each side pays their own agent. Deal direct with the seller's agent, or buy a new launch, and you pay nothing.",
  alternates: { canonical: "https://fair-comparisons.com/guides/who-pays-agent-commission" },
};

const whoPaysRows = [
  {
    scenario: "You buy with your own buyer's agent",
    whoPays: "You pay your agent",
    typical: "Typically 1% of purchase price",
    note: "You engage the agent, you pay them. In private resale the buyer's agent is often paid out of a co-broke split from the seller's agent instead, so always ask your agent up front who is paying them and how much.",
  },
  {
    scenario: "You buy directly from the seller's agent",
    whoPays: "You pay nothing",
    typical: "S$0",
    note: "The seller pays their own agent. You owe that agent nothing. Remember though: they represent the seller's interests, not yours.",
  },
  {
    scenario: "You buy a new launch from a developer",
    whoPays: "Developer pays",
    typical: "S$0 for you (developer pays 2% to 5%)",
    note: "The developer pays the marketing agents. Buyers do not pay any agent fee at a new launch, which is one reason agents market launches so actively.",
  },
  {
    scenario: "You sell your property",
    whoPays: "You pay your listing agent",
    typical: "1% HDB, 1% to 2% private",
    note: "Deducted from your sale proceeds at completion. Market norms, not regulation: CEA sets no rates and every rate is negotiable.",
  },
  {
    scenario: "You rent (tenant side)",
    whoPays: "Depends on rent level and who you engage",
    typical: "0 to 1 month's rent",
    note: "Deal direct with the landlord's agent and you usually pay nothing. Engage your own agent and market practice is 0.5 to 1 month's rent, though on higher rents the two agents often co-broke and split the landlord-side fee instead.",
  },
];

const faqItems = [
  {
    q: "Do buyers pay agent fees in Singapore?",
    a: "Only if they engage their own agent. If you engage a buyer's agent to represent you, you typically pay them 1% of the purchase price, although in private resale the buyer's agent is often paid through a co-broke split of the seller's agent's commission instead. If you deal directly with the seller's agent, you pay no commission at all. For new launches the developer pays, so buyers pay nothing.",
  },
  {
    q: "Who pays the agent when buying a new launch condo?",
    a: "The developer. Developers typically pay marketing agents 2% to 5% of the purchase price, and the buyer pays no agent fee. This is why agents actively market new launches. The commission is built into the developer's marketing budget, not added to your bill.",
  },
  {
    q: "Can one agent represent both the buyer and the seller?",
    a: "No. CEA rules prohibit dual representation: an agent cannot act for both parties in the same transaction or collect commission from both sides. If you contact a seller's agent directly, they remain the seller's agent. They can facilitate your purchase, but they owe their duty to the seller.",
  },
  {
    q: "Is it cheaper to buy without my own agent?",
    a: "You avoid the buyer-agent fee (typically 1% in HDB practice), so your direct costs are lower. But the seller's agent negotiates for the seller, so you give up representation. Whether that trade is worth roughly 1% depends on how well you know the market, the paperwork, and your own negotiation comfort.",
  },
  {
    q: "Does the commission come out of the sale price?",
    a: "The seller's commission is deducted from the sale proceeds at completion, so the seller receives the price minus their agent's fee. A buyer who engaged their own agent pays that agent separately. Commission does not change the negotiated price itself; it changes what each side nets after the deal.",
  },
  {
    q: "Who pays the agent for HDB resale vs private property?",
    a: "The same principle applies to both: each side pays their own agent. In HDB resale, both sides commonly engage and pay their own agent at around 1% each. In private resale, the seller typically pays 1% to 2% and a buyer's agent is often paid via a co-broke split from the seller's agent, so many private buyers pay nothing directly. All of these are market norms, not regulated rates.",
  },
];

export default function WhoPaysAgentCommissionPage() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://fair-comparisons.com/guides" },
        { "@type": "ListItem", position: 3, name: "Who Pays Agent Commission", item: "https://fair-comparisons.com/guides/who-pays-agent-commission" },
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
          <span className="text-gray-600">Who Pays Agent Commission</span>
        </div>
      </nav>

      <ScrollReveal />
      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white" style={{ position: "relative", overflow: "hidden" }}>
        <KeyLine className="fc-lineart fc-float" width={88} style={{ position: "absolute", right: "6%", top: 24, color: "var(--line-2)" }} />
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8" style={{ position: "relative" }}>
          <span className="fc-hero-in fc-hero-in--1 inline-block rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Costs</span>
          <h1 className="fc-hero-in fc-hero-in--2 mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Who Pays the Agent Commission in Singapore?</h1>
          <p className="fc-hero-in fc-hero-in--3 mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            The short answer: each side pays their own agent. Buyers who deal directly with the seller&apos;s agent pay nothing, and new-launch buyers pay nothing because the developer pays. Here is how it works in every scenario, including co-broking and the HDB vs private differences.
          </p>
          <p className="fc-hero-in fc-hero-in--4 mono mt-3 text-xs" style={{ color: "var(--slate)" }}>
            Updated August 2026 · rates are market norms, cross-checked against CEA guidance
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <article className="space-y-10">

            {/* Key Point */}
            <div className="fc-reveal fc-scene fc-scene--inbox" style={{ padding: "clamp(10px,1.6vw,14px)" }}>
            <div className="rounded-xl border border-[var(--line)] bg-white p-6">
              <h2 className="text-lg font-bold text-gray-900">The one rule that answers almost everything</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                In Singapore, you pay an agent only if that agent works for you. The seller pays the listing agent. A buyer pays a buyer&apos;s agent only if they engaged one. If you never engaged an agent, you owe no commission, full stop. CEA rules also prohibit an agent from representing both sides of the same deal or collecting commission from both parties.
              </p>
              <p className="mt-3 text-[15px] leading-[1.75] text-gray-600">
                All the percentages in this guide are market norms, not regulations. CEA does not set commission rates, and every rate is negotiable. For the full rate breakdown by property type, see our{" "}
                <Link href="/guides/property-agent-commission" className="font-medium text-[var(--blue)] underline">commission rates guide</Link>.
              </p>
            </div>
            </div>

            {/* Who pays what, scenario by scenario */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">Who Pays What, Scenario by Scenario</h2>
              <div className="mt-4 space-y-4">
                {whoPaysRows.map((r, i) => (
                  <div key={r.scenario} className="fc-reveal rounded-xl border border-gray-100 bg-white p-5 shadow-sm" style={{ ["--reveal-delay" as string]: `${Math.min(i * 0.06, 0.42)}s` }}>
                    <h3 className="text-[15px] font-bold text-gray-900">{r.scenario}</h3>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-400">Who pays</p>
                        <p className="mt-1 text-sm font-bold text-[var(--blue-deep)]">{r.whoPays}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-400">Typical amount</p>
                        <p className="mt-1 text-sm font-bold text-[var(--blue-deep)]">{r.typical}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-gray-500">{r.note}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Co-broking */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">Co-Broking: How Two Agents Split One Deal</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  When the buyer and seller each have an agent, the two agents <strong>co-broke</strong>: they coordinate the viewing, the negotiation, and the paperwork between the two sides. Who pays whom depends on the segment:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li><strong>HDB resale:</strong> the cleanest split. Each party typically pays their own agent about 1%. The seller&apos;s agent and buyer&apos;s agent are paid separately by their own clients.</li>
                  <li><strong>Private resale:</strong> the seller typically pays 1% to 2%. The buyer&apos;s agent is often paid out of that seller-side commission via a co-broke split, in which case the buyer pays nothing directly. Some buyer&apos;s agents charge the buyer 1% instead. Ask which model applies before you view anything.</li>
                  <li><strong>New launch:</strong> the developer pays every agent involved. There is no buyer-side fee to split.</li>
                </ul>
                <p>
                  The important protection: an agent must tell you who is paying them. If a buyer&apos;s agent is being paid from the seller side, you are entitled to know, because it shapes their incentives on price.
                </p>
              </div>
            </section>

            {/* Buying without your own agent */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">Buying Without Your Own Agent</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  Many buyers simply contact the agent named on the listing. That is completely fine, and it costs you nothing: the seller pays that agent, and CEA&apos;s ban on dual representation means the agent cannot charge you as well.
                </p>
                <p>
                  What you give up is representation. The listing agent&apos;s duty is to get the best outcome for the seller. They can hand you forms and arrange viewings, but they will not tell you the flat is overpriced. If you go this route, do your own price homework: check recent transactions for the block or project, and be ready to negotiate for yourself.
                </p>
                <p>
                  If you would rather have someone on your side, engage a buyer&apos;s agent and agree the fee in writing before viewings start. You can{" "}
                  <Link href="/property-agents/shortlist" className="font-medium text-[var(--blue)] underline">shortlist agents by their real transaction record</Link>{" "}
                  in the area you are buying into.
                </p>
              </div>
            </section>

            {/* Worked examples */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">Worked Examples</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                Illustrative examples at round price points (these are examples, not quotes; rates are negotiable and GST applies only if the agency is GST-registered):
              </p>
              <div className="fc-scene fc-scene--grow mt-4" style={{ padding: "clamp(14px,2.5vw,20px)" }}>
              <div className="overflow-x-auto rounded-xl bg-white p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      <th className="pb-2 pr-4">Example scenario</th>
                      <th className="pb-2 pr-4 text-right">Price</th>
                      <th className="pb-2 pr-4 text-right">Buyer pays</th>
                      <th className="pb-2 text-right">Seller pays</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr><td className="py-2.5 pr-4 font-medium text-gray-900">HDB resale, both sides have agents (1% each)</td><td className="py-2.5 pr-4 text-right text-gray-600">S$600,000</td><td className="py-2.5 pr-4 text-right font-bold text-gray-900">S$6,000</td><td className="py-2.5 text-right font-bold text-gray-900">S$6,000</td></tr>
                    <tr><td className="py-2.5 pr-4 font-medium text-gray-900">HDB resale, buyer deals direct with seller&apos;s agent</td><td className="py-2.5 pr-4 text-right text-gray-600">S$600,000</td><td className="py-2.5 pr-4 text-right font-bold text-gray-900">S$0</td><td className="py-2.5 text-right font-bold text-gray-900">S$6,000</td></tr>
                    <tr><td className="py-2.5 pr-4 font-medium text-gray-900">Condo resale, buyer&apos;s agent paid via co-broke split (seller at 2%)</td><td className="py-2.5 pr-4 text-right text-gray-600">S$1,500,000</td><td className="py-2.5 pr-4 text-right font-bold text-gray-900">S$0</td><td className="py-2.5 text-right font-bold text-gray-900">S$30,000</td></tr>
                    <tr><td className="py-2.5 pr-4 font-medium text-gray-900">New launch condo (developer pays agents)</td><td className="py-2.5 pr-4 text-right text-gray-600">S$1,800,000</td><td className="py-2.5 pr-4 text-right font-bold text-gray-900">S$0</td><td className="py-2.5 text-right font-bold text-gray-900">n/a (developer pays)</td></tr>
                  </tbody>
                </table>
              </div>
              </div>
              <p className="mt-4 text-[15px] leading-[1.75] text-gray-600">
                Want your exact numbers? Run them through the free{" "}
                <Link href="/tools/commission-calculator" className="font-medium text-[var(--blue)] underline">commission calculator</Link>, which handles sale and rental scenarios plus GST.
              </p>
            </section>

            {/* FAQ */}
            <section className="fc-reveal">
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
            <div className="fc-reveal rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Buying? Get an agent on your side</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Shortlist the agents who have actually closed deals like yours, ranked on official CEA transaction records.</p>
              <Link href="/property-agents/shortlist" className="mt-4 block rounded-lg bg-[var(--blue)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[var(--blue-deep)]">
                Build a shortlist
              </Link>
            </div>
            <div className="fc-reveal rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Selling?</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Get a free shortlist of listing agents who each quote their own commission, so you compare real figures.</p>
              <Link href="/sell" className="mt-4 block rounded-lg border border-[var(--line-2)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--blue-deep)] transition hover:bg-[var(--blue-wash)]">
                Compare agents
              </Link>
            </div>
            <div className="fc-reveal rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Related Guides</h3>
              <ul className="mt-3 space-y-2">
                <li><Link href="/guides/property-agent-commission" className="text-sm font-semibold text-[var(--blue)] hover:underline">Commission rates by property type</Link></li>
                <li><Link href="/guides/hdb-resale-agent-fee" className="text-sm text-[var(--blue)] hover:underline">HDB resale agent fee</Link></li>
                <li><Link href="/tools/commission-calculator" className="text-sm text-[var(--blue)] hover:underline">Commission calculator (free tool)</Link></li>
                <li><Link href="/guides/how-to-choose-property-agent" className="text-sm text-[var(--blue)] hover:underline">How to choose an agent</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <SellCtaBand source="guide_who_pays" heading="Know who pays. Now pick who is worth paying." sub="Compare agents on their real CEA transaction records, then contact the ones you choose. Always free." />
    </>
  );
}
