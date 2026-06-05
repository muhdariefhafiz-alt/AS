import type { Metadata } from "next";
import ValuationForm from "./ValuationForm";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "What's my home worth? Free HDB + condo valuation — Singapore",
  description:
    "Free instant home value estimate from real HDB resale and URA private transaction data. Get a value range, not a vague single number. PDPA-compliant.",
  alternates: { canonical: "https://fair-comparisons.com/tools/valuation" },
  openGraph: {
    title: "What's my home worth? Free Singapore valuation",
    description:
      "Instant HDB + condo value range from real transaction data. Free.",
    url: "https://fair-comparisons.com/tools/valuation",
    type: "website",
    locale: "en_SG",
    images: [{ url: "https://fair-comparisons.com/og-image.png", width: 1200, height: 630, alt: "FairComparisons" }],
  },
};

const HDB_TOWNS = [
  "ANG MO KIO", "BEDOK", "BISHAN", "BUKIT BATOK", "BUKIT MERAH",
  "BUKIT PANJANG", "BUKIT TIMAH", "CENTRAL AREA", "CHOA CHU KANG", "CLEMENTI",
  "GEYLANG", "HOUGANG", "JURONG EAST", "JURONG WEST", "KALLANG/WHAMPOA",
  "MARINE PARADE", "PASIR RIS", "PUNGGOL", "QUEENSTOWN", "SEMBAWANG",
  "SENGKANG", "SERANGOON", "TAMPINES", "TENGAH", "TOA PAYOH",
  "WOODLANDS", "YISHUN",
];

export default function ValuationPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Home valuation",
    serviceType: "Property value estimate",
    provider: {
      "@type": "Organization",
      name: "FairComparisons",
      url: "https://fair-comparisons.com",
    },
    areaServed: { "@type": "Country", name: "Singapore" },
    offers: { "@type": "Offer", price: 0, priceCurrency: "SGD" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">Free home valuation</div>
          <h1>What&apos;s your home worth?<br /><span className="accent">A real range, not a guess.</span></h1>
          <p className="lp-hero__sub">
            We estimate from actual HDB resale and URA private transaction data and give you a value range with a confidence score. No agent call required.
          </p>
          <div className="lp-hero__tags">
            <span className="lp-hero__tag">Real transaction data</span>
            <span className="lp-hero__tag">Range + confidence, not a single number</span>
            <span className="lp-hero__tag">Free · PDPA-compliant</span>
          </div>
        </div>
      </header>

      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "0 40px 56px" }}>
          <ValuationForm hdbTowns={HDB_TOWNS} />
        </div>
      </section>

      <section className="lp-section--paper">
        <div className="fc-wrap" style={{ padding: "64px 40px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(26px,3vw,34px)" }}>Why a range, not a single number?</h2>
          <p className="lede" style={{ margin: "16px auto 0", maxWidth: "64ch", color: "var(--slate)" }}>
            Any tool that gives you one exact figure is guessing with false precision. Two identical-looking flats can sell 10 to 15% apart on floor, facing, renovation and timing. We show you the band that recent comparable sales actually landed in, plus how many sales we based it on, so you know how much to trust it.
          </p>
        </div>
      </section>
    </>
  );
}
