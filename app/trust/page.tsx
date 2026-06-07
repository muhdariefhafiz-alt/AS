import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "../lib/supabase";

export const revalidate = 43200; // 12h

export const metadata: Metadata = {
  title: "Trust & data: how FairComparisons stays independent",
  description:
    "How FairComparisons ranks Singapore property agents on government data, why rankings cannot be bought, where the data comes from, and how we make money. Independent and auditable.",
  alternates: { canonical: "https://fair-comparisons.com/trust" },
  openGraph: {
    title: "Trust & data: how FairComparisons stays independent",
    description:
      "Ranked on CEA, URA and HDB government records, not advertising. See our sources, freshness, and business model.",
    url: "https://fair-comparisons.com/trust",
    type: "website",
    locale: "en_SG",
    images: [{ url: "https://fair-comparisons.com/og-image.png", width: 1200, height: 630, alt: "FairComparisons" }],
  },
};

const SOURCES: [string, string][] = [
  ["CEA salesperson register", "Every recorded transaction by registration number, plus registration and agency membership, from the Council for Estate Agencies. This is the spine of the AgentScore and of each agent's transaction record."],
  ["URA private property data", "Caveat-lodged transaction prices for condos, apartments and landed homes, used for district market analysis and valuations."],
  ["HDB resale data (data.gov.sg)", "Resale transactions by town, flat type, storey and lease, used for HDB pricing, the MOP tracker and valuations."],
  ["Google agency ratings", "Public Google review ratings per agency, Bayesian-corrected so a handful of reviews cannot swing a score. This is the only non-government input, and it is capped at 15 of 100 points."],
];

const GUARANTEES: [string, string][] = [
  ["Rankings cannot be bought", "There is no paid placement, anywhere, ever. An agent cannot pay to rank higher. The agent subscription tools are clearly non-ranking."],
  ["We are paid by subscriptions, not by sales", "Agents may subscribe for reputation and analytics tools, and that is how we make money. We never take a cut of a sale, so our rankings are never for sale and we have no reason to favour anyone."],
  ["Free for sellers", "You never pay FairComparisons and we never take any cut of a sale. You compare every agent and contact the ones you choose yourself."],
];

const LIMITS: string[] = [
  "Scores reflect transactions in the public record. Off-market deals and very recent transactions may not appear yet.",
  "Government data is published with a lag, so an agent's most recent activity can take time to show.",
  "Google ratings are a minority input (15 of 100 points) and are corrected for review volume; they are not a measure of selling skill.",
];

export default async function TrustPage() {
  const [scoredRes, agencyRes, txnRes, freshRes] = await Promise.all([
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).not("score", "is", null),
    supabase.from("sg_agencies").select("id", { count: "exact", head: true }),
    supabase.from("sg_agent_transactions").select("id", { count: "exact", head: true }),
    supabase.from("sg_agents").select("score_updated_at").not("score_updated_at", "is", null).order("score_updated_at", { ascending: false }).limit(1).single(),
  ]);

  const scored = scoredRes.count ?? 10686;
  const agencies = agencyRes.count ?? 930;
  const txns = txnRes.count ?? 730000;
  const updated = freshRes.data?.score_updated_at
    ? new Date(freshRes.data.score_updated_at).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "Is FairComparisons independent?", acceptedAnswer: { "@type": "Answer", text: "Yes. Rankings are computed from CEA, URA and HDB government data and cannot be bought. There is no paid placement. We are paid by agent subscriptions, not by sales, so our rankings are never for sale and we have no reason to favour any agent a seller chooses." } },
      { "@type": "Question", name: "Where does the data come from?", acceptedAnswer: { "@type": "Answer", text: "The CEA salesperson register (transactions and registration), URA private transaction prices, HDB resale data via data.gov.sg, and public Google agency ratings (a capped, minority input)." } },
      { "@type": "Question", name: "How does FairComparisons make money?", acceptedAnswer: { "@type": "Answer", text: "Agents can claim their profile free and optionally subscribe for reputation and analytics tools: Verified S$29/mo, Professional S$69/mo, Elite S$149/mo. These tools never influence ranking. Sellers pay nothing and we never take a cut of a sale." } },
    ],
  };

  const Stat = ({ n, l }: { n: string; l: string }) => (
    <div className="fc-card fc-card--pad" style={{ textAlign: "center", background: "#fff" }}>
      <div className="serif" style={{ fontSize: 30, fontWeight: 600, color: "var(--blue)" }}>{n}</div>
      <div className="muted small" style={{ marginTop: 4 }}>{l}</div>
    </div>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />

      <header style={{ background: "var(--ink)", color: "#fff" }}>
        <div className="fc-wrap" style={{ padding: "60px 40px 52px" }}>
          <div className="eyebrow" style={{ color: "var(--slate-2)", marginBottom: 16 }}>Trust &amp; data</div>
          <h1 style={{ color: "#fff", fontSize: "var(--t-h1)", margin: 0, maxWidth: "20ch" }}>
            Built on government data, <span className="italic-serif">not advertising.</span>
          </h1>
          <p className="lede" style={{ color: "rgba(255,255,255,0.74)", marginTop: 16, maxWidth: "62ch" }}>
            FairComparisons ranks every CEA-registered agent in Singapore on the public transaction record. Every number
            traces to a government source, and nothing on this site can be paid for. Here is exactly how it works.
          </p>
        </div>
      </header>

      {/* Independence */}
      <section className="fc-wrap" style={{ padding: "56px 40px" }}>
        <div className="eyebrow">Independence</div>
        <h2 style={{ marginTop: 12 }}>Why you can trust the ranking.</h2>
        <div className="fc-grid-3" style={{ marginTop: 24 }}>
          {GUARANTEES.map(([t, d]) => (
            <div key={t} className="fc-card fc-card--pad">
              <div className="serif" style={{ fontWeight: 600, fontSize: 19 }}>{t}</div>
              <p className="muted" style={{ margin: "8px 0 0", fontSize: 14 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sources + freshness */}
      <section style={{ background: "var(--cloud)" }}>
        <div className="fc-wrap" style={{ padding: "56px 40px" }}>
          <div className="eyebrow">Where the data comes from</div>
          <h2 style={{ marginTop: 12 }}>Four sources, all auditable.</h2>
          {updated && (
            <p className="muted small" style={{ marginTop: 8 }}>
              AgentScores were last recalculated on <strong>{updated}</strong>, and refresh as new CEA data is ingested.
            </p>
          )}
          <div className="fc-grid-2" style={{ marginTop: 24 }}>
            {SOURCES.map(([t, d]) => (
              <div key={t} className="fc-card fc-card--pad" style={{ background: "#fff" }}>
                <div className="serif" style={{ fontWeight: 600, fontSize: 18 }}>{t}</div>
                <p className="muted" style={{ margin: "8px 0 0", fontSize: 14 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section className="fc-wrap" style={{ padding: "56px 40px" }}>
        <div className="eyebrow">Coverage</div>
        <h2 style={{ marginTop: 12 }}>The scale behind the scores.</h2>
        <div className="fc-grid-4" style={{ marginTop: 24 }}>
          <Stat n={scored.toLocaleString()} l="Agents scored on real data" />
          <Stat n={`${txns >= 1000 ? Math.round(txns / 1000).toLocaleString() + "k" : txns}+`} l="CEA transaction records" />
          <Stat n={agencies.toLocaleString()} l="Agencies covered" />
          <Stat n="28" l="Singapore districts" />
        </div>
      </section>

      {/* How we score + business model */}
      <section style={{ background: "var(--cloud)" }}>
        <div className="fc-wrap" style={{ padding: "56px 40px" }}>
          <div className="fc-grid-2" style={{ gap: 24 }}>
            <div className="fc-card fc-card--pad" style={{ background: "#fff" }}>
              <div className="eyebrow">How we score</div>
              <h2 style={{ marginTop: 10, fontSize: 24 }}>The AgentScore, in full.</h2>
              <p className="muted" style={{ marginTop: 8, fontSize: 14.5 }}>
                A 0 to 100 score from sale-weighted transaction volume (completed sales count most, rentals least), recency,
                market diversity, experience and agency reviews. For sellers, the ranking also weights whether an agent
                actually represents the seller, not just transacts.
              </p>
              <div className="fc-row" style={{ gap: 12, marginTop: 14 }}>
                <Link href="/about" className="fc-btn fc-btn--quiet fc-btn--sm">Read the methodology</Link>
                <Link href="/ai/methodology.json" className="fc-btn fc-btn--quiet fc-btn--sm">Machine-readable</Link>
              </div>
            </div>
            <div className="fc-card fc-card--pad" style={{ background: "#fff" }}>
              <div className="eyebrow">How we make money</div>
              <h2 style={{ marginTop: 10, fontSize: 24 }}>Paid by subscriptions, not by sales.</h2>
              <p className="muted" style={{ marginTop: 8, fontSize: 14.5 }}>
                Sellers pay nothing and we never take a cut of a sale. Agents can claim their profile free and optionally
                subscribe for reputation and analytics tools: Verified S$29/mo, Professional S$69/mo, Elite S$149/mo. The
                tools never influence ranking, so the ranking stays honest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Honest limitations */}
      <section className="fc-wrap" style={{ padding: "56px 40px", maxWidth: 820 }}>
        <div className="eyebrow">What we do not claim</div>
        <h2 style={{ marginTop: 12 }}>The limits, stated plainly.</h2>
        <ul style={{ marginTop: 18, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 10 }} className="muted">
          {LIMITS.map((l) => (
            <li key={l} style={{ fontSize: 14.5, lineHeight: 1.6 }}>{l}</li>
          ))}
        </ul>
        <p className="muted small" style={{ marginTop: 18 }}>
          Spotted something wrong in our data? <Link href="/contact" style={{ color: "var(--blue)", fontWeight: 600 }}>Tell us</Link> and we will check it against the source.
        </p>
      </section>

      {/* CTA */}
      <section className="fc-section fc-section--dark">
        <div className="fc-wrap" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#fff" }}>Choose your agent on evidence.</h2>
          <p className="lede" style={{ margin: "14px auto 24px", textAlign: "center" }}>
            Compare the agents who actually sell homes like yours, ranked on the data above, then contact the ones you choose.
          </p>
          <Link href="/sell?utm_source=trust" className="fc-btn fc-btn--primary fc-btn--lg">Compare agents</Link>
        </div>
      </section>
    </>
  );
}
