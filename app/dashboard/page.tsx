"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LeadsInbox from "./LeadsInbox";
import StandingPanel, { type Standing } from "./StandingPanel";
import DealRadar from "./DealRadar";
import PlannerPanel from "./PlannerPanel";
import DemandPanel from "./DemandPanel";
import BuildingPagesPanel from "./BuildingPagesPanel";
import ShareCard from "./ShareCard";
import PerfUploadCard from "./PerfUploadCard";
import { titleName, cleanAgency } from "../lib/names";
import { isPaid } from "../lib/tiers";

type Tier = "free" | "verified" | "professional" | "elite";

const TIER_LABELS: Record<Tier, string> = {
  free: "Free",
  verified: "Verified",
  professional: "Professional",
  elite: "Elite",
};

// Profile-completeness engine. Weights reflect conversion impact, not equal
// thirds: a photo and a message do the most to convert the sellers who already
// view the profile. Drives the adaptive "Today" hero and its single next action.
type TabId = "home" | "leads" | "grow" | "profile";
type SetupStep = { key: string; label: string; cta: string; weight: number; done: boolean; anchor: string; tab: TabId };
function computeCompleteness(p: {
  photo: boolean; message: boolean; whatsapp: boolean; bio: boolean; areas: number | null;
}): { pct: number; done: number; steps: SetupStep[]; next: SetupStep | null } {
  const steps: SetupStep[] = [
    { key: "photo", label: "Add a profile photo", cta: "Add your photo", weight: 30, done: p.photo, anchor: "edit-photo", tab: "profile" },
    { key: "message", label: "Write your message to sellers", cta: "Write your message", weight: 25, done: p.message, anchor: "edit-message", tab: "profile" },
    { key: "whatsapp", label: "Add WhatsApp for instant lead alerts", cta: "Add your WhatsApp", weight: 20, done: p.whatsapp, anchor: "edit-whatsapp", tab: "profile" },
    { key: "bio", label: "Write a short bio", cta: "Write your bio", weight: 15, done: p.bio, anchor: "edit-bio", tab: "profile" },
    { key: "areas", label: "Add the areas you farm", cta: "Add a farm area", weight: 10, done: (p.areas ?? 0) > 0, anchor: "deal-radar", tab: "grow" },
  ];
  const pct = steps.filter((s) => s.done).reduce((a, s) => a + s.weight, 0);
  return { pct, done: steps.filter((s) => s.done).length, steps, next: steps.find((s) => !s.done) ?? null };
}

// Scroll to and focus an edit-form field (or the Deal Radar picker) so the
// hero's next-best-action deep-links straight to the exact input. Polls for the
// element (up to ~1s) because a cross-tab jump mounts the target tab first.
function focusField(anchor: string, tries = 0) {
  const el = document.getElementById(anchor);
  if (!el) {
    if (tries < 20) setTimeout(() => focusField(anchor, tries + 1), 50);
    return;
  }
  el.scrollIntoView({ block: "center" });
  const input = el.querySelector("input, textarea, select") as HTMLElement | null;
  if (input) setTimeout(() => input.focus(), 120);
}

export default function DashboardPage() {
  const [email, setEmail] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"checking" | "idle" | "loading" | "found" | "not_found" | "error" | "link_sent">("checking");
  const [agent, setAgent] = useState<{
    id: number;
    name: string;
    slug: string;
    email: string | null;
    bio: string | null;
    photo_url: string | null;
    whatsapp: string | null;
    message: string | null;
    marketing_name: string | null;
    score: number | null;
    agency_name: string | null;
    cea_registration: string | null;
    subscription_tier: Tier;
    claimed_at: string | null;
    primary_area: string | null;
    views_this_week: number;
    whatsapp_clicks_this_week: number;
  } | null>(null);
  const [standing, setStanding] = useState<Standing>(null);
  const [farmAreaCount, setFarmAreaCount] = useState<number | null>(null);
  const [activeTab, setActiveTabState] = useState<TabId>("home");

  // Tab synced to the URL (?tab=) so it is linkable and back-button friendly.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "leads" || t === "grow" || t === "profile") setActiveTabState(t);
  }, []);
  function setTab(t: TabId) {
    setActiveTabState(t);
    const url = new URL(window.location.href);
    if (t === "home") url.searchParams.delete("tab"); else url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  // Cross-tab deep link: switch to the field's tab (without setTab's scroll-to-top,
  // so the field scroll wins), then scroll to + focus the field after render.
  function goToField(tab: TabId, anchor: string) {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    if (tab === "home") url.searchParams.delete("tab"); else url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
    setTimeout(() => focusField(anchor), 220);
  }

  // Edit form state
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [message, setMessage] = useState("");
  const [marketingName, setMarketingName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMsg, setSaveMsg] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Photo upload state
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadMsg, setUploadMsg] = useState("");

  // Check for upgrade success param
  const upgraded = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("upgraded")
    : null;

  // On mount, load the dashboard from the session cookie. No email is sent; the
  // signed cookie is the only credential. 401 -> show the sign-in form.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/lookup", { method: "POST" });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data.agent) {
            setAgent(data.agent);
            setStanding(data.standing ?? null);
            setEmail(data.agent.email || "");
            setBio(data.agent.bio || "");
            setPhotoUrl(data.agent.photo_url || "");
            setWhatsapp(data.agent.whatsapp || "");
            setMessage(data.agent.message || "");
            setMarketingName(data.agent.marketing_name || "");
            setLookupStatus("found");
            // Non-blocking: farm-area count feeds the profile-completeness meter.
            fetch("/api/dashboard/deal-radar")
              .then((r) => (r.ok ? r.json() : null))
              .then((j) => { if (j) setFarmAreaCount((j.areas ?? []).length); })
              .catch(() => {});
            return;
          }
        }
        setLookupStatus("idle");
      } catch {
        if (!cancelled) setLookupStatus("idle");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sign in via magic link: we email a one-time link to the claimed address.
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLookupStatus("loading");
    try {
      await fetch("/api/agent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setLookupStatus("link_sent");
    } catch {
      setLookupStatus("error");
    }
  }

  async function handlePhotoUpload(file: File) {
    if (!agent) return;
    setUploadStatus("uploading");
    setUploadMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("agentId", String(agent.id));
      formData.append("email", email);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.url) {
        setPhotoUrl(data.url);
        setUploadStatus("done");
        setUploadMsg("Photo uploaded successfully.");
        setSaveStatus("idle");
      } else {
        setUploadStatus("error");
        setUploadMsg(data.error || "Upload failed.");
      }
    } catch {
      setUploadStatus("error");
      setUploadMsg("Connection error. Please try again.");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!agent) return;
    setSaveStatus("saving");

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          email,
          bio: bio || null,
          photoUrl: photoUrl || null,
          whatsapp: whatsapp || null,
          message: message || null,
          marketingName: marketingName || null,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setSaveStatus("saved");
        setSaveMsg("Profile updated successfully.");
      } else {
        setSaveStatus("error");
        setSaveMsg(data.error || "Failed to save.");
      }
    } catch {
      setSaveStatus("error");
      setSaveMsg("Connection error. Please try again.");
    }
  }

  async function handleUpgrade(tier: "verified" | "professional" | "elite") {
    if (!agent) return;
    setCheckoutLoading(tier);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tier }),
      });
      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout.");
        setCheckoutLoading(null);
      }
    } catch {
      alert("Connection error. Please try again.");
      setCheckoutLoading(null);
    }
  }

  return (
    <div style={{ maxWidth: 660, margin: "0 auto", padding: "56px 22px 80px" }}>
      {/* Big title only on the sign-in screen; the dashboard leads with the
          slim agent header + the adaptive "Today" hero instead. */}
      {lookupStatus !== "found" && (
        <>
          <div className="eyebrow">Agent dashboard</div>
          <h1 style={{ fontSize: "var(--t-h2)", margin: "10px 0 0" }}>Your FairComparisons account</h1>
          <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>
            Manage your profile, see how sellers find you, and track your reputation and analytics.
          </p>
        </>
      )}

      {/* Upgrade success banner */}
      {upgraded && (
        <div className="fc-alert fc-alert--ok" style={{ marginTop: 20 }}>
          Welcome to {TIER_LABELS[upgraded as Tier] || upgraded}. Your tools are now active.
        </div>
      )}

      {/* Initial cookie check */}
      {lookupStatus === "checking" && (
        <p className="muted small" style={{ marginTop: 28 }}>Loading your dashboard…</p>
      )}

      {/* Sign in via one-time magic link */}
      {(lookupStatus === "idle" || lookupStatus === "loading" || lookupStatus === "error") && (
        <form onSubmit={handleSignIn} className="lp-panel" style={{ marginTop: 28, padding: "26px 26px" }}>
          <div className="form-step">Sign in</div>
          <div className="fc-field" style={{ marginTop: 14 }}>
            <label className="fc-label">Enter the email you used to claim your profile</label>
            {/* wrap: the 193px button next to a min-width input overflowed
                375px viewports by 74px; wrapping drops it below the input. */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 2 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="fc-input"
                style={{ flex: "1 1 200px" }}
              />
              <button
                type="submit"
                disabled={lookupStatus === "loading"}
                className="fc-btn fc-btn--primary"
                style={{ flexShrink: 0 }}
              >
                {lookupStatus === "loading" ? "…" : "Email me a sign-in link"}
              </button>
            </div>
            <p className="muted small" style={{ marginTop: 10 }}>
              We&apos;ll email a one-time sign-in link to your claimed address. Not claimed yet?{" "}
              <Link href="/for-agents" style={{ color: "var(--blue)", fontWeight: 600 }}>Claim your profile first</Link>.
            </p>
          </div>

          {lookupStatus === "error" && (
            <p className="small" style={{ marginTop: 12, color: "var(--danger)" }}>Something went wrong. Please try again.</p>
          )}
        </form>
      )}

      {/* Sign-in link sent (anti-enumeration: same message regardless) */}
      {lookupStatus === "link_sent" && (
        <div className="fc-alert fc-alert--ok" style={{ marginTop: 28 }}>
          Check your email. If a claimed profile uses that address, we&apos;ve sent a one-time sign-in link that opens your dashboard.
        </div>
      )}

      {/* Step 2: Dashboard */}
      {lookupStatus === "found" && agent && (
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Agent header with tier badge */}
          <div className="fc-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px" }}>
            <div className="fc-row" style={{ gap: 12 }}>
              <span className="tick" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 999, background: "var(--ok)", color: "#fff", fontSize: 12 }}>&#10003;</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{titleName(agent.name)}</p>
                <p className="muted small">{agent.agency_name ? cleanAgency(agent.agency_name) : "Independent agent"}</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span className="fc-badge" style={{ background: "var(--cloud)", color: "var(--ink)" }}>
                {TIER_LABELS[agent.subscription_tier]} plan
              </span>
              <Link href={`/property-agents/agent/${agent.slug}`} className="small" style={{ color: "var(--blue)", fontWeight: 600 }}>
                View public profile ›
              </Link>
            </div>
          </div>

          {/* Tabs: Home = activation + daily pulse; the tools live behind
              job-based tabs so a new agent is not buried in a 12-section wall,
              while the Home launcher keeps every tool discoverable. */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", borderBottom: "1px solid var(--line)" }}>
            {(([["home", "Home"], ["leads", "Leads"], ["grow", "Grow"], ["profile", "Profile"]]) as [TabId, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="small"
                style={{
                  border: "none", background: "none", cursor: "pointer", padding: "9px 15px", fontWeight: 600, whiteSpace: "nowrap", fontSize: 14,
                  color: activeTab === id ? "var(--ink)" : "var(--slate)",
                  borderBottom: activeTab === id ? "2px solid var(--blue)" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ---------- HOME: standing + activation + demand snapshot + launcher ---------- */}
          {activeTab === "home" && (
            <>
              {/* Your standing (hero). AgentScore is absorbed into this panel. */}
              <StandingPanel standing={standing} primaryArea={agent.primary_area} score={agent.score} />

          {/* Adaptive "Today" hero: a profile-completeness engine until the agent
              is set up, then a calm "you're set" line. Zeros are never the hero —
              Standing above always leads with the real, non-zero rank. */}
          {(() => {
            const { pct, done, steps, next } = computeCompleteness({
              photo: !!photoUrl.trim(),
              message: !!message.trim(),
              whatsapp: !!whatsapp.trim(),
              bio: !!bio.trim(),
              areas: farmAreaCount,
            });
            if (pct >= 100) {
              return (
                <div className="fc-card fc-card--fill" style={{ padding: "12px 16px" }}>
                  <span className="small" style={{ color: "var(--ok)", fontWeight: 700 }}>&#10003; Profile complete.</span>{" "}
                  <span className="muted small">
                    {agent.views_this_week > 0
                      ? `${agent.views_this_week} seller${agent.views_this_week === 1 ? "" : "s"} viewed you this week. Share your record below to bring in more.`
                      : "You're set up and ranked. Share your record below and add farm areas to surface fresh owners."}
                  </span>
                </div>
              );
            }
            return (
              <div className="fc-card fc-card--pad" style={{ borderLeft: "3px solid var(--blue)" }}>
                <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <p className="kicker" style={{ color: "var(--blue-deep)", margin: 0 }}>Today</p>
                    <h2 style={{ fontSize: 18, margin: "4px 0 0" }}>Finish your profile &mdash; {pct}% done</h2>
                  </div>
                  <span className="muted small">{done} of {steps.length} steps</span>
                </div>
                <div style={{ marginTop: 12, height: 10, borderRadius: 999, background: "var(--cloud)", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "var(--blue)", transition: "width .3s" }} />
                </div>
                <p className="muted small" style={{ marginTop: 10 }}>
                  A complete profile converts more of the sellers already looking at you.
                </p>
                {next && (
                  <button className="fc-btn fc-btn--primary fc-btn--sm" style={{ marginTop: 12 }} onClick={() => goToField(next.tab, next.anchor)}>
                    {next.cta} &rarr;
                  </button>
                )}
                <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
                  {steps.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => goToField(s.tab, s.anchor)}
                      className="small"
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center", color: s.done ? "var(--slate)" : "var(--ink)" }}
                    >
                      <span style={{ color: s.done ? "var(--ok)" : "var(--slate-2)" }}>{s.done ? "✓" : "○"}</span>
                      <span style={{ textDecoration: s.done ? "line-through" : "none" }}>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Demand Dashboard: real seller demand for this agent (never affects rank) */}
          <DemandPanel />

          {/* Verified upsell as a single contextual chip right under the numbers
              it unlocks (was a full locked card + a duplicate stat tile). */}
          {agent.subscription_tier === "free" && (
            <button
              onClick={() => handleUpgrade("verified")}
              disabled={checkoutLoading !== null}
              className="fc-card fc-card--fill"
              style={{ padding: "10px 14px", textAlign: "left", cursor: "pointer", border: "1px dashed var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, width: "100%" }}
            >
              <span className="muted small">Weekly trends and contact-click detail unlock with <strong style={{ color: "var(--ink)" }}>Verified</strong>.</span>
              <span className="small" style={{ color: "var(--blue)", fontWeight: 600, whiteSpace: "nowrap" }}>{checkoutLoading === "verified" ? "…" : "Unlock →"}</span>
            </button>
          )}

              {/* Contact-click detail for paid tiers (views live in Demand above). */}
              {isPaid(agent.subscription_tier) && (
                <div className="fc-card" style={{ padding: 18, textAlign: "center" }}>
                  <p className="serif tnum" style={{ fontSize: 30, fontWeight: 600, color: "var(--blue)" }}>{agent.whatsapp_clicks_this_week}</p>
                  <p className="kicker" style={{ marginTop: 4 }}>Contact-button clicks this week</p>
                </div>
              )}

              {/* Tools launcher — every tool stays discoverable from Home even
                  though its full UI lives in a tab (protects feature discovery). */}
              <div>
                <p className="kicker" style={{ margin: "0 0 10px" }}>Your tools</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                  {(([
                    ["leads", "Seller enquiries", "Reply and win listings"],
                    ["leads", "Viewings", "Confirm booking requests"],
                    ["grow", "Deal Radar", "Owners reaching MOP near you"],
                    ["grow", "Building pages", "Own a development's page"],
                    ["grow", "Share your record", "Rank card + website badge"],
                    ["profile", "Edit profile", "Photo, message, WhatsApp"],
                  ]) as [TabId, string, string][]).map(([tab, title, sub]) => (
                    <button key={title} onClick={() => setTab(tab)} className="fc-card" style={{ padding: 14, textAlign: "left", cursor: "pointer", border: "1px solid var(--line)" }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
                      <div className="muted small" style={{ marginTop: 3 }}>{sub}</div>
                      <div className="small" style={{ marginTop: 8, color: "var(--blue)", fontWeight: 600 }}>Open &rarr;</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ---------- LEADS: the money surface (enquiries + viewings) ---------- */}
          {activeTab === "leads" && agent.cea_registration && (
            <div>
              <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                <h2 style={{ fontSize: 18, margin: 0 }}>Seller enquiries</h2>
                <Link href="/sell" className="small" style={{ color: "var(--blue)", fontWeight: 600 }}>
                  How sellers compare you →
                </Link>
              </div>
              <div style={{ marginTop: 12 }}>
                <LeadsInbox
                  agentEmail={email.toLowerCase().trim()}
                  ceaRegistration={agent.cea_registration}
                />
              </div>
            </div>
          )}
          {activeTab === "leads" && agent.cea_registration && <PlannerPanel />}

          {/* ---------- GROW: prospecting + marketing toolkit ---------- */}
          {activeTab === "grow" && agent.cea_registration && (
            <div id="deal-radar">
              <DealRadar />
            </div>
          )}
          {activeTab === "grow" && agent.cea_registration && <BuildingPagesPanel />}
          {activeTab === "grow" && agent.cea_registration && <PerfUploadCard />}

          {/* Consolidated share surface (Grow tab). */}
          {activeTab === "grow" && <ShareCard slug={agent.slug} score={agent.score} />}

          {/* ---------- PROFILE: identity model + verified + edit form ---------- */}
          {activeTab === "profile" && (
            <div className="fc-card" style={{ background: "var(--blue-wash)", borderColor: "transparent", padding: "20px 22px" }}>
              <h2 style={{ fontSize: 16, margin: 0, color: "var(--ink)" }}>How FairComparisons works for you</h2>
              <ul style={{ marginTop: 10, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 14.5, color: "var(--ink-2)" }}>
                <li>You&apos;re listed free, ranked purely on your CEA transaction record.</li>
                <li>Sellers compare every agent in their area and invite the ones they choose; we pass you that introduction free.</li>
                <li>We never take a cut of your sales. Optional subscriptions add reputation and analytics tools, nothing more.</li>
              </ul>
              <p className="small" style={{ marginTop: 12, color: "var(--blue-deep)" }}>
                Your ranking is always earned, never bought. There is no paid placement on FairComparisons.
              </p>
            </div>
          )}

          {/* Optional tools tier — NON-ranking only (analytics + market data).
              Gated behind the 7-day "aha moment". */}
          {activeTab === "profile" && agent.subscription_tier === "free" && (() => {
            const claimedDaysAgo = agent.claimed_at
              ? (Date.now() - new Date(agent.claimed_at).getTime()) / (1000 * 60 * 60 * 24)
              : null;
            const hasReachedAha = claimedDaysAgo !== null && claimedDaysAgo >= 7;
            if (!hasReachedAha) return null;

            return (
              <div className="fc-card" style={{ padding: 22 }}>
                <div className="fc-row" style={{ justifyContent: "space-between" }}>
                  <p className="kicker">Get Verified (optional)</p>
                  <span className="serif" style={{ fontSize: 22, fontWeight: 600 }}>S$29<span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>/mo</span></span>
                </div>
                <ul style={{ marginTop: 12, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5 }} className="muted">
                  <li>FairComparisons Verified badge on your profile</li>
                  <li>Profile analytics: views and clicks</li>
                  <li>Reply publicly to your client reviews</li>
                </ul>
                <p className="small muted" style={{ marginTop: 8 }}>Tools only. Does not affect your ranking.</p>
                <button
                  onClick={() => handleUpgrade("verified")}
                  disabled={checkoutLoading !== null}
                  className="fc-btn fc-btn--ghost fc-btn--block"
                  style={{ marginTop: 16 }}
                >
                  {checkoutLoading === "verified" ? "Redirecting to checkout…" : "Get Verified"}
                </button>
                <p className="small muted" style={{ textAlign: "center", marginTop: 10 }}>
                  <Link href="/for-agents" style={{ color: "var(--blue)" }}>See all plans</Link>
                </p>
              </div>
            );
          })()}

          {/* Existing paid tier holders — manage/cancel */}
          {activeTab === "profile" && agent.subscription_tier !== "free" && (
            <div className="fc-card fc-card--fill" style={{ padding: "14px 16px" }}>
              <p className="muted small">
                You have {TIER_LABELS[agent.subscription_tier]} tools. To manage or cancel, email{" "}
                <a href="mailto:hello@fair-comparisons.com" style={{ color: "var(--blue)" }}>hello@fair-comparisons.com</a>.
              </p>
            </div>
          )}

          {/* Profile edit form */}
          {activeTab === "profile" && (
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 24 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Edit your profile</h2>
            <form onSubmit={handleSave} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Marketing / preferred name */}
              <div className="fc-field">
                <label className="fc-label">Marketing name <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                <p className="muted small">The name clients know you by, if different from your CEA name. Shown alongside your registered name so people searching for you can find this page. Example: Cindy Chew.</p>
                <input
                  type="text"
                  value={marketingName}
                  onChange={(e) => { setMarketingName(e.target.value); setSaveStatus("idle"); }}
                  maxLength={60}
                  placeholder="e.g. Cindy Chew"
                  className="fc-input"
                />
              </div>

              {/* Message to buyers */}
              <div className="fc-field" id="edit-message">
                <label className="fc-label">Message to sellers</label>
                <p className="muted small">This appears at the top of your public profile. Tell sellers why they should pick you.</p>
                <textarea
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setSaveStatus("idle"); }}
                  maxLength={500}
                  rows={3}
                  placeholder="Looking for a trusted agent in your area? I have 10+ years helping owners sell for the best price."
                  className="fc-textarea"
                />
                <p className="muted small" style={{ textAlign: "right" }}>{message.length}/500</p>
              </div>

              {/* Bio */}
              <div className="fc-field" id="edit-bio">
                <label className="fc-label">Bio / practice description</label>
                <p className="muted small">Tell sellers about your specialization and experience. Max 1,000 characters.</p>
                <textarea
                  value={bio}
                  onChange={(e) => { setBio(e.target.value); setSaveStatus("idle"); }}
                  maxLength={1000}
                  rows={4}
                  placeholder="I specialize in HDB resale transactions in Tampines and Bedok…"
                  className="fc-textarea"
                />
                <p className="muted small" style={{ textAlign: "right" }}>{bio.length}/1000</p>
              </div>

              {/* Photo upload */}
              <div className="fc-field" id="edit-photo">
                <label className="fc-label">Profile photo</label>
                <p className="muted small">Upload a professional headshot. JPEG, PNG, or WebP.</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                  }}
                  className="fc-input"
                  style={{ padding: 10, fontSize: 13.5 }}
                />
                {uploadStatus === "uploading" && (
                  <p className="small" style={{ color: "var(--blue)" }}>Uploading…</p>
                )}
                {uploadStatus === "done" && (
                  <p className="small" style={{ color: "var(--ok)" }}>{uploadMsg}</p>
                )}
                {uploadStatus === "error" && (
                  <p className="small" style={{ color: "var(--danger)" }}>{uploadMsg}</p>
                )}
                {photoUrl && (
                  <div style={{ marginTop: 6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt="Preview"
                      style={{ height: 80, width: 80, borderRadius: "var(--r-md)", border: "1px solid var(--line)", objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <p className="muted small" style={{ marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{photoUrl}</p>
                  </div>
                )}
              </div>

              {/* WhatsApp */}
              <div className="fc-field" id="edit-whatsapp">
                <label className="fc-label">WhatsApp number for lead alerts</label>
                <p className="muted small">Include country code (e.g. +6591234567). We send you a WhatsApp the moment a seller shortlists you, so you can respond from your dashboard before the window closes. Leave blank to turn WhatsApp alerts off.</p>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => { setWhatsapp(e.target.value); setSaveStatus("idle"); }}
                  maxLength={20}
                  placeholder="+65 9XXX XXXX"
                  className="fc-input"
                />
              </div>

              {/* Submit */}
              <div className="fc-row" style={{ gap: 12 }}>
                <button
                  type="submit"
                  disabled={saveStatus === "saving"}
                  className="fc-btn fc-btn--primary"
                >
                  {saveStatus === "saving" ? "Saving…" : "Save changes"}
                </button>

                {saveStatus === "saved" && (
                  <span className="small" style={{ color: "var(--ok)" }}>{saveMsg}</span>
                )}
                {saveStatus === "error" && (
                  <span className="small" style={{ color: "var(--danger)" }}>{saveMsg}</span>
                )}
              </div>

              <div className="fc-card fc-card--fill" style={{ padding: 16 }}>
                <p className="muted small">
                  Your changes appear on your{" "}
                  <Link href={`/property-agents/agent/${agent.slug}`} style={{ color: "var(--blue)" }}>
                    public profile page
                  </Link>{" "}
                  after the next refresh. Photo, bio, and message are visible to all visitors.
                </p>
              </div>
            </form>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

