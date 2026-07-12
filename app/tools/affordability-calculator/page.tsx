import type { Metadata } from "next";
import Link from "next/link";
import AffordabilityCalculator from "./AffordabilityCalculator";
import EmbedSnippet from "./EmbedSnippet";
import SellCtaBand from "../../components/SellCtaBand";
import { MAS_RULES_VERIFIED_ON, MAS_TDSR_URL, MAS_LTV_URL } from "../../lib/affordability";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "How Much Home Can I Afford? Singapore TDSR Calculator",
  description:
    "Free Singapore home affordability calculator. Work out the maximum property price and loan you qualify for under MAS TDSR (55%), MSR (30% for HDB/EC), the 4% stress rate and LTV limits, plus your downpayment in cash and CPF.",
  alternates: { canonical: "https://fair-comparisons.com/tools/affordability-calculator" },
  openGraph: {
    title: "Home Affordability Calculator, Singapore (TDSR / MSR)",
    description: "Max property price and loan you qualify for under MAS TDSR/MSR, the 4% stress rate and LTV limits. Free.",
    url: "https://fair-comparisons.com/tools/affordability-calculator",
    type: "website",
    locale: "en_SG",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

const FAQ: [string, string][] = [
  [
    "How much home can I afford in Singapore?",
    "The maximum you can borrow is set by MAS rules. Your total monthly debt (including the new home loan) cannot exceed 55% of your gross monthly income (the TDSR). For an HDB flat or an EC bought from a developer, the home loan alone is also capped at 30% of income (the MSR). Banks stress-test the loan at a medium-term rate floor of 4%, so this calculator applies the same, then applies the LTV limit to give a maximum property price.",
  ],
  [
    "What is TDSR?",
    "The Total Debt Servicing Ratio caps your total monthly debt obligations at 55% of gross monthly income. It includes the home loan you are applying for plus car loans, student loans, credit card minimums and any other debt. Variable income such as commission, bonus or rent is subject to a minimum 30% haircut before it counts.",
  ],
  [
    "What is MSR and when does it apply?",
    "The Mortgage Servicing Ratio caps the monthly repayment on the home loan at 30% of gross monthly income. It applies only to HDB flats and to Executive Condominiums bought directly from a developer. For these, your loan is limited by whichever is lower, the MSR or the TDSR.",
  ],
  [
    "Why is a 4% interest rate used?",
    "MAS requires banks to compute TDSR and MSR using the higher of the actual rate and a medium-term interest rate floor, currently 4% for residential property. This stress test ensures you can still service the loan if rates rise. Your real monthly repayment at today's rate will usually be lower than the stress-test figure.",
  ],
  [
    "How much downpayment do I need?",
    "For your first housing loan the LTV limit is 75%, so the downpayment is 25% of the price, of which at least 5% must be cash and the rest can come from your CPF Ordinary Account. The LTV drops (and the downpayment rises) for a second or third loan, or if the loan runs past age 65 or beyond the standard tenure.",
  ],
];

export default function AffordabilityCalculatorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Singapore Home Affordability Calculator (TDSR / MSR)",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: "https://fair-comparisons.com/tools/affordability-calculator",
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
      { "@type": "ListItem", position: 2, name: "Affordability calculator", item: "https://fair-comparisons.com/tools/affordability-calculator" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />

      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">Free affordability calculator</div>
          <h1>How much home <span className="accent">can you afford?</span></h1>
          <p className="lp-hero__sub">
            See the maximum property price and loan you qualify for under Singapore&#39;s TDSR and MSR rules, stress-tested at 4%, with your downpayment split into cash and CPF.
          </p>
          <div className="lp-hero__tags">
            <span className="lp-hero__tag">TDSR 55% + MSR 30%</span>
            <span className="lp-hero__tag">MAS rules verified {MAS_RULES_VERIFIED_ON}</span>
            <span className="lp-hero__tag">Free</span>
          </div>
        </div>
      </header>

      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "0 40px 56px" }}>
          <AffordabilityCalculator />
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
          <p className="muted small" style={{ marginTop: 20 }}>
            Sources:{" "}
            <a href={MAS_TDSR_URL} target="_blank" rel="noopener" style={{ color: "var(--blue)" }}>MAS TDSR</a>,{" "}
            <a href={MAS_LTV_URL} target="_blank" rel="noopener" style={{ color: "var(--blue)" }}>MAS LTV and loan tenure</a>. This tool gives an estimate and is not a loan approval.
          </p>
          <p className="muted" style={{ marginTop: 14, fontSize: 14 }}>
            Planning the full picture? Try the{" "}
            <Link href="/tools/stamp-duty-calculator" style={{ color: "var(--blue)", fontWeight: 600 }}>stamp duty calculator</Link>{" "}
            and, if you are selling first, the{" "}
            <Link href="/tools/net-proceeds-calculator" style={{ color: "var(--blue)", fontWeight: 600 }}>net proceeds calculator</Link>.
          </p>
          <div style={{ marginTop: 28 }}>
            <EmbedSnippet />
          </div>
        </div>
      </section>

      <SellCtaBand source="affordability_calculator" heading="Selling to fund your next home?" sub="Compare the top agents for your area on their real transaction record, and get the strongest net proceeds to put toward your next place. Always free for sellers." />
    </>
  );
}
