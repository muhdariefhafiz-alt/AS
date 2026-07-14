import Link from "next/link";
import type { AgentFeatureData } from "../lib/agentFeatures";
import { FEATURE_LINKS } from "../lib/agentFeatures";
import ProductBox from "./ProductBox";
import { DealRadarMock, DemandMock, BuildingPageMock, WidgetMock } from "./mocks";

type Stats = { scored: number; total: number; agencies: number };

// A product-box creative per data-driven feature page. Slugs without an entry
// fall back to the plain section cards.
const MOCK_BY_SLUG: Record<string, React.ReactNode> = {
  "deal-radar": <DealRadarMock />,
  "demand-dashboard": <DemandMock />,
  "building-pages": <BuildingPageMock />,
  "badge-widget": <WidgetMock />,
};

// Shared renderer for the agent-feature marketing pages (/for-agents/<slug>).
// Mirrors the Planner/Grow landing style (lp-hero + fc-card sections) and
// adds FAQ + Breadcrumb + WebPage JSON-LD plus a toolkit cross-link section
// so every feature spoke links the hub and its siblings.
export default function AgentFeaturePage({ data, stats }: { data: AgentFeatureData; stats: Stats }) {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "For Agents", item: "https://fair-comparisons.com/for-agents" },
      { "@type": "ListItem", position: 3, name: data.name, item: `https://fair-comparisons.com/for-agents/${data.slug}` },
    ],
  };
  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.metaTitle,
    url: `https://fair-comparisons.com/for-agents/${data.slug}`,
    isPartOf: { "@type": "WebSite", name: "FairComparisons", url: "https://fair-comparisons.com" },
  };

  const featureMock = MOCK_BY_SLUG[data.slug] ?? null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd).replace(/</g, "\\u003c") }} />

      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">{data.eyebrow}</div>
          <h1>{data.heroH1}<br /><span className="accent">{data.heroAccent}</span></h1>
          <p className="lp-hero__sub">{data.heroSub}</p>
          <div className="lp-hero__tags">
            {data.tags.map((t) => (
              <span key={t} className="lp-hero__tag">{t}</span>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <Link href="/search" className="fc-btn fc-btn--primary fc-btn--lg">Find and claim your profile</Link>
          </div>
        </div>
      </header>

      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "56px 40px", display: "flex", flexDirection: "column", gap: 40 }}>
          {/* Lead the feature with a product box (mockup + the first section's
              copy) when this feature has a creative; the rest render as cards. */}
          {featureMock && data.sections[0] && (
            <ProductBox
              layout="hero"
              eyebrow={data.sections[0].kicker}
              title={data.sections[0].title}
              body={data.sections[0].body}
              mockup={featureMock}
              cta={{ label: "Claim your free profile", href: "/search", variant: "ink" }}
            />
          )}
          {(featureMock ? data.sections.slice(1) : data.sections).map((f) => (
            <div key={f.kicker} className="fc-card fc-card--pad" style={{ background: "#fff" }}>
              <p className="kicker" style={{ color: "var(--blue-deep)" }}>{f.kicker}</p>
              <h2 className="serif" style={{ fontSize: "clamp(21px,2.6vw,28px)", fontWeight: 600, margin: "6px 0 0", color: "var(--ink)" }}>{f.title}</h2>
              <p className="muted" style={{ marginTop: 10, fontSize: 15.5, lineHeight: 1.7, maxWidth: "68ch" }}>{f.body}</p>
              <ul style={{ marginTop: 14, paddingLeft: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                {f.points.map((p) => (
                  <li key={p} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "var(--slate)" }}>
                    <span style={{ color: "var(--blue)", fontWeight: 700 }}>+</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section--paper">
        <div className="fc-wrap" style={{ padding: "48px 40px" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(22px,3vw,30px)" }}>Frequently asked questions</h2>
          <div style={{ maxWidth: 720, margin: "24px auto 0", display: "flex", flexDirection: "column", gap: 18 }}>
            {data.faq.map((f) => (
              <div key={f.q}>
                <h3 style={{ fontSize: 15.5, fontWeight: 600, margin: 0, color: "var(--ink)" }}>{f.q}</h3>
                <p className="muted" style={{ margin: "6px 0 0", fontSize: 14.5, lineHeight: 1.65 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Toolkit cross-links + live stats */}
      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "48px 40px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(22px,3vw,30px)" }}>Part of your free agent toolkit</h2>
          <p className="muted" style={{ maxWidth: "60ch", margin: "12px auto 0" }}>
            Every tool lives in one dashboard, built on {""}
            {stats.scored.toLocaleString()} scored agents and the official records behind them. Being listed and ranked is free forever.
          </p>
          <p style={{ margin: "18px auto 0", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 18px", maxWidth: 720, fontSize: 14 }}>
            {FEATURE_LINKS.filter((l) => l.slug !== data.slug).map((l) => (
              <Link key={l.slug} href={`/for-agents/${l.slug}`} style={{ color: "var(--blue)", fontWeight: 600 }}>{l.label}</Link>
            ))}
            <Link href="/for-agents/portal-pricing" style={{ color: "var(--blue)", fontWeight: 600 }}>Portal pricing 2026</Link>
          </p>
        </div>
      </section>

      <section className="lp-hero">
        <div className="fc-wrap" style={{ textAlign: "center", padding: "56px 40px" }}>
          <h2 style={{ color: "#fff", fontSize: "clamp(26px,3vw,34px)" }}>Your profile is already live. Claim it free.</h2>
          <p className="lp-hero__sub" style={{ margin: "12px auto 22px" }}>No credit card. Your record, your tools, your leads.</p>
          <Link href="/search" className="fc-btn fc-btn--primary fc-btn--lg">Find and claim your profile</Link>
        </div>
      </section>
    </>
  );
}
