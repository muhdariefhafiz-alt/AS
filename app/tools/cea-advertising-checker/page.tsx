import type { Metadata } from "next";
import Link from "next/link";
import CeaAdvertChecker from "./CeaAdvertChecker";
import { CEA_ADVERT_SOURCE_URL, CEA_PUBLIC_REGISTER_URL } from "../../lib/cea-advert";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CEA Advertising Checker: Property Ad Compliance",
  description:
    "Free pre-flight checker for Singapore property agents. Paste your listing ad and check it against CEA's advertising requirements: registration number, agency licence number, phone, and no misleading claims. Nothing is stored.",
  alternates: { canonical: "https://fair-comparisons.com/tools/cea-advertising-checker" },
  openGraph: {
    title: "CEA Property Advertising Compliance Checker",
    description:
      "Check your property advertisement against CEA's requirements in seconds. Free for agents.",
    url: "https://fair-comparisons.com/tools/cea-advertising-checker",
    type: "website",
    locale: "en_SG",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

const FAQ: [string, string][] = [
  [
    "What must a property advertisement include in Singapore?",
    "CEA requires every property advertisement to state the agent's name, CEA registration number and phone number, together with the property agency's name and CEA licence number. This lets consumers verify you on the CEA Public Register before they engage you.",
  ],
  [
    "Do newspaper classified ads need the full details?",
    "No. For newspaper classified advertisements and phone-text (SMS) advertising, CEA requires only the agent's name (in full or abbreviated) and phone number. All other media, including property portals, websites and social posts, need the full set of particulars.",
  ],
  [
    "Can I advertise a property without the owner's permission?",
    "No. A salesperson must obtain the client's prior consent before advertising their property. Advertising a property you are not authorised to market is a breach of CEA's rules.",
  ],
  [
    "What kinds of claims are not allowed?",
    "Under the Estate Agents Act and CEA's Professional Service Manual, advertisements must not contain false or misleading statements. Unverifiable superlatives and guarantees, for example 'guaranteed sale', 'cheapest', 'No. 1' or '100% sure', are risky unless you can substantiate them. This tool flags such phrases so you can review them.",
  ],
  [
    "How do buyers check that I am registered?",
    "Consumers key your advertised phone number into the CEA Public Register. If it does not resolve to a registered agent's profile, the listing looks like a scam, even if a name and registration number are shown. Make sure your advertised phone number matches your CEA profile.",
  ],
];

export default function CeaAdvertisingCheckerPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "CEA Property Advertising Compliance Checker",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://fair-comparisons.com/tools/cea-advertising-checker",
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
      { "@type": "ListItem", position: 2, name: "CEA advertising checker", item: "https://fair-comparisons.com/tools/cea-advertising-checker" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />

      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">Free tool for agents</div>
          <h1>Is your listing ad<br /><span className="accent">CEA-compliant?</span></h1>
          <p className="lp-hero__sub">
            Paste your property advertisement and check it against CEA&#39;s requirements before you publish: registration number, agency licence, phone, and no misleading claims. Runs entirely in your browser.
          </p>
          <div className="lp-hero__tags">
            <span className="lp-hero__tag">Checks CEA particulars</span>
            <span className="lp-hero__tag">Flags risky claims</span>
            <span className="lp-hero__tag">Nothing stored</span>
          </div>
        </div>
      </header>

      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "0 40px 56px" }}>
          <CeaAdvertChecker />
        </div>
      </section>

      <section className="lp-section--paper">
        <div className="fc-wrap" style={{ padding: "56px 40px", maxWidth: 820 }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,32px)" }}>What CEA requires in a property advertisement</h2>
          <p className="muted" style={{ marginTop: 12, fontSize: 15.5, lineHeight: 1.7 }}>
            Every advertisement on a property portal, website or social channel must show:
          </p>
          <ul className="muted" style={{ marginTop: 10, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 15 }}>
            <li>Your name, <strong>CEA registration number</strong> (for example R123456A), and phone number</li>
            <li>Your property agency&#39;s name and <strong>CEA licence number</strong> (for example L3008022J)</li>
          </ul>
          <p className="muted" style={{ marginTop: 14, fontSize: 15, lineHeight: 1.7 }}>
            For <strong>newspaper classified ads and SMS</strong>, only your name (full or abbreviated) and phone number are required. You must also have the owner&#39;s prior consent to advertise, and your advertisement must not contain false or misleading statements.
          </p>
          <p className="muted small" style={{ marginTop: 20 }}>
            Source:{" "}
            <a href={CEA_ADVERT_SOURCE_URL} target="_blank" rel="noopener" style={{ color: "var(--blue)" }}>CEA advertising requirements</a>{" "}
            and the{" "}
            <a href={CEA_PUBLIC_REGISTER_URL} target="_blank" rel="noopener" style={{ color: "var(--blue)" }}>CEA Public Register</a>. This tool is guidance, not legal advice.
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
            Working out your commission or a client&#39;s stamp duty? Try the{" "}
            <Link href="/tools/commission-calculator" style={{ color: "var(--blue)", fontWeight: 600 }}>commission calculator</Link>{" "}
            and the{" "}
            <Link href="/tools/stamp-duty-calculator" style={{ color: "var(--blue)", fontWeight: 600 }}>stamp duty calculator</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
