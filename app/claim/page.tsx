import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import ScrollReveal from "../components/ScrollReveal";
import AgentClaimSearch from "../components/AgentClaimSearch";
import DashboardPreview from "../components/DashboardPreview";
import DataMarquee from "../components/DataMarquee";
import { Icon } from "../components/Icons";
import { CondoTower, Shophouse, SkylineStrip } from "../components/LineArt";

export const revalidate = 43200;

// The claim funnel's dedicated entry (conversion insert, owner directive:
// claim rate is low). One job: an agent finds THEMSELVES and starts the claim,
// reassured at every step. Built to the design standard: rotating scene
// worlds, choreographed value, staggered hero, skyline signature.
export const metadata: Metadata = {
  title: "Claim Your Agent Profile, Free",
  description:
    "Every CEA-registered agent already has a FairComparisons profile ranked on real transaction records. Find yours, claim it free in 30 seconds, and unlock the agent toolkit: seller enquiries, viewing planner and Deal Radar. No credit card, and rankings can never be bought.",
  alternates: { canonical: "https://fair-comparisons.com/claim" },
};

async function getStats() {
  const [scored, claimedViews] = await Promise.all([
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).not("score", "is", null),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }),
  ]);
  return { scored: scored.count ?? 29000, total: claimedViews.count ?? 38000 };
}

const VALUE_CARDS: { icon: keyof typeof Icon; title: string; sub: string }[] = [
  { icon: "Mail", title: "Seller enquiries, answered first", sub: "Leads land in your inbox with an AI-drafted reply grounded in your own record." },
  { icon: "Calendar", title: "A planner that fills itself", sub: "One booking link; buyers pick a time, confirmed viewings sync to Google Calendar." },
  { icon: "Radar", title: "Know your patch first", sub: "Deal Radar surfaces owners reaching MOP in your farm area, from official records." },
];

export default async function ClaimPage() {
  const stats = await getStats();
  return (
    <>
      <ScrollReveal />

      {/* Hero: the ink world, the promise, and the search that starts it all */}
      <section style={{ background: "var(--ink)", color: "#fff", position: "relative", overflow: "hidden" }}>
        <CondoTower className="fc-lineart fc-float" width={96} style={{ position: "absolute", left: "4%", bottom: 14, color: "var(--line-dk)" }} />
        <Shophouse className="fc-lineart fc-float" width={110} style={{ position: "absolute", right: "4%", top: 60, color: "var(--line-dk)", ["--float-delay" as string]: "1.4s" }} />
        <div className="fc-wrap" style={{ padding: "60px 40px 56px", textAlign: "center", position: "relative" }}>
          <div className="eyebrow fc-hero-in fc-hero-in--1" style={{ color: "var(--slate-2)", marginBottom: 16 }}>
            For CEA-registered agents
          </div>
          <h1 className="fc-hero-in fc-hero-in--2" style={{ color: "#fff", fontSize: "clamp(32px,4.4vw,52px)", lineHeight: 1.06, margin: "0 auto", maxWidth: "20ch" }}>
            Your profile is already live. <span className="italic-serif">Take control of it.</span>
          </h1>
          <p className="lede fc-hero-in fc-hero-in--3" style={{ color: "rgba(255,255,255,0.74)", margin: "16px auto 0", maxWidth: "56ch" }}>
            Sellers are comparing {stats.scored.toLocaleString()} ranked agents on real CEA records right now.
            Claiming yours is free, takes 30 seconds, and never changes your rank.
          </p>
          <div className="fc-hero-in fc-hero-in--4" style={{ maxWidth: 560, margin: "26px auto 0" }}>
            <AgentClaimSearch />
          </div>
          <p className="fc-hero-in fc-hero-in--5 mono" style={{ color: "rgba(255,255,255,0.65)", fontSize: 12.5, marginTop: 16 }}>
            Free forever · No credit card · Rankings cannot be bought
          </p>
        </div>
      </section>

      <DataMarquee
        items={[
          `${stats.total.toLocaleString()} agent profiles live`,
          `${stats.scored.toLocaleString()} ranked on CEA data`,
          "Claiming is free forever",
          "No credit card",
          "Rankings cannot be bought",
        ]}
      />

      {/* What claiming unlocks: the mint world */}
      <section className="fc-wrap" style={{ padding: "56px 40px 0" }}>
        <h2 className="fc-reveal" style={{ textAlign: "center", fontSize: "clamp(24px,3vw,32px)" }}>
          Claiming unlocks <span className="italic-serif">the toolkit.</span>
        </h2>
        <div className="fc-scene fc-scene--grow fc-reveal" style={{ marginTop: 24 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}>
            {VALUE_CARDS.map((c, i) => {
              const C = Icon[c.icon];
              return (
                <div key={c.title} className="fc-scene__card fc-reveal" style={{ ["--reveal-delay" as string]: `${0.12 * i}s`, padding: "18px 20px" }}>
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38,
                      borderRadius: 12, background: "var(--blue-wash)", color: "var(--blue-deep)",
                    }}
                  >
                    <C size={19} />
                  </span>
                  <div style={{ fontWeight: 700, fontSize: 15.5, marginTop: 10, color: "var(--ink)" }}>{c.title}</div>
                  <p className="muted" style={{ margin: "5px 0 0", fontSize: 13.5, lineHeight: 1.55 }}>{c.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* The moment after: your dashboard, performing itself (amber world) */}
      <section className="fc-wrap" style={{ padding: "56px 40px" }}>
        <div className="fc-grid-2" style={{ gap: 44, alignItems: "center" }}>
          <div>
            <div className="eyebrow fc-reveal" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 7, background: "var(--blue-wash)", color: "var(--blue-deep)" }}>
                <Icon.Home size={13} />
              </span>
              The moment you claim
            </div>
            <h2 className="fc-reveal" style={{ marginTop: 12 }}>
              Your dashboard is waiting, <span className="italic-serif">already filled in.</span>
            </h2>
            <p className="muted fc-reveal" style={{ marginTop: 12, fontSize: 15.5, lineHeight: 1.7 }}>
              No setup, no imports. Your standing, your record and your daily worklist are computed from official
              data before you arrive. Add a photo and your WhatsApp, and sellers comparing your area see the
              full picture.
            </p>
            <ul className="fc-reveal" style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {["Claim in 30 seconds with your CEA number", "Verification by email, impersonation-proof", "Cancel nothing: there is nothing to cancel. It is free."].map((t) => (
                <li key={t} style={{ display: "flex", gap: 9, fontSize: 14.5, color: "var(--slate)" }}>
                  <span style={{ color: "var(--ok)", fontWeight: 700 }}>&#10003;</span> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="fc-scene fc-scene--planner fc-reveal" style={{ padding: "clamp(16px,2.5vw,28px)" }}>
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* Closing: skyline signature */}
      <section className="lp-hero" style={{ position: "relative", overflow: "hidden" }}>
        <SkylineStrip
          className="fc-lineart"
          width={720}
          style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: -8, color: "var(--line-dk)", maxWidth: "96%" }}
        />
        <div className="fc-wrap" style={{ textAlign: "center", padding: "52px 40px 92px", position: "relative" }}>
          <h2 style={{ color: "#fff", fontSize: "clamp(24px,3vw,32px)" }}>
            Sellers are already looking at your record.
          </h2>
          <p className="lp-hero__sub" style={{ margin: "12px auto 20px" }}>
            Scroll up and find your name, or browse the register.
          </p>
          <Link href="/search" className="fc-btn fc-btn--ghost-light">Browse the register</Link>
        </div>
      </section>
    </>
  );
}
