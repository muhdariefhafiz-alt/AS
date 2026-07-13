import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "../lib/supabase";
import PricingCards from "../components/PricingCards";
import ScrollReveal from "../components/ScrollReveal";
import DashboardPreview from "../components/DashboardPreview";
import PlannerPreview from "../components/PlannerPreview";
import AgentFeatureShowcase from "../components/AgentFeatureShowcase";
import AgentIntegrationHub from "../components/AgentIntegrationHub";
import AgentTrustSection from "../components/AgentTrustSection";

export const revalidate = false;

export const metadata: Metadata = {
  title: "For Property Agents - Claim Your Profile",
  description: "Your FairComparisons profile is live. Claim it free to add your photo and bio and be found by sellers comparing agents on real CEA data. Optional subscriptions add reputation and analytics tools and never influence ranking: Verified S$29/mo, Professional S$69/mo, Elite S$149/mo.",
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
      {/* Scroll-reveal engine (animates .fc-reveal sections as they enter view). */}
      <ScrollReveal />

      {/* hero — staggered load-in, benefit-led */}
      <header className="lp-hero">
        <div className="fc-wrap" style={{ textAlign: "center" }}>
          <div className="lp-hero__eyebrow fc-hero-in fc-hero-in--1">For property agents</div>
          <h1 className="fc-hero-in fc-hero-in--2" style={{ maxWidth: "18ch", margin: "16px auto 0" }}>
            You&apos;re judged on your <span className="accent">record,</span> not your wallet.
          </h1>
          <div className="fc-hero-in fc-hero-in--3" style={{ margin: "18px auto 0", maxWidth: "46ch", display: "flex", flexDirection: "column", gap: 7, fontSize: 16.5, lineHeight: 1.5, color: "var(--slate)" }}>
            <span>Know who&apos;s about to sell, before your competitors.</span>
            <span>Win listings on your track record, not your ad budget.</span>
            <span>Every tool you need, in one free dashboard.</span>
          </div>
          <p className="lp-hero__sub fc-hero-in fc-hero-in--4" style={{ margin: "18px auto 0", fontSize: 14.5 }}>
            Sellers compare every CEA-registered agent on real transaction data and invite the ones they choose. Free to be ranked, free to be found. Subscriptions add tools, never rank.
          </p>
          <div className="fc-hero-in fc-hero-in--4" style={{ display: "flex", gap: 48, justifyContent: "center", margin: "30px 0 26px", flexWrap: "wrap" }}>
            <div className="hstat"><div className="n tnum">{stats.scored.toLocaleString()}</div><div className="l">Agents scored</div></div>
            <div className="hstat"><div className="n tnum">28</div><div className="l">Districts</div></div>
            <div className="hstat"><div className="n">0%</div><div className="l">Upfront cost</div></div>
          </div>
          <div className="fc-hero-in fc-hero-in--5">
            <Link href="/search" className="fc-btn fc-btn--primary fc-btn--lg">Claim your free profile</Link>
          </div>

          {/* Product-forward hero (housapp move): the real dashboard, in miniature. */}
          <div className="fc-hero-in fc-hero-in--5" style={{ marginTop: 44, padding: "0 8px" }}>
            <DashboardPreview />
            <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--slate-2)" }}>
              Your dashboard the moment you claim: your standing, your leads, your daily worklist.
            </p>
          </div>
        </div>
      </header>

      {/* Reposition: the neutral layer that outlives any agency super-app */}
      <section className="lp-section">
        <div className="fc-wrap fc-reveal" style={{ padding: "56px 40px", textAlign: "center" }}>
          <div className="lp-hero__eyebrow" style={{ justifyContent: "center" }}>Your identity, not your agency&apos;s</div>
          <h2 style={{ maxWidth: "24ch", margin: "12px auto 0", fontSize: "clamp(24px,3vw,32px)" }}>
            Agencies change. Your record and your phone number don&apos;t.
          </h2>
          <p className="muted" style={{ maxWidth: "62ch", margin: "16px auto 0", fontSize: 15.5, lineHeight: 1.7 }}>
            Most agents move between agencies over a career, and every move resets the agency&apos;s CRM, email and portal login. The two things that stay yours are your <strong>public track record</strong> and your <strong>personal contact</strong>. FairComparisons ranks you on that record from official CEA, URA and HDB data and connects sellers to you directly, so your reputation compounds with you, independent of any agency super-app.
          </p>
        </div>
      </section>

      {/* Feature showcase (green boxes): the real revenue tools, benefit-led */}
      <AgentFeatureShowcase />

      {/* claimed vs unclaimed */}
      <section className="lp-section--paper">
        <div className="fc-wrap fc-reveal" style={{ padding: "64px 40px" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(26px,3vw,34px)" }}>Claimed vs unclaimed profiles</h2>
          <div className="fc-grid-2" style={{ marginTop: 28, gap: 18 }}>
            <div className="fc-card compare-col">
              <div className="eyebrow eyebrow--muted">Unclaimed (current)</div>
              <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0 }}>
                {["Name and CEA registration visible", "AgentScore and transaction history public", "No photo, no bio", "No way for sellers to contact you"].map((t, i, a) => (
                  <li key={t} style={{ padding: "8px 0", borderBottom: i < a.length - 1 ? "1px solid var(--line)" : "none", color: "var(--slate)" }}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="fc-card compare-col" style={{ border: "1.5px solid var(--blue)" }}>
              <div className="eyebrow">Claimed (free)</div>
              <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0 }}>
                {["Add your photo and practice bio", "Let sellers comparing your area contact you directly", "Get notified when buyers view your profile", "Embed your AgentScore widget on your site"].map((t, i, a) => (
                  <li key={t} style={{ display: "flex", gap: 9, padding: "8px 0", borderBottom: i < a.length - 1 ? "1px solid var(--line)" : "none" }}>
                    <Tick /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Planner highlight — the flagship "connect your stack" tool: buyers
          self-schedule via one link, and confirmed viewings sync into the
          agent's own calendar automatically. Calendar sync is live for Google. */}
      <section className="lp-section--paper">
        <div className="fc-wrap fc-reveal" style={{ padding: "64px 40px" }}>
          <div className="fc-grid-2" style={{ gap: 44, alignItems: "center" }}>
            <div>
              <div className="lp-hero__eyebrow">New · Planner</div>
              <h2 style={{ maxWidth: "16ch", margin: "12px 0 0", fontSize: "clamp(26px,3vw,34px)" }}>
                One link that <span className="accent">fills your calendar.</span>
              </h2>
              <p className="muted" style={{ margin: "16px 0 0", fontSize: 15.5, lineHeight: 1.7, maxWidth: "52ch" }}>
                Share one booking link in your listings and messages. Buyers pick a viewing time themselves. You tap confirm, and the appointment drops straight into your Google Calendar. No spreadsheets, no double-booking, no back-and-forth.
              </p>
              <ul style={{ listStyle: "none", margin: "20px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  ["Buyers self-schedule", "One co-branded link, carrying your AgentScore, in every listing and bio. No account needed for the buyer."],
                  ["Confirm in one tap", "Every request lands in your dashboard with the property, time and the buyer's contact. Confirm, complete or cancel."],
                  ["Synced to your calendar", "Confirmed viewings appear in your own Google Calendar automatically, so your day is always up to date."],
                ].map(([t, d]) => (
                  <li key={t} style={{ display: "flex", gap: 11 }}>
                    <Tick />
                    <span>
                      <strong style={{ color: "var(--ink)" }}>{t}.</strong>{" "}
                      <span className="muted" style={{ fontSize: 14.5 }}>{d}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 24, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <Link href="/search" className="fc-btn fc-btn--primary">Claim your free profile</Link>
                <Link href="/for-agents/planner" style={{ color: "var(--blue)", fontWeight: 600, fontSize: 14.5 }}>
                  See how the Planner works &rarr;
                </Link>
              </div>
            </div>
            <div style={{ padding: "0 4px" }}>
              <PlannerPreview />
            </div>
          </div>
        </div>
      </section>

      {/* how score works */}
      <section className="lp-section">
        <div className="fc-wrap fc-reveal" style={{ padding: "64px 40px" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(26px,3vw,34px)" }}>How your score is calculated</h2>
          <p className="muted" style={{ textAlign: "center", maxWidth: "60ch", margin: "12px auto 0" }}>
            The AgentScore is fully automated. Payment does not influence your ranking. The only way to improve your score is to close more transactions and deliver better service.
          </p>
          {/* Must match the five-dimension model on /how-we-score exactly. */}
          <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
            {[["30", "Volume", "Sale-weighted CEA transactions"], ["25", "Recency", "Recent activity weighted higher"], ["15", "Diversity", "Property and transaction types"], ["15", "Experience", "Years of recorded activity"], ["15", "Reviews", "Agency review standing, Bayesian-corrected"]].map(([n, t, d]) => (
              <div key={t} className="fc-card fc-card--pad" style={{ textAlign: "center" }}>
                <div className="serif" style={{ fontWeight: 600, fontSize: 34, color: "var(--blue)" }}>{n}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{t}</div>
                <div className="small muted">{d}</div>
              </div>
            ))}
          </div>
          <p className="muted small" style={{ textAlign: "center", marginTop: 14 }}>
            The full methodology, including how each dimension is measured, is public on{" "}
            <Link href="/how-we-score" style={{ color: "var(--blue)", fontWeight: 600 }}>how we score</Link>.
          </p>
        </div>
      </section>

      {/* pricing */}
      <section className="lp-section--paper">
        <div className="fc-wrap" style={{ padding: "64px 40px" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(26px,3vw,34px)" }}>Free to be found. Paid to win.</h2>
          <p className="muted" style={{ textAlign: "center", maxWidth: "62ch", margin: "12px auto 0" }}>
            Being listed, ranked and found by sellers is free forever, and receiving their invites is too. The paid tiers do one job: help you convert the sellers already looking at you into won listings. At a typical 1% HDB commission, a single closed deal covers years of any tier. They never change your rank or who receives leads.
          </p>
          <div style={{ marginTop: 28 }}><PricingCards /></div>
        </div>
      </section>

      {/* resources */}
      <section className="lp-section">
        <div className="fc-wrap" style={{ padding: "64px 40px" }}>
          <h2 className="fc-reveal" style={{ textAlign: "center", fontSize: "clamp(26px,3vw,34px)" }}>Resources for agents</h2>
          <div className="fc-grid-2" style={{ marginTop: 28, gap: 18 }}>
            <Link href="/for-agents/features" className="fc-card fc-card--pad fc-card--hover">
              <div className="eyebrow">The toolkit</div>
              <div className="serif" style={{ fontWeight: 600, fontSize: 20, margin: "8px 0 6px" }}>Every agent tool, one free dashboard</div>
              <p className="muted small">Deal Radar, Planner, Demand Dashboard, Building Pages, badge and lead widget. What each does, what it costs (mostly S$0), and how they fit together.</p>
            </Link>
            <Link href="/for-agents/building-pages" className="fc-card fc-card--pad fc-card--hover">
              <div className="eyebrow">New</div>
              <div className="serif" style={{ fontWeight: 600, fontSize: 20, margin: "8px 0 6px" }}>Own your development&#39;s page</div>
              <p className="muted small">Your commentary, profile and booking link on a development&#39;s data page. One agent per building, first come, first served.</p>
            </Link>
            <Link href="/for-agents/propertyguru-alternative" className="fc-card fc-card--pad fc-card--hover">
              <div className="eyebrow">Compare</div>
              <div className="serif" style={{ fontWeight: 600, fontSize: 20, margin: "8px 0 6px" }}>PropertyGuru alternative</div>
              <p className="muted small">How FairComparisons compares to PropertyGuru on pricing, features and visibility. The side-by-side breakdown.</p>
            </Link>
            <Link href="/for-agents/lead-generation" className="fc-card fc-card--pad fc-card--hover">
              <div className="eyebrow">Get found</div>
              <div className="serif" style={{ fontWeight: 600, fontSize: 20, margin: "8px 0 6px" }}>How sellers find agents on FairComparisons</div>
              <p className="muted small">Sellers compare agents in their area and contact the ones they choose. Your track record does the selling. See how it works.</p>
            </Link>
            <Link href="/for-agents/grow" className="fc-card fc-card--pad fc-card--hover">
              <div className="eyebrow">Grow</div>
              <div className="serif" style={{ fontWeight: 600, fontSize: 20, margin: "8px 0 6px" }}>Turn your track record into listings</div>
              <p className="muted small">Deal Radar prospecting, co-branded seller reports, a lead widget for your own site, and embeddable calculators. Free to be listed and ranked.</p>
            </Link>
            <Link href="/for-agents/planner" className="fc-card fc-card--pad fc-card--hover">
              <div className="eyebrow">Planner</div>
              <div className="serif" style={{ fontWeight: 600, fontSize: 20, margin: "8px 0 6px" }}>Your viewings, all in one place</div>
              <p className="muted small">Share one booking link; buyers request a viewing time; you confirm and manage every viewing, and confirmed viewings sync into your Google Calendar automatically.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* how we compare to other platforms */}
      <section className="lp-section--paper">
        <div className="fc-wrap" style={{ padding: "56px 40px" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(24px,3vw,32px)" }}>How FairComparisons compares</h2>
          <p className="muted" style={{ textAlign: "center", maxWidth: "60ch", margin: "12px auto 0" }}>
            Honest, sourced side-by-sides with the platforms Singapore agents already know. We are free to be listed and ranked, and sellers compare and invite you to quote.
          </p>
          <p className="muted" style={{ textAlign: "center", marginTop: 10 }}>
            <Link href="/for-agents/portal-pricing" style={{ color: "var(--blue)", fontWeight: 600 }}>
              What agents really pay for portals in 2026: the sourced price table &rarr;
            </Link>
          </p>
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {[
              ["propertyguru", "PropertyGuru"], ["99co", "99.co"], ["srx", "SRX"], ["ohmyhome", "Ohmyhome"],
              ["edgeprop", "EdgeProp"], ["mogul", "Mogul.sg"], ["propkaki", "PropKaki"],
            ].map(([slug, name]) => (
              <Link key={slug} href={`/for-agents/${slug}-alternative`} className="fc-card fc-card--pad fc-card--hover" style={{ display: "block" }}>
                <span className="eyebrow">Compare</span>
                <span className="serif" style={{ display: "block", fontWeight: 600, fontSize: 17, marginTop: 6 }}>{name} alternative</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Works with your stack (greyed, coming soon) */}
      <AgentIntegrationHub />

      {/* Data + integrity trust block */}
      <AgentTrustSection />

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
