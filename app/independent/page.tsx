import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Independent by design: rankings that cannot be bought",
  description:
    "FairComparisons ranks Singapore property agents on government transaction records, not advertising. No agent can pay to appear higher, we are not a listing portal, and we are paid by agent subscriptions, not by sales, so our rankings are never for sale.",
  alternates: { canonical: "https://fair-comparisons.com/independent" },
  openGraph: {
    title: "Independent by design: rankings that cannot be bought",
    description:
      "We rank Singapore property agents on CEA, URA and HDB transaction records, not advertising spend. No paid placement, ever.",
    url: "https://fair-comparisons.com/independent",
    type: "article",
    locale: "en_SG",
    images: [{ url: "https://fair-comparisons.com/og-image.png", width: 1200, height: 630, alt: "FairComparisons" }],
  },
};

const FAQ = [
  {
    q: "Can an agent pay to rank higher on FairComparisons?",
    a: "No. There is no paid placement and no advertising. AgentScore is computed from CEA, URA and HDB transaction records, and no input that feeds it can be purchased.",
  },
  {
    q: "How do you make money, then?",
    a: "Sellers use FairComparisons for free and we never take a cut of a sale. Agents can claim their profile free and optionally subscribe for reputation and analytics tools (Verified S$29/mo, Professional S$69/mo, Elite S$149/mo). These subscriptions are tools only and never influence ranking, so we have no reason to favour one agent over another.",
  },
  {
    q: "Do you cover every agent?",
    a: "We list every CEA-registered agent we hold a record for, and we rank the ones with a recorded transaction. An agent with no transactions on file is shown as having no recorded activity, never inflated.",
  },
];

export default async function IndependentPage() {
  const [scoredRes, totalRes, txnRes] = await Promise.all([
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).not("score", "is", null).gte("score", 1),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }),
    supabase.from("sg_agent_transactions").select("id", { count: "exact", head: true }),
  ]);
  const scored = scoredRes.count ?? 10686;
  const total = totalRes.count ?? 30740;
  const txns = txnRes.count ?? 730000;

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "Independent by design", item: "https://fair-comparisons.com/independent" },
    ],
  };

  const PRINCIPLES = [
    {
      h: "No paid placement, ever",
      p: "AgentScore is built from CEA, URA and HDB transaction records. No agent can buy a higher position, a badge, or a better score. There is nothing on the page an agent can pay to change.",
    },
    {
      h: "We are not a listing portal",
      p: "We do not sell agent profiles, listing credits or advertising packages. That is the whole business model of the big property portals, and it is the reason their agent rankings cannot be neutral. It is not ours.",
    },
    {
      h: "Paid by subscriptions, not by sales",
      p: `Sellers pay nothing and we never take a cut of a sale. We are paid by optional agent subscriptions for reputation and analytics tools, which never influence ranking. We are never paid more for steering you toward a particular agent, so we are free to simply show you the record.`,
    },
    {
      h: "The transaction record is the spine",
      p: `Every ranking starts from what an agent has actually transacted, across ${txns.toLocaleString()}+ government records. Agency review ratings are a small, Bayesian-corrected part of the score, never the foundation.`,
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />

      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">Why trust us</div>
          <h1>Independent <span className="accent">by design</span>.</h1>
          <p className="lp-hero__sub">
            We rank Singapore property agents on government transaction records, not advertising. No agent can pay to appear higher. We list {total.toLocaleString()}+ CEA-registered agents and rank the {scored.toLocaleString()} with a recorded transaction, on the same public data for everyone.
          </p>
        </div>
      </header>

      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "8px 40px 48px", maxWidth: 860 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {PRINCIPLES.map((c) => (
              <div key={c.h} className="fc-card fc-card--pad">
                <h2 className="serif" style={{ fontSize: 21, fontWeight: 600, margin: 0 }}>{c.h}</h2>
                <p className="muted" style={{ margin: "8px 0 0", lineHeight: 1.7 }}>{c.p}</p>
              </div>
            ))}
          </div>

          <div className="fc-card fc-card--pad" style={{ marginTop: 32, background: "var(--cloud)" }}>
            <div className="kicker">How this differs from advertising-funded directories</div>
            <p style={{ margin: "10px 0 0", lineHeight: 1.7 }}>
              Most agent directories in Singapore are run by property listing portals funded by agent advertising. On those platforms, how prominently an agent appears is influenced by the subscription package they buy and how many listings they run, and the reviews shown usually come only from users who contacted that agent through the platform. None of that reflects how much property the agent has actually sold.
            </p>
            <p style={{ margin: "12px 0 0", lineHeight: 1.7 }}>
              FairComparisons works the other way round. We start from the government transaction record, the one thing an agent cannot buy or edit, and let that decide the ranking. You can read the full method on our{" "}
              <Link href="/how-we-score" style={{ color: "var(--blue)", fontWeight: 600 }}>scoring page</Link>.
            </p>
          </div>

          <h2 style={{ fontSize: "clamp(24px,2.8vw,32px)", marginTop: 48 }}>Common questions</h2>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQ.map((f) => (
              <details key={f.q} className="fc-card fc-card--pad">
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 16, listStyle: "none" }}>{f.q}</summary>
                <p className="muted" style={{ margin: "10px 0 0", fontSize: 14.5, lineHeight: 1.7 }}>{f.a}</p>
              </details>
            ))}
          </div>

          <div className="fc-row" style={{ gap: 12, marginTop: 36, flexWrap: "wrap" }}>
            <Link href="/property-agents" className="fc-btn fc-btn--primary">Compare agents</Link>
            <Link href="/how-we-score" className="fc-btn fc-btn--ghost">How we score</Link>
          </div>
        </div>
      </section>
    </>
  );
}
