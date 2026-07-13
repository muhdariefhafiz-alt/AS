import type { Metadata } from "next";
import Link from "next/link";
import { getAgentStats } from "../../lib/agentStats";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Agent Viewing Planner, Booking Link & Calendar Sync",
  description:
    "The FairComparisons Planner for Singapore property agents. Share one booking link; buyers request a viewing time; you confirm, complete or cancel from your dashboard, and confirmed viewings sync into your Google Calendar automatically. Free, no account needed for buyers.",
  alternates: { canonical: "https://fair-comparisons.com/for-agents/planner" },
  openGraph: {
    title: "Planner: your viewings, all in one place",
    description: "One booking link. Buyers request a time; you confirm and manage every viewing from your dashboard. Free.",
    url: "https://fair-comparisons.com/for-agents/planner",
    siteName: "FairComparisons", locale: "en_SG", type: "website",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

const FEATURES: { kicker: string; title: string; body: string; points: string[] }[] = [
  {
    kicker: "One booking link",
    title: "Let buyers pick a viewing time themselves",
    body: "You get a single, co-branded booking page at fair-comparisons.com/book/your-name. Share it in your listings, bio, email signature and messages. Buyers choose a property, a date and a time and send you the request, with no account and no back-and-forth.",
    points: ["Your photo, name and AgentScore on the page", "Buyers pick from clear time slots", "No account needed for the buyer"],
  },
  {
    kicker: "Every viewing in one place",
    title: "Confirm, complete or cancel from your dashboard",
    body: "Requests land in your Planner the moment they come in, with the property, time and the buyer's contact. Confirm the ones that work, mark viewings done, or cancel, and keep a tidy record of what is coming up.",
    points: ["New requests flagged for action", "Confirm / mark done / cancel in one tap", "The buyer's contact captured with every request"],
  },
  {
    kicker: "Works with your calendar",
    title: "Confirmed viewings sync to your Google Calendar",
    body: "Connect your calendar once from the dashboard. Every viewing you confirm is added to your own Google Calendar automatically, with the property, time and the buyer's details, so your day stays up to date wherever you check it. We only add viewing events; we never read the rest of your calendar.",
    points: ["Connect once, sync from then on", "Confirmed viewings added automatically", "We only write events, never read your calendar"],
  },
  {
    kicker: "Built on your record",
    title: "The link carries your independent AgentScore",
    body: "Because your booking page shows your AgentScore from real CEA, URA and HDB transaction data, a buyer requesting a viewing already sees the evidence that you sell. The Planner turns your track record into booked appointments.",
    points: ["Independent, unbuyable AgentScore", "Verified on real transaction records", "Turns your profile into appointments"],
  },
];

export default async function PlannerPage() {
  const stats = await getAgentStats();

  return (
    <>
      <header className="lp-hero">
        <div className="fc-wrap">
          <div className="lp-hero__eyebrow">For agents · Planner</div>
          <h1>Your viewings,<br /><span className="accent">all in one place.</span></h1>
          <p className="lp-hero__sub">
            Share one booking link. Buyers request a viewing time; you confirm, complete or cancel from your dashboard; and confirmed viewings sync into your Google Calendar automatically. No spreadsheets, no missed requests, no account needed for the buyer.
          </p>
          <div className="lp-hero__tags">
            <span className="lp-hero__tag">One shareable booking link</span>
            <span className="lp-hero__tag">Manage from your dashboard</span>
            <span className="lp-hero__tag">Syncs to Google Calendar</span>
            <span className="lp-hero__tag">Free</span>
          </div>
          <div style={{ marginTop: 24 }}>
            <Link href="/search" className="fc-btn fc-btn--primary fc-btn--lg">Find and claim your profile</Link>
          </div>
        </div>
      </header>

      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "56px 40px", display: "flex", flexDirection: "column", gap: 40 }}>
          {FEATURES.map((f) => (
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

      <section className="lp-section--paper">
        <div className="fc-wrap" style={{ padding: "48px 40px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(22px,3vw,30px)" }}>Part of your free agent toolkit</h2>
          <p className="muted" style={{ maxWidth: "60ch", margin: "12px auto 0" }}>
            Planner sits alongside <Link href="/for-agents/features" style={{ color: "var(--blue)", fontWeight: 600 }}>the full toolkit</Link> and <Link href="/for-agents/grow" style={{ color: "var(--blue)", fontWeight: 600 }}>Grow</Link> (Deal Radar prospecting, co-branded seller reports and a lead widget) in your dashboard. Being listed and ranked is always free.
          </p>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
            {[[stats.total, "agents profiled"], [stats.scored, "agents scored"], [stats.agencies, "agencies"]].map(([n, l]) => (
              <div key={String(l)}>
                <div className="serif" style={{ fontSize: 34, fontWeight: 700, color: "var(--blue)" }}>{Number(n).toLocaleString()}</div>
                <div className="muted small">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-hero">
        <div className="fc-wrap" style={{ textAlign: "center", padding: "56px 40px" }}>
          <h2 style={{ color: "#fff", fontSize: "clamp(26px,3vw,34px)" }}>Claim your profile and get your booking link.</h2>
          <p className="lp-hero__sub" style={{ margin: "12px auto 22px" }}>Free, no credit card. Start taking viewing requests today.</p>
          <Link href="/search" className="fc-btn fc-btn--primary fc-btn--lg">Find and claim your profile</Link>
        </div>
      </section>
    </>
  );
}
