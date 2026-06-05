import type { Metadata } from "next";
import MopTrackerForm from "./MopTrackerForm";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "HDB MOP Tracker — Check when your flat is eligible to sell",
  description:
    "Free MOP date + current value estimate for your HDB flat. Backed by HDB resale data and CEA-licensed agents. PDPA-compliant. No spam.",
  alternates: { canonical: "https://fair-comparisons.com/tools/mop-tracker" },
  openGraph: {
    title: "HDB MOP Tracker — When can you sell?",
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

      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">HDB MOP tracker</div>
          <h1>When can you sell your HDB?<br /><span className="accent">And what is it worth right now?</span></h1>
          <p className="lp-hero__sub">
            Tell us your town, flat type, and roughly when you got your keys. We&apos;ll work out your MOP date and a value estimate from recent HDB resale data.
          </p>
          <div className="lp-hero__tags">
            <span className="lp-hero__tag">Live HDB resale data</span>
            <span className="lp-hero__tag">Top CEA-licensed agents per town</span>
            <span className="lp-hero__tag">Free · PDPA-compliant</span>
          </div>
        </div>
      </header>

      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "0 40px 56px" }}>
          <MopTrackerForm hdbTowns={HDB_TOWNS} />
        </div>
      </section>

      <section className="lp-section--paper">
        <div className="fc-wrap" style={{ padding: "64px 40px" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(26px,3vw,34px)" }}>What we use to calculate this</h2>
          <div className="fc-grid-3" style={{ marginTop: 28 }}>
            <div className="fc-card fc-card--pad">
              <div className="eyebrow">MOP</div>
              <p className="small" style={{ margin: "10px 0 0" }}>
                Standard 5-year minimum occupation, measured from your key collection date. We use the 1st of your chosen month as a fuzzy approximation. Plus and Prime BTOs have longer MOPs; check your purchase documents.
              </p>
            </div>
            <div className="fc-card fc-card--pad">
              <div className="eyebrow">Value estimate</div>
              <p className="small" style={{ margin: "10px 0 0" }}>
                Median resale price of the same flat type in your town over the last 6 months, sourced from HDB&apos;s public resale dataset on data.gov.sg.
              </p>
            </div>
            <div className="fc-card fc-card--pad">
              <div className="eyebrow">Top agents</div>
              <p className="small" style={{ margin: "10px 0 0" }}>
                Top 3 CEA-licensed agents who actually do HDB deals in your town, ranked by AgentScore: transaction volume, recency, locality and verified reviews.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
