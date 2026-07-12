import type { Metadata } from "next";
import Link from "next/link";
import StampDutyCalculator from "./StampDutyCalculator";
import EmbedSnippet from "./EmbedSnippet";
import SellCtaBand from "../../components/SellCtaBand";
import { RATES_VERIFIED_ON, IRAS_BSD_URL, IRAS_ABSD_URL, IRAS_SSD_URL } from "../../lib/stamp-duty";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Singapore Stamp Duty Calculator: BSD, ABSD & SSD",
  description:
    "Free Singapore stamp duty calculator for buyers and sellers. Work out Buyer's Stamp Duty (BSD), Additional Buyer's Stamp Duty (ABSD) and Seller's Stamp Duty (SSD) on HDB, condo and landed property. Rates verified against IRAS.",
  alternates: { canonical: "https://fair-comparisons.com/tools/stamp-duty-calculator" },
  openGraph: {
    title: "Singapore Stamp Duty Calculator (BSD, ABSD, SSD)",
    description:
      "Calculate BSD, ABSD and SSD on Singapore property. Free, accurate and verified against IRAS rates.",
    url: "https://fair-comparisons.com/tools/stamp-duty-calculator",
    type: "website",
    locale: "en_SG",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

// FAQ answers are grounded in IRAS's published rates (verified on RATES_VERIFIED_ON).
const FAQ: [string, string][] = [
  [
    "How much is Buyer's Stamp Duty (BSD) in Singapore?",
    "BSD is charged on a tiered basis on the higher of the purchase price or market value. For residential property (rates from 15 Feb 2023): 1% on the first $180,000, 2% on the next $180,000, 3% on the next $640,000, 4% on the next $500,000, 5% on the next $1,500,000, and 6% on any amount above $3,000,000. As a quick reference, BSD on a $1,000,000 home is $24,600. Non-residential property tops out at 5%.",
  ],
  [
    "What are the current ABSD rates?",
    "Additional Buyer's Stamp Duty applies to residential property only. From 27 Apr 2023: a Singapore Citizen pays 0% on a first property, 20% on a second, and 30% on a third or subsequent. A Singapore PR pays 5% / 30% / 35%. Foreigners pay a flat 60% on any residential purchase, and entities pay 65%. ABSD is on top of BSD.",
  ],
  [
    "How does Seller's Stamp Duty (SSD) work after the July 2025 change?",
    "SSD is a flat rate on the sale price (or market value, whichever is higher) if you sell within the holding period. For residential property bought on or after 4 Jul 2025 the holding period is 4 years, with rates of 16% (within 1 year), 12% (1 to 2 years), 8% (2 to 3 years) and 4% (3 to 4 years); no SSD after 4 years. For property bought between 11 Mar 2017 and 3 Jul 2025 the window is 3 years at 12% / 8% / 4%.",
  ],
  [
    "Do I pay stamp duty on an HDB flat?",
    "Yes. BSD is payable on every Singapore property purchase, HDB or private. ABSD depends on your profile and how many residential properties you already own. HDB upgraders selling one flat to buy another are often granted ABSD remission upfront, subject to disposing of the first flat within the required window.",
  ],
  [
    "When is stamp duty payable?",
    "BSD and ABSD must be paid within 14 days of signing the contract or agreement (30 days if it is signed overseas). SSD must be paid within 14 days of the sale contract. Stamp duty is an upfront cost and cannot be deferred.",
  ],
];

const ABSD_ROWS: [string, string, string, string][] = [
  ["Singapore Citizen", "0%", "20%", "30%"],
  ["Singapore PR", "5%", "30%", "35%"],
  ["Foreigner", "60% (any residential property)", "", ""],
  ["Entity / company", "65% (any residential property)", "", ""],
];

export default function StampDutyCalculatorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Singapore Stamp Duty Calculator (BSD, ABSD, SSD)",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: "https://fair-comparisons.com/tools/stamp-duty-calculator",
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
      { "@type": "ListItem", position: 2, name: "Stamp duty calculator", item: "https://fair-comparisons.com/tools/stamp-duty-calculator" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />

      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">Free stamp duty calculator</div>
          <h1>Singapore stamp duty,<br /><span className="accent">worked out in seconds.</span></h1>
          <p className="lp-hero__sub">
            Calculate Buyer&#39;s Stamp Duty, ABSD and Seller&#39;s Stamp Duty on HDB, condo and landed property. Rates verified against IRAS, with every dollar shown.
          </p>
          <div className="lp-hero__tags">
            <span className="lp-hero__tag">BSD + ABSD + SSD</span>
            <span className="lp-hero__tag">Verified vs IRAS {RATES_VERIFIED_ON}</span>
            <span className="lp-hero__tag">Free</span>
          </div>
        </div>
      </header>

      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "0 40px 56px" }}>
          <StampDutyCalculator />
        </div>
      </section>

      <section className="lp-section--paper">
        <div className="fc-wrap" style={{ padding: "56px 40px", maxWidth: 860 }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,32px)" }}>How Singapore stamp duty works</h2>
          <p className="muted" style={{ marginTop: 12, fontSize: 15.5, lineHeight: 1.7 }}>
            There are three property stamp duties. Buyers pay <strong>Buyer&#39;s Stamp Duty (BSD)</strong> on every purchase, plus{" "}
            <strong>Additional Buyer&#39;s Stamp Duty (ABSD)</strong> depending on their profile and how many homes they own. Sellers pay{" "}
            <strong>Seller&#39;s Stamp Duty (SSD)</strong> only if they sell within the holding period. All three are charged on the higher of the price or market value.
          </p>

          <h3 className="serif" style={{ fontSize: 19, fontWeight: 600, marginTop: 28 }}>ABSD rates (residential, from 27 Apr 2023)</h3>
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--slate)" }}>
                  <th style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Buyer profile</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>1st property</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>2nd property</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>3rd or more</th>
                </tr>
              </thead>
              <tbody>
                {ABSD_ROWS.map((r) => (
                  <tr key={r[0]} style={{ borderTop: "1px solid var(--line, #e6e9f2)" }}>
                    <td style={{ padding: "10px 10px 10px 0", fontWeight: 600 }}>{r[0]}</td>
                    <td className="tnum" style={{ padding: "10px" }} colSpan={r[2] ? 1 : 3}>{r[1]}</td>
                    {r[2] ? <td className="tnum" style={{ padding: "10px" }}>{r[2]}</td> : null}
                    {r[3] ? <td className="tnum" style={{ padding: "10px" }}>{r[3]}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="serif" style={{ fontSize: 19, fontWeight: 600, marginTop: 28 }}>SSD rates (residential)</h3>
          <p className="muted" style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.65 }}>
            On or after 4 Jul 2025 (4-year window): <strong>16%</strong> within 1 year, <strong>12%</strong> in year 2, <strong>8%</strong> in year 3, <strong>4%</strong> in year 4, nil thereafter. Bought 11 Mar 2017 to 3 Jul 2025 (3-year window): 12% / 8% / 4%.
          </p>

          <p className="muted small" style={{ marginTop: 22 }}>
            Sources:{" "}
            <a href={IRAS_BSD_URL} target="_blank" rel="noopener" style={{ color: "var(--blue)" }}>IRAS BSD</a>,{" "}
            <a href={IRAS_ABSD_URL} target="_blank" rel="noopener" style={{ color: "var(--blue)" }}>IRAS ABSD</a>,{" "}
            <a href={IRAS_SSD_URL} target="_blank" rel="noopener" style={{ color: "var(--blue)" }}>IRAS SSD</a>. This calculator gives estimates and does not account for reliefs, remissions or refunds; confirm your figures with IRAS or your conveyancing lawyer.
          </p>
        </div>
      </section>

      <section className="lp-section">
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
            Working out your net proceeds too? Try the{" "}
            <Link href="/tools/commission-calculator" style={{ color: "var(--blue)", fontWeight: 600 }}>agent commission calculator</Link>.
          </p>
          <div style={{ marginTop: 28 }}>
            <EmbedSnippet />
          </div>
        </div>
      </section>

      <SellCtaBand source="stamp_duty_calculator" heading="Selling? Compare the agents who actually sell in your area" sub="Get a free shortlist of the top-ranked agents for your property, based on real transaction records. Each one quotes their own fee, so you compare on evidence." />
    </>
  );
}
