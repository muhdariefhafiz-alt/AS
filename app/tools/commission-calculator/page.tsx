import type { Metadata } from "next";
import Link from "next/link";
import CommissionCalculator from "./CommissionCalculator";
import EmbedSnippet from "./EmbedSnippet";
import SellCtaBand from "../../components/SellCtaBand";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Property Agent Commission Calculator (Singapore, 2026)",
  description:
    "Work out how much property agent commission you will pay in Singapore. Free calculator for HDB, condo, landed and rental, including GST. Based on real market rates.",
  alternates: { canonical: "https://fair-comparisons.com/tools/commission-calculator" },
  openGraph: {
    title: "Free Property Agent Commission Calculator, Singapore",
    description: "How much agent commission will you pay? Calculate for HDB, condo, landed and rental, including GST.",
    url: "https://fair-comparisons.com/tools/commission-calculator",
    type: "website",
    locale: "en_SG",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

const FAQ: [string, string][] = [
  ["How much is property agent commission in Singapore?", "Market norms are about 1% for HDB resale and 1 to 2% for private condo or landed resale, paid by the seller. Buyers who engage their own agent typically pay around 1%. For rentals, commission is usually 0.5 to 1 month of rent. These are market norms, not fixed rates: the Council for Estate Agencies states commission is negotiable."],
  ["Is GST charged on top of agent commission?", "Yes, if the agency is GST-registered. GST is 9% and is added on top of the commission. For example, 1% on a S$600,000 flat is S$6,000, plus S$540 GST, totalling S$6,540. This calculator lets you add GST."],
  ["Do buyers pay commission on a new launch?", "Usually not. For new launches the developer pays the agent commission, typically 2 to 5%, so buyers generally pay no agent fee."],
  ["Can I negotiate the commission rate?", "Yes. There is no legally fixed rate in Singapore. Rather than only haggling the percentage, negotiate on scope: photography, 3D tours, premium listings. On FairComparisons you can get a free shortlist and have agents quote their own commission so you compare real numbers."],
];

export default function CommissionCalculatorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Property Agent Commission Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: "https://fair-comparisons.com/tools/commission-calculator",
    provider: { "@type": "Organization", name: "FairComparisons", url: "https://fair-comparisons.com" },
    offers: { "@type": "Offer", price: 0, priceCurrency: "SGD" },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />

      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">Free commission calculator</div>
          <h1>How much agent commission<br /><span className="accent">will you actually pay?</span></h1>
          <p className="lp-hero__sub">
            Calculate property agent commission in Singapore for HDB, condo, landed and rental, with GST. Based on real market rates, not a sales pitch.
          </p>
          <div className="lp-hero__tags">
            <span className="lp-hero__tag">HDB, condo, landed, rental</span>
            <span className="lp-hero__tag">Includes 9% GST</span>
            <span className="lp-hero__tag">Free</span>
          </div>
        </div>
      </header>

      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "0 40px 56px" }}>
          <CommissionCalculator />
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
            For the full breakdown by property type, buyer vs seller, and how to negotiate, read the{" "}
            <Link href="/guides/property-agent-commission" style={{ color: "var(--blue)", fontWeight: 600 }}>property agent commission guide</Link>.
          </p>
          <div style={{ marginTop: 28 }}>
            <EmbedSnippet />
          </div>
        </div>
      </section>

      <SellCtaBand source="commission_calculator" heading="See what agents actually charge" sub="Get a free shortlist of the agents who sell homes like yours. Each one quotes their own commission, so you compare real fees side by side." />
    </>
  );
}
