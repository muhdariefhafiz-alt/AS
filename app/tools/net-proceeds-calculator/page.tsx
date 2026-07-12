import type { Metadata } from "next";
import Link from "next/link";
import NetProceedsCalculator from "./NetProceedsCalculator";
import EmbedSnippet from "./EmbedSnippet";
import SellCtaBand from "../../components/SellCtaBand";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Seller Net Proceeds Calculator, Singapore",
  description:
    "How much cash will you actually walk away with when you sell your HDB or condo? Free Singapore net-proceeds calculator: sale price minus agent commission, Seller's Stamp Duty, outstanding loan, CPF refund and legal fees.",
  alternates: { canonical: "https://fair-comparisons.com/tools/net-proceeds-calculator" },
  openGraph: {
    title: "Seller Net Proceeds Calculator, Singapore",
    description: "See your real cash in hand after commission, SSD, loan redemption and CPF refund. Free for sellers.",
    url: "https://fair-comparisons.com/tools/net-proceeds-calculator",
    type: "website",
    locale: "en_SG",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

const FAQ: [string, string][] = [
  [
    "What gets deducted from my sale price?",
    "From your sale price, the main deductions are: the agent's commission (plus GST if the agency is GST-registered), any Seller's Stamp Duty owed if you sell within the holding period, your outstanding home loan which is redeemed on completion, the CPF you must refund to your own CPF Ordinary Account (principal plus accrued interest), and legal or conveyancing fees. What is left is your cash in hand.",
  ],
  [
    "Is the CPF refund money I lose?",
    "No. The CPF you used for the purchase, plus the accrued interest, must be returned to your own CPF Ordinary Account when you sell. It is still your money and can fund your next home, but it does reduce the cash you physically receive from this sale, which is why the calculator subtracts it.",
  ],
  [
    "Do I owe Seller's Stamp Duty?",
    "Only if you sell a residential property within the holding period. For property bought on or after 4 Jul 2025 the window is 4 years (16% / 12% / 8% / 4%); for property bought between 11 Mar 2017 and 3 Jul 2025 it is 3 years (12% / 8% / 4%). Use the SSD section in the calculator, or the full stamp duty calculator, to check.",
  ],
  [
    "How much are legal fees when selling?",
    "Conveyancing fees for a sale are typically around S$1,800 to S$3,000, depending on the firm and the complexity of the transaction. The calculator defaults to S$2,500, which you can adjust.",
  ],
  [
    "How do I keep more of my proceeds?",
    "The largest lever you control is the agent commission. Rather than only haggling the percentage, compare agents on their real transaction record and let them quote their own fee. On FairComparisons you get a free shortlist of the top agents for your area and each quotes their commission, so you compare real numbers, always free for sellers.",
  ],
];

export default function NetProceedsCalculatorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Seller Net Proceeds Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: "https://fair-comparisons.com/tools/net-proceeds-calculator",
    provider: { "@type": "Organization", name: "FairComparisons", url: "https://fair-comparisons.com" },
    offers: { "@type": "Offer", price: 0, priceCurrency: "SGD" },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "Net proceeds calculator", item: "https://fair-comparisons.com/tools/net-proceeds-calculator" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />

      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">Free seller tool</div>
          <h1>What will you <span className="accent">actually walk away with?</span></h1>
          <p className="lp-hero__sub">
            See your real cash in hand after agent commission, Seller&#39;s Stamp Duty, loan redemption, CPF refund and legal fees. Built for Singapore HDB and private sellers.
          </p>
          <div className="lp-hero__tags">
            <span className="lp-hero__tag">HDB, condo, landed, EC</span>
            <span className="lp-hero__tag">SSD verified vs IRAS</span>
            <span className="lp-hero__tag">Free</span>
          </div>
        </div>
      </header>

      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "0 40px 56px" }}>
          <NetProceedsCalculator />
        </div>
      </section>

      <section className="lp-section--paper">
        <div className="fc-wrap" style={{ padding: "56px 40px", maxWidth: 820 }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,32px)" }}>Frequently asked questions</h2>
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 18 }}>
            {FAQ.map(([q, a]) => (
              <div key={q}>
                <h3 className="serif" style={{ fontSize: 18, fontWeight: 600 }}>{q}</h3>
                <p className="muted" style={{ marginTop: 6, fontSize: 15, lineHeight: 1.6 }}>{a}</p>
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 22, fontSize: 14 }}>
            Related tools: the{" "}
            <Link href="/tools/stamp-duty-calculator" style={{ color: "var(--blue)", fontWeight: 600 }}>stamp duty calculator</Link>{" "}
            and the{" "}
            <Link href="/tools/commission-calculator" style={{ color: "var(--blue)", fontWeight: 600 }}>agent commission calculator</Link>.
          </p>
          <div style={{ marginTop: 28 }}>
            <EmbedSnippet />
          </div>
        </div>
      </section>

      <SellCtaBand source="net_proceeds_calculator" heading="Keep more of your sale" sub="Compare the top agents for your area on their real transaction record. Each quotes their own commission, so you see exactly what your net proceeds could be." />
    </>
  );
}
