import Link from "next/link";
import type { Metadata } from "next";
import SellCtaBand from "../../components/SellCtaBand";
import ScrollReveal from "../../components/ScrollReveal";
import { HdbBlock } from "../../components/LineArt";

export const metadata: Metadata = {
  // The most-searched commission sub-variant: "hdb resale agent fee",
  // "hdb agent commission". Title answers the how-much intent. 55 chars.
  title: { absolute: "HDB Resale Agent Fee 2026: Rates, GST + Worked Examples" },
  description:
    "How much is the agent fee on an HDB resale? About 1% per side by market norm, not regulation. Worked examples at 2026 median prices, GST, and when you pay.",
  alternates: { canonical: "https://fair-comparisons.com/guides/hdb-resale-agent-fee" },
};

// Real aggregate context. Medians computed from our mirror of the official
// HDB resale transaction dataset (data.gov.sg), window Aug 2025 to Jul 2026,
// 24,289 transactions in total. Queried 2026-08-05; fee columns are 1% of the
// median and 1% + 9% GST, rounded to the nearest dollar.
const HDB_WINDOW = "Aug 2025 to Jul 2026";
const feeAtMedian = [
  { flatType: "3-room", median: "S$442,888", n: "5,791", fee: "S$4,429", feeGst: "S$4,827" },
  { flatType: "4-room", median: "S$630,000", n: "10,637", fee: "S$6,300", feeGst: "S$6,867" },
  { flatType: "5-room", median: "S$740,000", n: "5,667", fee: "S$7,400", feeGst: "S$8,066" },
  { flatType: "Executive", median: "S$910,000", n: "1,423", fee: "S$9,100", feeGst: "S$9,919" },
  { flatType: "All flat types", median: "S$630,000", n: "24,289", fee: "S$6,300", feeGst: "S$6,867" },
];

const townLinks = [
  { name: "Tampines", slug: "tampines" },
  { name: "Sengkang", slug: "sengkang" },
  { name: "Woodlands", slug: "woodlands" },
  { name: "Punggol", slug: "punggol" },
  { name: "Yishun", slug: "yishun" },
  { name: "Jurong West", slug: "jurong-west" },
];

const faqItems = [
  {
    q: "Is the 1% HDB agent fee fixed by CEA or HDB?",
    a: "No. Neither CEA nor HDB sets any commission rate. The 1% figure is a market norm that has been stable for years, and it is always negotiable between you and your agent. Whatever rate you agree, put it in writing in the estate agency agreement before the agent starts work.",
  },
  {
    q: "How much is the agent fee on a S$600,000 HDB flat?",
    a: "As an example: at the 1% market norm, the fee is S$6,000. If the agency is GST-registered, 9% GST is added on top, bringing it to S$6,540. If you negotiated a different rate, the fee scales accordingly; the percentage applies to the actual sale price.",
  },
  {
    q: "When do I pay my HDB resale agent?",
    a: "On completion, after the deal is done. For sellers the commission is typically deducted from the sale proceeds at the completion appointment, so you do not transfer money separately. You should never be asked to pay commission upfront, before the resale is approved and completed.",
  },
  {
    q: "Do HDB buyers pay an agent fee too?",
    a: "Only if the buyer engages their own agent, which typically costs about 1% of the purchase price by market norm. A buyer who deals directly with the seller's agent pays nothing, because each side pays only its own agent and CEA prohibits an agent from collecting from both sides.",
  },
  {
    q: "Is GST charged on top of the 1%?",
    a: "If the agent's agency is GST-registered, yes: 9% GST is added to the commission. Most large agencies are GST-registered. On a S$6,300 fee that adds S$567, for a total of S$6,867. Ask your agent up front whether their agency charges GST so the final number is not a surprise.",
  },
  {
    q: "What does the HDB agent fee include?",
    a: "The standard scope: pricing advice based on recent transactions, portal listings and marketing, conducting viewings, negotiating offers, and handling the HDB resale paperwork from Option to Purchase through the resale application to completion. Photography is usually included at a basic level. Confirm the exact scope in the agency agreement.",
  },
  {
    q: "Can I negotiate below 1%?",
    a: "Yes, every rate is negotiable. Be aware of the trade-off: a lower fee can mean less marketing spend and lower priority for your listing. Many sellers get more value negotiating scope at 1% (better photography, premium portal placement) than shaving the rate itself.",
  },
];

export default function HdbResaleAgentFeePage() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://fair-comparisons.com/guides" },
        { "@type": "ListItem", position: 3, name: "HDB Resale Agent Fee", item: "https://fair-comparisons.com/guides/hdb-resale-agent-fee" },
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
          <span className="text-gray-600">HDB Resale Agent Fee</span>
        </div>
      </nav>

      <ScrollReveal />
      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white" style={{ position: "relative", overflow: "hidden" }}>
        <HdbBlock className="fc-lineart fc-float" width={120} style={{ position: "absolute", right: "6%", top: 18, color: "var(--line-2)" }} />
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8" style={{ position: "relative" }}>
          <span className="fc-hero-in fc-hero-in--1 inline-block rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Costs</span>
          <h1 className="fc-hero-in fc-hero-in--2 mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">HDB Resale Agent Fee: What You Will Actually Pay</h1>
          <p className="fc-hero-in fc-hero-in--3 mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            The market norm is about 1% of the price per side: sellers pay their agent about 1%, buyers who engage their own agent pay about 1%. It is a norm, not a regulation, and it is negotiable. Below: what 1% comes to at real 2026 HDB prices, GST, when you pay, and what the fee includes.
          </p>
          <p className="fc-hero-in fc-hero-in--4 mono mt-3 text-xs" style={{ color: "var(--slate)" }}>
            Updated August 2026 · price medians from official HDB resale data, {HDB_WINDOW}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <article className="space-y-10">

            {/* Key Point */}
            <div className="fc-reveal fc-scene fc-scene--grow" style={{ padding: "clamp(10px,1.6vw,14px)" }}>
            <div className="rounded-xl border border-[var(--line)] bg-white p-6">
              <h2 className="text-lg font-bold text-gray-900">The key thing to know</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                No authority sets the HDB agent fee. CEA explicitly does not prescribe commission rates, and HDB does not either. The widely quoted 1% per side is a market norm, and every agent is free to quote above or below it, just as you are free to negotiate. Agree the rate and the scope in writing before the agent starts work.
              </p>
              <p className="mt-3 text-[15px] leading-[1.75] text-gray-600">
                HDB resale is the most standardized commission segment in Singapore: unlike private resale, where seller rates run 1% to 2%, both sides of an HDB deal typically pay their own agent about 1%. The full picture across property types is in our{" "}
                <Link href="/guides/property-agent-commission" className="font-medium text-[var(--blue)] underline">commission rates guide</Link>.
              </p>
            </div>
            </div>

            {/* Real-price fee table */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">What 1% Comes To at Real 2026 HDB Prices</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                Because the fee is a percentage, the dollar amount depends on your flat. The medians below are computed from official HDB resale transaction data ({HDB_WINDOW}, 24,289 resales islandwide); the fee columns show the 1% market norm applied to each median, before and after 9% GST:
              </p>
              <div className="fc-scene fc-scene--planner mt-4" style={{ padding: "clamp(14px,2.5vw,20px)" }}>
              <div className="overflow-x-auto rounded-xl bg-white p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      <th className="pb-2 pr-4">Flat type</th>
                      <th className="pb-2 pr-4 text-right">Median resale price</th>
                      <th className="pb-2 pr-4 text-right">Resales (12 mo)</th>
                      <th className="pb-2 pr-4 text-right">1% fee</th>
                      <th className="pb-2 text-right">1% + 9% GST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {feeAtMedian.map((r) => (
                      <tr key={r.flatType} className={r.flatType === "All flat types" ? "bg-gray-50" : undefined}>
                        <td className="py-2.5 pr-4 font-medium text-gray-900">{r.flatType}</td>
                        <td className="py-2.5 pr-4 text-right text-gray-600">{r.median}</td>
                        <td className="py-2.5 pr-4 text-right text-gray-600">{r.n}</td>
                        <td className="py-2.5 pr-4 text-right font-bold text-gray-900">{r.fee}</td>
                        <td className="py-2.5 text-right font-bold text-gray-900">{r.feeGst}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
              <p className="mono mt-3 text-xs" style={{ color: "var(--slate)" }}>
                Medians per flat type, official HDB resale transactions, {HDB_WINDOW}. Sample size per row in the table. Fee columns are worked examples at the 1% norm, not quotes.
              </p>
              <p className="mt-4 text-[15px] leading-[1.75] text-gray-600">
                Your flat is not the median, so run your own number through the free{" "}
                <Link href="/tools/commission-calculator" className="font-medium text-[var(--blue)] underline">commission calculator</Link>, or{" "}
                <Link href="/sell" className="font-medium text-[var(--blue)] underline">get real quotes</Link>{" "}
                from agents who each state their own rate.
              </p>
            </section>

            {/* GST */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">GST: The 9% Most Sellers Forget</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  If your agent&apos;s agency is GST-registered, 9% GST is charged on top of the commission. Most of the large agencies are GST-registered, so in practice the &quot;1% fee&quot; is usually 1.09% of the price once GST is included. As an example, on a S$550,000 flat: S$5,500 commission plus S$495 GST is S$5,995 in total.
                </p>
                <p>
                  Smaller agencies below the GST registration threshold may not charge GST. This is worth confirming before you sign: ask directly whether the quoted rate is inclusive or exclusive of GST, and have the agreement state the answer.
                </p>
              </div>
            </section>

            {/* When is it paid */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">When the Fee Is Paid</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  Commission is payable on completion, when the resale actually goes through. For sellers, it is typically deducted from the sale proceeds at the completion appointment at HDB Hub or with your conveyancing lawyer, so you rarely hand over money separately. Buyers who engaged their own agent settle their agent&apos;s invoice at completion as well.
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li><strong>Never upfront.</strong> An agent asking for commission before the resale is approved and completed is a red flag.</li>
                  <li><strong>No deal, no fee.</strong> If the sale falls through, commission is generally not payable. Check your agency agreement for the exact terms before signing.</li>
                  <li><strong>Timeline context:</strong> HDB resale completion is typically about 8 weeks after HDB accepts the resale application. The full sequence is in our{" "}
                  <Link href="/guides/hdb-resale-process" className="font-medium text-[var(--blue)] underline">HDB resale process guide</Link>.</li>
                </ul>
              </div>
            </section>

            {/* What's included */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">What the Fee Includes</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  For a seller, the 1% typically covers the whole journey from listing to key handover:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li><strong>Pricing advice</strong> based on recent resale transactions in your block and town</li>
                  <li><strong>Marketing</strong>: portal listings (PropertyGuru, 99.co and similar), photos, and listing copy</li>
                  <li><strong>Viewings</strong>: scheduling and conducting them, and screening buyers on eligibility and budget</li>
                  <li><strong>Negotiation</strong> on price, timeline, and temporary extension of stay if you need one</li>
                  <li><strong>HDB paperwork</strong>: Option to Purchase, the resale application, and coordination through to the completion appointment</li>
                </ul>
                <p>
                  Premium extras such as professional video, 3D tours, or home staging are not automatically included; some agents add them at the standard rate, others charge separately. Pin down the scope in the agreement, not in chat messages.
                </p>
              </div>
            </section>

            {/* Negotiating */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">Negotiating the Rate</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  Because no rate is prescribed, everything is negotiable. Two honest observations from the data: commission percentage is a weak predictor of outcome, and who you hire is a strong one. Our{" "}
                  <Link href="/insights/property-agent-statistics-singapore" className="font-medium text-[var(--blue)] underline">study of 1.34 million CEA transactions</Link>{" "}
                  found the median active selling agent closes about one home a year, so an agent with a deep record in your town is worth more than a 0.25% discount from one without.
                </p>
                <p>
                  If you do negotiate, negotiate scope before rate: at the same 1%, ask for professional photography or premium portal placement. Detailed tactics are in the{" "}
                  <Link href="/guides/property-agent-commission" className="font-medium text-[var(--blue)] underline">main commission guide</Link>.
                </p>
              </div>
            </section>

            {/* Town links */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">Selling in a Specific Town?</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                Prices, and therefore fees, vary a lot by town. See the current market and the top-performing agents where your flat is:
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {townLinks.map((t) => (
                  <Link key={t.slug} href={`/sell/hdb/${t.slug}`} className="rounded-full border border-[var(--line-2)] px-4 py-2 text-sm font-medium text-[var(--blue-deep)] transition hover:bg-[var(--blue-wash)]">
                    Sell HDB in {t.name}
                  </Link>
                ))}
              </div>
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
              <h3 className="text-sm font-bold text-gray-900">Selling your flat?</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Get a free shortlist of the agents who actually sell flats like yours. Each one quotes their own fee, so you compare real numbers.</p>
              <Link href="/sell" className="mt-4 block rounded-lg bg-[var(--blue)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[var(--blue-deep)]">
                Compare agents
              </Link>
            </div>
            <div className="fc-reveal rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Buying?</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Shortlist buyer-side agents on their real CEA transaction record for your target area.</p>
              <Link href="/property-agents/shortlist" className="mt-4 block rounded-lg border border-[var(--line-2)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--blue-deep)] transition hover:bg-[var(--blue-wash)]">
                Build a shortlist
              </Link>
            </div>
            <div className="fc-reveal rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Related Guides</h3>
              <ul className="mt-3 space-y-2">
                <li><Link href="/guides/property-agent-commission" className="text-sm font-semibold text-[var(--blue)] hover:underline">Commission rates by property type</Link></li>
                <li><Link href="/guides/who-pays-agent-commission" className="text-sm text-[var(--blue)] hover:underline">Who pays the commission?</Link></li>
                <li><Link href="/tools/commission-calculator" className="text-sm text-[var(--blue)] hover:underline">Commission calculator (free tool)</Link></li>
                <li><Link href="/guides/hdb-resale-process" className="text-sm text-[var(--blue)] hover:underline">HDB resale process</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <SellCtaBand source="guide_hdb_fee" heading="Paying about 1%? Make it count." sub="Get a free shortlist of the agents who actually sell HDB flats like yours, ranked on real transaction records. Each agent quotes their own fee." />
    </>
  );
}
