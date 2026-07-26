import type { Metadata } from "next";
import ValuationForm from "./ValuationForm";
import ProductBox from "../../components/ProductBox";
import { SellerCompareMock } from "../../components/mocks";
import ScrollReveal from "../../components/ScrollReveal";
import { MrtTrain } from "../../components/LineArt";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "What's My Home Worth? Free SG Valuation",
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

      <ScrollReveal />
      <header className="lp-hero" style={{ position: "relative", overflow: "hidden" }}>
        <MrtTrain className="fc-lineart fc-float" width={110} style={{ position: "absolute", right: "6%", top: 28, color: "var(--line-dk)" }} />
        <div className="fc-wrap" style={{ position: "relative" }}>
          <div className="lp-hero__eyebrow fc-hero-in fc-hero-in--1">Free home valuation</div>
          <h1 className="fc-hero-in fc-hero-in--2">What&apos;s your home worth?<br /><span className="accent">A real range, not a guess.</span></h1>
          <p className="lp-hero__sub fc-hero-in fc-hero-in--3">
            We estimate from actual HDB resale and URA private transaction data and give you a value range with a confidence score. No agent call required.
          </p>
          <div className="lp-hero__tags fc-hero-in fc-hero-in--4">
            <span className="lp-hero__tag">Real transaction data</span>
            <span className="lp-hero__tag">Range + confidence, not a single number</span>
            <span className="lp-hero__tag">Free · PDPA-compliant</span>
          </div>
        </div>
      </header>

      <section className="lp-section" style={{ position: "relative" }}>
        <div className="fc-wrap" style={{ padding: "0 40px 56px" }}>
          <ValuationForm hdbTowns={HDB_TOWNS} />
        </div>
      </section>

      <section className="lp-section--paper">
        <div className="fc-wrap fc-reveal" style={{ padding: "64px 40px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(26px,3vw,34px)" }}>Why a range, not a single number?</h2>
          <p className="lede" style={{ margin: "16px auto 0", maxWidth: "64ch", color: "var(--slate)" }}>
            Any tool that gives you one exact figure is guessing with false precision. Two identical-looking flats can sell 10 to 15% apart on floor, facing, renovation and timing. We show you the band that recent comparable sales actually landed in, plus how many sales we based it on, so you know how much to trust it.
          </p>
        </div>
      </section>

      <section className="lp-section">
        <div className="fc-wrap fc-reveal" style={{ padding: "0 40px 64px" }}>
          <ProductBox
            layout="hero"
            eyebrow="Next step"
            title="Know your value. Now compare the agents who sell at it."
            body="See every CEA-registered agent in your area ranked on their real transaction record, and invite up to three to quote. Free for sellers, and no agent can pay to rank higher."
            mockup={<SellerCompareMock />}
            cta={{ label: "See agents in your area", href: "/search", variant: "ink" }}
          />
        </div>
      </section>
    </>
  );
}
