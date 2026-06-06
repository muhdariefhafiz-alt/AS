import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { titleName, cleanAgency } from "../lib/names";
import SellForm from "./SellForm";
import SellerProof from "../components/SellerProof";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Sell your property: compare Singapore's top agents on real data",
  description:
    "Tell us about your HDB, condo or landed property and compare the top-ranked CEA agents for your area on actual transaction records. Contact the ones you choose. Always free for sellers.",
  alternates: { canonical: "https://fair-comparisons.com/sell" },
  openGraph: {
    title: "Sell your property: Singapore's data-driven agent comparison",
    description:
      "Compare the top CEA-licensed agents for your area on real transaction data, then contact the ones you choose. Always free for sellers.",
    url: "https://fair-comparisons.com/sell",
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

type PropertyType = "HDB" | "CONDO" | "LANDED" | "EC";

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ town?: string; district?: string; type?: string; agent?: string }>;
}) {
  // Discovery pages (district / best-area / search) deep-link here with context
  // so the seller lands on a pre-filled form instead of a blank one.
  const sp = await searchParams;

  // Per-agent "View profile" deep-link: ?agent=<slug> pins that agent
  // to the top of the resulting comparison (attribution).
  let pinnedAgent: { id: number; name: string; agency: string } | null = null;
  let agentPrimaryArea: string | null = null;
  if (sp.agent) {
    const { data: ag } = await supabase
      .from("sg_agents")
      .select("id, name, agency_name, primary_area")
      .eq("slug", sp.agent)
      .maybeSingle();
    if (ag) {
      pinnedAgent = {
        id: Number(ag.id),
        name: titleName(ag.name),
        agency: cleanAgency(ag.agency_name),
      };
      agentPrimaryArea = (ag.primary_area as string | null) ?? null;
    }
  }

  const typeParam = (sp.type ?? "").toUpperCase();
  let initialPropertyType: PropertyType =
    typeParam === "CONDO" || typeParam === "LANDED" || typeParam === "EC" ? typeParam : "HDB";
  let initialTown = (sp.town ?? "").toUpperCase();
  const initialDistrictCode = (sp.district ?? "").toUpperCase();

  // Best-effort prefill from the requested agent's primary area when the seller
  // arrived without their own context: if it's a known HDB town, seed it (the
  // seller can still change it). Most sellers requesting an agent are in that
  // agent's patch, so this saves a step without overriding explicit params.
  if (pinnedAgent && agentPrimaryArea && !initialTown && !initialDistrictCode) {
    const upper = agentPrimaryArea.split("/")[0].split(",")[0].trim().toUpperCase();
    if (HDB_TOWNS.includes(upper)) {
      initialTown = upper;
      initialPropertyType = "HDB";
    }
  }

  const { data: districts } = await supabase
    .from("sg_districts")
    .select("code, name")
    .order("code");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "FairComparisons agent comparison",
    provider: {
      "@type": "Organization",
      name: "FairComparisons",
      url: "https://fair-comparisons.com",
    },
    areaServed: { "@type": "Country", name: "Singapore" },
    serviceType: "Independent property agent comparison",
    offers: {
      "@type": "Offer",
      description:
        "Always free for sellers. FairComparisons is paid by agent subscriptions, not by sales, so its rankings are never for sale.",
      price: 0,
      priceCurrency: "SGD",
    },
  };

  const FAQ: { q: string; a: string }[] = [
    {
      q: "Is it really free for sellers?",
      a: "Yes. You never pay FairComparisons anything, and we never take a cut of your sale. We are an independent comparison platform: compare the agents, then contact the ones you choose yourself.",
    },
    {
      q: "Will agents spam me?",
      a: "No. We do not route your details to agents. You see the ranked comparison and reach out to the agents you choose, on your own terms. The platform is PDPA-compliant.",
    },
    {
      q: "How many agents will contact me?",
      a: "Only the ones you contact first. You compare the ranked agents for your area and decide who to reach out to, so you stay fully in control.",
    },
    {
      q: "How are you paid, and does it affect the ranking?",
      a: "We are paid by agent subscriptions for tools, not by sales, so our rankings are never for sale. Subscriptions never influence the order. Rankings come from CEA, URA and HDB transaction data and cannot be bought.",
    },
  ];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }}
      />

      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">Sell your property</div>
          <h1>Compare the agents who <span className="accent">actually sell</span> in your area.</h1>
          <p className="lp-hero__sub">
            Tell us about your home and compare every CEA-licensed agent for your area on real transaction records. Contact the ones you choose. Always free for sellers.
          </p>
          <div className="lp-hero__tags">
            <span className="lp-hero__tag">Based on 730,000+ CEA transactions</span>
            <span className="lp-hero__tag">Always free for sellers</span>
            <span className="lp-hero__tag">PDPA-compliant</span>
          </div>
          <SellerProof />
        </div>
      </header>

      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "0 40px 56px" }}>
          <SellForm
            hdbTowns={HDB_TOWNS}
            districts={districts ?? []}
            initialPropertyType={initialPropertyType}
            initialTown={initialTown}
            initialDistrictCode={initialDistrictCode}
            pinnedAgent={pinnedAgent}
          />
        </div>
      </section>

      <section className="lp-section--paper">
        <div className="fc-wrap" style={{ padding: "64px 40px" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(26px,3vw,34px)" }}>How it works</h2>
          <div className="fc-grid-4" style={{ marginTop: 28 }}>
            {[
              { n: "01", t: "Tell us about your home", d: "Property type, area, timeline. Takes 60 seconds." },
              { n: "02", t: "See the ranked agents", d: "Top 7 agents for your area based on actual CEA records." },
              { n: "03", t: "Compare on evidence", d: "Track record, area focus and sale-versus-rental mix, side by side." },
              { n: "04", t: "Contact who you choose", d: "Reach out to the agents you want, directly. You stay in control." },
            ].map((s) => (
              <div key={s.n} className="fc-card howcard">
                <div className="mono" style={{ color: "var(--blue)", fontSize: 13 }}>{s.n}</div>
                <div className="serif" style={{ fontWeight: 600, fontSize: 19, margin: "8px 0 6px" }}>{s.t}</div>
                <p className="small muted" style={{ margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Objection-handling FAQ. The three biggest seller hesitations: cost,
          spam, and how we make money. */}
      <section id="faq" className="lp-section">
        <div className="fc-wrap" style={{ padding: "56px 40px 72px", maxWidth: 820 }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(26px,3vw,34px)" }}>Common questions</h2>
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQ.map((f) => (
              <details key={f.q} className="fc-card fc-card--pad faq">
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 16, listStyle: "none" }}>
                  {f.q}
                </summary>
                <p className="muted" style={{ margin: "10px 0 0", fontSize: 14.5, lineHeight: 1.6 }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
          <p className="muted small" style={{ textAlign: "center", marginTop: 22 }}>
            Still have a question? <Link href="/contact" style={{ color: "var(--blue)", fontWeight: 600 }}>Contact us</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
