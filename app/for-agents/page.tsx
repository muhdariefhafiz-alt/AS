import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "../lib/supabase";
import PricingCards from "../components/PricingCards";

export const revalidate = false;

export const metadata: Metadata = {
  title: "For Property Agents - Claim Your Profile",
  description: "Your FairComparisons profile is live. Claim it for free to add your photo and bio, respond to seller invitations, and win listings on your record. 0.25% success fee, the 2026 launch rate, only on a completed sale.",
  alternates: { canonical: "https://fair-comparisons.com/for-agents" },
};

async function getStats() {
  const [scored, agencies, pages] = await Promise.all([
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).not("score", "is", null),
    supabase.from("sg_agencies").select("id", { count: "exact", head: true }),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }),
  ]);
  return {
    scored: scored.count ?? 10594,
    agencies: agencies.count ?? 930,
    total: pages.count ?? 30000,
  };
}

function Tick() {
  return (
    <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--blue)" }}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default async function ForAgentsPage() {
  const stats = await getStats();
  return (
    <>
      {/* hero */}
      <header className="lp-hero">
        <div className="fc-wrap" style={{ textAlign: "center" }}>
          <div className="lp-hero__eyebrow">For property agents</div>
          <h1 style={{ maxWidth: "18ch", margin: "16px auto 0" }}>
            You&apos;re judged on your <span className="accent">record,</span> not your wallet.
          </h1>
          <p className="lp-hero__sub" style={{ margin: "16px auto 0" }}>
            FairComparisons sends you sellers in your area who are ready to instruct an agent. No cost to be ranked, no cost to receive leads. You pay a 0.25% success fee, our 2026 launch rate, only when a referred sale completes, and never to rank higher.
          </p>
          <div style={{ display: "flex", gap: 48, justifyContent: "center", margin: "34px 0 30px", flexWrap: "wrap" }}>
            <div className="hstat"><div className="n tnum">{stats.scored.toLocaleString()}</div><div className="l">Agents scored</div></div>
            <div className="hstat"><div className="n tnum">28</div><div className="l">Districts</div></div>
            <div className="hstat"><div className="n">0%</div><div className="l">Upfront cost</div></div>
          </div>
          <Link href="/search" className="fc-btn fc-btn--primary fc-btn--lg">Claim your free profile</Link>
        </div>
      </header>

      {/* claimed vs unclaimed */}
      <section className="lp-section--paper">
        <div className="fc-wrap" style={{ padding: "64px 40px" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(26px,3vw,34px)" }}>Claimed vs unclaimed profiles</h2>
          <div className="fc-grid-2" style={{ marginTop: 28, gap: 18 }}>
            <div className="fc-card compare-col">
              <div className="eyebrow eyebrow--muted">Unclaimed (current)</div>
              <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0 }}>
                {["Name and CEA registration visible", "AgentScore and transaction history public", "No photo, no bio", "Cannot receive seller invitations"].map((t, i, a) => (
                  <li key={t} style={{ padding: "8px 0", borderBottom: i < a.length - 1 ? "1px solid var(--line)" : "none", color: "var(--slate)" }}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="fc-card compare-col" style={{ border: "1.5px solid var(--blue)" }}>
              <div className="eyebrow">Claimed (free)</div>
              <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0 }}>
                {["Add your photo and practice bio", "Respond to seller invitations from your area", "Get notified when buyers view your profile", "Embed your AgentScore widget on your site"].map((t, i, a) => (
                  <li key={t} style={{ display: "flex", gap: 9, padding: "8px 0", borderBottom: i < a.length - 1 ? "1px solid var(--line)" : "none" }}>
                    <Tick /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* how score works */}
      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "64px 40px" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(26px,3vw,34px)" }}>How your score is calculated</h2>
          <p className="muted" style={{ textAlign: "center", maxWidth: "60ch", margin: "12px auto 0" }}>
            The AgentScore is fully automated. Payment does not influence your ranking. The only way to improve your score is to close more transactions and deliver better service.
          </p>
          <div className="fc-grid-4" style={{ marginTop: 28 }}>
            {[["30", "Volume", "Total CEA transactions"], ["25", "Recency", "Recent activity weighted higher"], ["15", "Diversity", "Property and transaction types"], ["15", "Experience", "Years registered and consistency"]].map(([n, t, d]) => (
              <div key={t} className="fc-card fc-card--pad" style={{ textAlign: "center" }}>
                <div className="serif" style={{ fontWeight: 600, fontSize: 34, color: "var(--blue)" }}>{n}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{t}</div>
                <div className="small muted">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* pricing */}
      <section className="lp-section--paper">
        <div className="fc-wrap" style={{ padding: "64px 40px" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(26px,3vw,34px)" }}>Simple pricing</h2>
          <p className="muted" style={{ textAlign: "center", maxWidth: "60ch", margin: "12px auto 0" }}>
            Claiming your profile and receiving seller leads is always free. The paid tiers add analytics tools only. They never change your rank or the leads you receive.
          </p>
          <div style={{ marginTop: 28 }}><PricingCards /></div>
        </div>
      </section>

      {/* resources */}
      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "64px 40px" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(26px,3vw,34px)" }}>Resources for agents</h2>
          <div className="fc-grid-2" style={{ marginTop: 28, gap: 18 }}>
            <Link href="/for-agents/propertyguru-alternative" className="fc-card fc-card--pad fc-card--hover">
              <div className="eyebrow">Compare</div>
              <div className="serif" style={{ fontWeight: 600, fontSize: 20, margin: "8px 0 6px" }}>PropertyGuru alternative</div>
              <p className="muted small">How FairComparisons compares to PropertyGuru on pricing, features and visibility. The side-by-side breakdown.</p>
            </Link>
            <Link href="/for-agents/lead-generation" className="fc-card fc-card--pad fc-card--hover">
              <div className="eyebrow">Lead generation</div>
              <div className="serif" style={{ fontWeight: 600, fontSize: 20, margin: "8px 0 6px" }}>How agents get leads on FairComparisons</div>
              <p className="muted small">Buyers search Google for agents in their area. Your track record does the selling. See how it works.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* final CTA */}
      <section className="lp-hero">
        <div className="fc-wrap" style={{ textAlign: "center", padding: "56px 40px" }}>
          <h2 style={{ color: "#fff", fontSize: "clamp(26px,3vw,34px)" }}>Your profile is already being viewed by buyers.</h2>
          <p className="lp-hero__sub" style={{ margin: "12px auto 22px" }}>Claim it to control what they see.</p>
          <Link href="/search" className="fc-btn fc-btn--primary fc-btn--lg">Find and claim your profile</Link>
          <p className="small" style={{ color: "var(--slate-2)", marginTop: 16 }}>
            Questions? <a href="mailto:hello@fair-comparisons.com" style={{ color: "#fff" }}>hello@fair-comparisons.com</a>
          </p>
        </div>
      </section>
    </>
  );
}
