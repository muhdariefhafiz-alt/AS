import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Free Singapore Property Tools & Calculators",
  description:
    "Free calculators and tools for Singapore property: stamp duty (BSD/ABSD/SSD), home affordability (TDSR/MSR), seller net proceeds, agent commission, HDB MOP tracker, online valuation and a CEA advertising checker. All free, all built on real data.",
  alternates: { canonical: "https://fair-comparisons.com/tools" },
  openGraph: {
    title: "Free Singapore Property Tools & Calculators",
    description: "Stamp duty, affordability, net proceeds, commission, MOP, valuation and CEA compliance. All free.",
    url: "https://fair-comparisons.com/tools",
    type: "website",
    locale: "en_SG",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

type Tool = { href: string; title: string; desc: string; tag: string; forWhom: "Buyers" | "Sellers" | "Agents" | "Everyone" };

const TOOLS: Tool[] = [
  { href: "/tools/affordability-calculator", title: "Affordability calculator", desc: "The max property price and loan you qualify for under MAS TDSR, MSR, the 4% stress rate and LTV limits.", tag: "TDSR / MSR", forWhom: "Buyers" },
  { href: "/tools/stamp-duty-calculator", title: "Stamp duty calculator", desc: "Buyer's Stamp Duty, ABSD and Seller's Stamp Duty on any HDB, condo or landed property. Verified against IRAS.", tag: "BSD / ABSD / SSD", forWhom: "Everyone" },
  { href: "/tools/net-proceeds-calculator", title: "Net proceeds calculator", desc: "Your real cash in hand after commission, SSD, loan redemption, CPF refund and legal fees.", tag: "Cash in hand", forWhom: "Sellers" },
  { href: "/tools/commission-calculator", title: "Commission calculator", desc: "How much agent commission you'll pay for a sale or rental, including GST, on real market rates.", tag: "With GST", forWhom: "Sellers" },
  { href: "/tools/valuation", title: "Online valuation", desc: "An instant, data-backed estimate of what your HDB or condo is worth, from recent transactions.", tag: "Instant estimate", forWhom: "Sellers" },
  { href: "/tools/mop-tracker", title: "HDB MOP tracker", desc: "Check when your HDB flat reaches its 5-year Minimum Occupation Period and can be sold.", tag: "5-year MOP", forWhom: "Sellers" },
  { href: "/tools/cea-advertising-checker", title: "CEA advertising checker", desc: "Check your property listing ad against CEA's advertising requirements before you publish.", tag: "Compliance", forWhom: "Agents" },
];

export default function ToolsHubPage() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "FairComparisons Singapore property tools",
    itemListElement: TOOLS.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.title,
      url: `https://fair-comparisons.com${t.href}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd).replace(/</g, "\\u003c") }} />

      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">Free tools</div>
          <h1>Every number in a Singapore<br /><span className="accent">property move, worked out.</span></h1>
          <p className="lp-hero__sub">
            Free calculators and checkers built on real CEA, URA, HDB, IRAS and MAS data. No sign-up, nothing stored, always free.
          </p>
        </div>
      </header>

      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "40px 40px 64px" }}>
          <div className="fc-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
            {TOOLS.map((t) => (
              <Link key={t.href} href={t.href} className="fc-card fc-card--pad" style={{ display: "block", background: "#fff" }}>
                <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span className="fc-badge fc-badge--source" style={{ fontSize: 11 }}>{t.tag}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--slate)" }}>{t.forWhom}</span>
                </div>
                <h2 className="serif" style={{ fontSize: 19, fontWeight: 600, margin: "12px 0 6px", color: "var(--ink)" }}>{t.title}</h2>
                <p className="muted small" style={{ margin: 0, lineHeight: 1.55 }}>{t.desc}</p>
                <span style={{ display: "inline-block", marginTop: 12, color: "var(--blue)", fontWeight: 600, fontSize: 14 }}>Open tool &rarr;</span>
              </Link>
            ))}
          </div>

          <p className="muted" style={{ marginTop: 32, fontSize: 14, textAlign: "center" }}>
            Looking to sell? <Link href="/sell" style={{ color: "var(--blue)", fontWeight: 600 }}>Compare the top agents for your area</Link> on their real transaction record.
          </p>
        </div>
      </section>
    </>
  );
}
