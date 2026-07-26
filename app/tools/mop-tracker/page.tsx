import type { Metadata } from "next";
import MopTrackerForm from "./MopTrackerForm";
import ProductBox from "../../components/ProductBox";
import { SellerCompareMock } from "../../components/mocks";
import ScrollReveal from "../../components/ScrollReveal";
import { MrtTrain } from "../../components/LineArt";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "HDB MOP Tracker: When Can You Sell?",
  description:
    "Free MOP date + current value estimate for your HDB flat. Backed by HDB resale data and CEA-licensed agents. PDPA-compliant. No spam.",
  alternates: { canonical: "https://fair-comparisons.com/tools/mop-tracker" },
  openGraph: {
    title: "HDB MOP Tracker: When can you sell?",
    description:
      "Estimate your MOP date + flat value in 30 seconds. Free. Powered by HDB resale + CEA records.",
    url: "https://fair-comparisons.com/tools/mop-tracker",
    type: "website",
    locale: "en_SG",
    images: [{ url: "https://fair-comparisons.com/og-image.png", width: 1200, height: 630, alt: "FairComparisons" }],
  },
};

const HDB_TOWNS = [
  "ANG MO KIO",
  "BEDOK",
  "BISHAN",
  "BUKIT BATOK",
  "BUKIT MERAH",
  "BUKIT PANJANG",
  "BUKIT TIMAH",
  "CENTRAL AREA",
  "CHOA CHU KANG",
  "CLEMENTI",
  "GEYLANG",
  "HOUGANG",
  "JURONG EAST",
  "JURONG WEST",
  "KALLANG/WHAMPOA",
  "MARINE PARADE",
  "PASIR RIS",
  "PUNGGOL",
  "QUEENSTOWN",
  "SEMBAWANG",
  "SENGKANG",
  "SERANGOON",
  "TAMPINES",
  "TENGAH",
  "TOA PAYOH",
  "WOODLANDS",
  "YISHUN",
];

export default function MopTrackerPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "HDB MOP Tracker",
    serviceType: "Property MOP eligibility lookup",
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
          <div className="lp-hero__eyebrow fc-hero-in fc-hero-in--1">HDB MOP tracker</div>
          <h1 className="fc-hero-in fc-hero-in--2">When can you sell your HDB?<br /><span className="accent">And what is it worth right now?</span></h1>
          <p className="lp-hero__sub fc-hero-in fc-hero-in--3">
            Tell us your town, flat type, and roughly when you got your keys. We&apos;ll work out your MOP date and a value estimate from recent HDB resale data.
          </p>
          <div className="lp-hero__tags fc-hero-in fc-hero-in--4">
            <span className="lp-hero__tag">Live HDB resale data</span>
            <span className="lp-hero__tag">Top CEA-licensed agents per town</span>
            <span className="lp-hero__tag">Free · PDPA-compliant</span>
          </div>
        </div>
      </header>

      <section className="lp-section" style={{ position: "relative" }}>
        <div className="fc-wrap" style={{ padding: "0 40px 56px" }}>
          <MopTrackerForm hdbTowns={HDB_TOWNS} />
        </div>
      </section>

      <section className="lp-section--paper">
        <div className="fc-wrap fc-reveal" style={{ padding: "64px 40px" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(26px,3vw,34px)" }}>What we use to calculate this</h2>
          <div className="fc-scene fc-scene--grow" style={{ marginTop: 28, padding: "clamp(10px,1.6vw,14px)" }}>
          <div className="fc-grid-3">
            <div className="fc-card fc-card--pad fc-reveal" style={{ background: "#fff", ["--reveal-delay" as string]: "0s" }}>
              <div className="eyebrow">MOP</div>
              <p className="small" style={{ margin: "10px 0 0" }}>
                Standard 5-year minimum occupation, measured from your key collection date. We use the 1st of your chosen month as a fuzzy approximation. Plus and Prime BTOs have longer MOPs; check your purchase documents.
              </p>
            </div>
            <div className="fc-card fc-card--pad fc-reveal" style={{ background: "#fff", ["--reveal-delay" as string]: "0.06s" }}>
              <div className="eyebrow">Value estimate</div>
              <p className="small" style={{ margin: "10px 0 0" }}>
                Median resale price of the same flat type in your town over the last 6 months, sourced from HDB&apos;s public resale dataset on data.gov.sg.
              </p>
            </div>
            <div className="fc-card fc-card--pad fc-reveal" style={{ background: "#fff", ["--reveal-delay" as string]: "0.12s" }}>
              <div className="eyebrow">Top agents</div>
              <p className="small" style={{ margin: "10px 0 0" }}>
                Top 3 CEA-licensed agents who actually do HDB deals in your town, ranked by AgentScore: transaction volume, recency, locality and verified reviews.
              </p>
            </div>
          </div>
          </div>
        </div>
      </section>

      <section className="lp-section--paper">
        <div className="fc-wrap fc-reveal" style={{ padding: "0 40px 64px" }}>
          <ProductBox
            layout="hero"
            eyebrow="Next step"
            title="Know when you can sell. Line up the right agent now."
            body="Compare every CEA-registered agent who actually sells your flat type in your town, ranked on real transaction records, and invite up to three to quote when you are ready."
            mockup={<SellerCompareMock />}
            cta={{ label: "See agents in your town", href: "/search", variant: "ink" }}
          />
        </div>
      </section>
    </>
  );
}
