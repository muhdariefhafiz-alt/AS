"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LeadsInbox from "./LeadsInbox";
import StandingPanel, { type Standing } from "./StandingPanel";
import DealRadar from "./DealRadar";
import PitchKitPanel from "./PitchKitPanel";
import AreaIntelPanel from "./AreaIntelPanel";
import PlannerPanel from "./PlannerPanel";
import DemandPanel from "./DemandPanel";
import DocumentsPanel, { type AutoStart } from "./DocumentsPanel";
import PipelinePanel from "./PipelinePanel";
import PaperworkNudge from "./PaperworkNudge";
import BuildingPagesPanel from "./BuildingPagesPanel";
import PerformancePanel from "./PerformancePanel";
import ShareCard from "./ShareCard";
import PerfUploadCard from "./PerfUploadCard";
import Announcements from "./Announcements";
import UnlockMoment from "./UnlockMoment";
import PlanBillingPanel from "./PlanBillingPanel";
import { titleName, cleanAgency } from "../lib/names";
import { isPaid, TIER_LABEL, type Tier } from "../lib/tiers";

const TIER_LABELS = TIER_LABEL;

// Profile-completeness engine. Weights reflect conversion impact, not equal
// thirds: a photo and a message do the most to convert the sellers who already
// view the profile. Drives the adaptive "Today" hero and its single next action.
// The tabs are the agent's value chain, not our toolbox. "today" is the single
// next action, "pipeline" is the deal spine that absorbed enquiries, viewings
// and paperwork, "find" is prospecting, "you" is identity and money.
type TabId = "today" | "pipeline" | "find" | "you";

// Old names kept working: the launch announcement links to ?tab=paperwork, and
// emails and the roadmap carry ?tab=leads and ?tab=grow. A renamed tab must
// never turn a live link into a dead one.
const TAB_ALIASES: Record<string, TabId> = {
  home: "today",
  today: "today",
  leads: "pipeline",
  pipeline: "pipeline",
  paperwork: "pipeline",
  documents: "pipeline",
  grow: "find",
  find: "find",
  profile: "you",
  you: "you",
};
type SetupStep = { key: string; label: string; cta: string; weight: number; done: boolean; anchor: string; tab: TabId };
function computeCompleteness(p: {
  photo: boolean; message: boolean; whatsapp: boolean; bio: boolean; areas: number | null;
}): { pct: number; done: number; steps: SetupStep[]; next: SetupStep | null } {
  const steps: SetupStep[] = [
    { key: "photo", label: "Add a profile photo", cta: "Add your photo", weight: 30, done: p.photo, anchor: "edit-photo", tab: "you" },
    { key: "message", label: "Write your message to sellers", cta: "Write your message", weight: 25, done: p.message, anchor: "edit-message", tab: "you" },
    { key: "whatsapp", label: "Add WhatsApp for instant lead alerts", cta: "Add your WhatsApp", weight: 20, done: p.whatsapp, anchor: "edit-whatsapp", tab: "you" },
    { key: "bio", label: "Write a short bio", cta: "Write your bio", weight: 15, done: p.bio, anchor: "edit-bio", tab: "you" },
    { key: "areas", label: "Add the areas you farm", cta: "Add a farm area", weight: 10, done: (p.areas ?? 0) > 0, anchor: "deal-radar", tab: "find" },
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
    subscription_ends_at: string | null;
    is_sandbox: boolean;
    sandbox_test_ready: boolean;
    primary_area: string | null;
    views_this_week: number;
    whatsapp_clicks_this_week: number | null;
  } | null>(null);
  const [standing, setStanding] = useState<Standing>(null);
  const [farmAreaCount, setFarmAreaCount] = useState<number | null>(null);
  const [today, setToday] = useState<{ openLeads: number; viewingRequests: number } | null>(null);
  const [activeTab, setActiveTabState] = useState<TabId>("today");
  const [newDoc, setNewDoc] = useState<AutoStart | undefined>(undefined);
  // The document editor takes over the Pipeline tab when it is open. Kept in
  // the page rather than inside the panel so a deep link can open straight into
  // a document and the back control returns to the deal list.
  const [docOpen, setDocOpen] = useState(false);

  // Tab synced to the URL (?tab=) so it is linkable and back-button friendly.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    // Mount-time URL -> state sync (deep-linkable tab). Deferred a tick so it is
    // not a synchronous setState in the effect body.
    // hasOwnProperty, not a bare index. A plain object literal inherits from
    // Object.prototype, so ?tab=valueOf returned a FUNCTION here, and React
    // treats a function passed to a state setter as an updater and calls it:
    // ?tab=valueOf and ?tab=hasOwnProperty crashed the whole dashboard to the
    // error boundary, and its Reload button reloaded the same URL and crashed
    // again, so the agent was stuck unless they hand-edited the query string.
    // ?tab=constructor and ?tab=toString rendered a dashboard with no content.
    const mapped = t && Object.prototype.hasOwnProperty.call(TAB_ALIASES, t) ? TAB_ALIASES[t] : undefined;
    if (mapped) queueMicrotask(() => setActiveTabState(mapped));
    // ?newDoc= lands the agent inside a started document rather than on an
    // empty list: the entry points that matter (the first-run card, a viewing
    // that just happened) are moments, and a moment should not end on a form.
    const nd = params.get("newDoc");
    if (nd) {
      // ?newDocFrom= names the surface that sent them, so a document started
      // from an announcement is distinguishable from one started in the tab.
      // Without it every external link reports as a generic deep_link and the
      // announcement can never be judged.
      const from = params.get("newDocFrom") || undefined;
      // Force Pipeline. Documents exist ONLY inside that tab, so arming docOpen
      // while ?tab= pointed somewhere else left the flag set but inert: the link
      // looked like it did nothing (the params are stripped just below, so a
      // reload could not recover it), and then the agent's next Pipeline click
      // replaced their deal list with a brand-new blank LOI and spent one of the
      // free tier's documents. A deep link that cannot be honoured here must
      // never leave armed state behind.
      queueMicrotask(() => {
        setNewDoc({ type: nd, entry: from });
        setDocOpen(true);
        setActiveTabState("pipeline");
      });
      // Rewrite the URL to match, in one pass:
      //   tab=pipeline  so the address bar agrees with what is on screen. Just
      //     setting the state left it saying ?tab=you while Pipeline showed, and
      //     a reload dropped the agent back on You with the document gone.
      //   newDoc gone   because a link that survived a reload would start a new
      //     blank document on every visit to the URL.
      const clean = new URL(window.location.href);
      clean.searchParams.set("tab", "pipeline");
      clean.searchParams.delete("newDoc");
      clean.searchParams.delete("newDocFrom");
      window.history.replaceState(null, "", clean.toString());
    }
  }, []);

  // Start a document from anywhere in the dashboard, optionally carrying the
  // context of the surface it was started from.
  function startDocument(docType: string, seed?: Record<string, string>, entry?: string) {
    setNewDoc({ type: docType, seed, entry });
    setDocOpen(true);
    setTab("pipeline");
  }
  function setTab(t: TabId) {
    // Leaving Pipeline closes the document editor. Without this, coming back
    // later reopens the last document instead of the deal list, and Today's
    // worklist rows would land the agent in a form they did not ask for.
    if (t !== "pipeline") setDocOpen(false);
    setActiveTabState(t);
    const url = new URL(window.location.href);
    if (t === "today") url.searchParams.delete("tab"); else url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  // Cross-tab deep link: switch to the field's tab (without setTab's scroll-to-top,
  // so the field scroll wins), then scroll to + focus the field after render.
  function goToField(tab: TabId, anchor: string) {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    if (tab === "today") url.searchParams.delete("tab"); else url.searchParams.set("tab", tab);
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

  // Post-checkout unlock: confirmed against the DATABASE, never the URL.
  const [unlock, setUnlock] = useState<"verified" | "professional" | "elite" | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  // Sign in with Google outcomes (set by /api/agent/auth/google/callback).
  const loginParam = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("login")
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
            // "What needs you today" worklist counts.
            fetch("/api/dashboard/today")
              .then((r) => (r.ok ? r.json() : null))
              .then((j) => { if (j) setToday(j); })
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

  // Checkout return + dunning deep link. Strips the params immediately (they
  // must not survive reloads or tab switches), then, for a checkout return,
  // confirms the Stripe session server-side and re-reads the tier from the DB.
  // The unlock moment renders only when the DATABASE says the paid tier is
  // active; the query string alone never shows it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const up = params.get("upgraded");
    const sid = params.get("session_id");
    const billing = params.get("billing");
    if (!up && !billing) return;
    const url = new URL(window.location.href);
    ["upgraded", "session_id", "billing"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(null, "", url.toString());

    if (billing) {
      // Deferred so it is not a synchronous setState in the effect body.
      setTimeout(() => { setActiveTabState("you"); focusField("billing-card"); }, 300);
    }
    if (!up) return;

    (async () => {
      if (sid) {
        await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sid }),
        }).catch(() => {});
      }
      const readTier = async (): Promise<string | null> => {
        try {
          const res = await fetch("/api/dashboard/lookup", { method: "POST" });
          if (!res.ok) return null;
          const d = await res.json();
          if (d.agent) {
            setAgent(d.agent);
            return d.agent.subscription_tier as string;
          }
        } catch {}
        return null;
      };
      let tier = await readTier();
      if (!tier || !isPaid(tier)) {
        // Webhook may still be in flight; one delayed retry.
        await new Promise((r) => setTimeout(r, 2500));
        tier = await readTier();
      }
      if (tier === "verified" || tier === "professional" || tier === "elite") {
        setUnlock(tier);
      }
    })();
  }, []);

  // Stripe customer portal: card update, invoices, cancel at period end, or
  // (flow=update_plan) Stripe's own plan-change screen with proration shown.
  async function openBillingPortal(flow?: "update_plan") {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flow ? { flow } : {}),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      alert(data.error || "Could not open billing.");
    } catch {
      alert("Connection error. Please try again.");
    }
    setBillingLoading(false);
  }

  // Sandbox-only: the simulate endpoint already flipped the tier server-side;
  // reflect it locally and, for an upgrade, play the same unlock moment a real
  // payment would. (The endpoint 403s for any non-sandbox account.)
  function handleSandboxChanged(t: Tier) {
    setAgent((prev) =>
      prev ? { ...prev, subscription_tier: t, subscription_ends_at: null } : prev
    );
    if (t === "verified" || t === "professional" || t === "elite") setUnlock(t);
  }

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
          <div className="eyebrow fc-hero-in fc-hero-in--1">Agent dashboard</div>
          <h1 className="fc-hero-in fc-hero-in--2" style={{ fontSize: "var(--t-h2)", margin: "10px 0 0" }}>Your FairComparisons account</h1>
          <p className="muted fc-hero-in fc-hero-in--3" style={{ marginTop: 8, fontSize: 15 }}>
            Manage your profile, see how sellers find you, and track your reputation and analytics.
          </p>
        </>
      )}

      {/* Post-checkout unlock moment (DB-verified, never query-string-driven) */}
      {unlock && (
        <UnlockMoment
          tier={unlock}
          onClose={() => setUnlock(null)}
          onOpenTools={() => { setUnlock(null); setTab("find"); }}
        />
      )}

      {/* Initial cookie check */}
      {lookupStatus === "checking" && (
        <p className="muted small" style={{ marginTop: 28 }}>Loading your dashboard…</p>
      )}

      {/* Sign in via one-time magic link: the agent's first-touch moment, so
          the panel gets the scene-world framing instead of a bare form. */}
      {(lookupStatus === "idle" || lookupStatus === "loading" || lookupStatus === "error") && (
        <div className="fc-scene fc-scene--inbox fc-hero-in fc-hero-in--4" style={{ marginTop: 28, padding: "clamp(12px,2vw,18px)" }}>
        <form onSubmit={handleSignIn} className="lp-panel" style={{ margin: 0, padding: "26px 26px", background: "#fff" }}>
          <div className="form-step">Sign in</div>

          {/* Sign in with Google: most SG agents claim with a Gmail address, so
              this skips the email round-trip entirely. Google verifies the
              email; the account must still belong to a claimed profile. */}
          <a
            href="/api/agent/auth/google/start"
            className="fc-btn fc-btn--quiet fc-btn--block"
            style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, border: "1px solid var(--line-2)" }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span style={{ fontWeight: 600 }}>Continue with Google</span>
          </a>
          {loginParam === "google_nomatch" && (
            <p className="small" style={{ marginTop: 10, color: "var(--danger)" }}>
              No claimed profile uses that Google account&apos;s email. Sign in with the email you
              claimed with, or <Link href="/claim" style={{ color: "var(--blue)", fontWeight: 600 }}>claim your profile</Link> first.
            </p>
          )}
          {loginParam === "google_error" && (
            <p className="small" style={{ marginTop: 10, color: "var(--danger)" }}>
              Google sign-in did not complete. Please try again, or use the email link below.
            </p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 2px" }}>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span className="mono" style={{ fontSize: 11, color: "var(--slate)" }}>OR</span>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>

          <div className="fc-field" style={{ marginTop: 10 }}>
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
                className="fc-btn fc-btn--primary fc-btn--hairline"
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
        </div>
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
          <div className="fc-card fc-hero-in fc-hero-in--1" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px" }}>
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
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: "4px 14px" }}>
                {/* Product news lives behind one quiet control, never as a
                    banner stacked on top of the agent's actual work. */}
                <Announcements />
                <Link
                  href={`/property-agents/agent/${agent.slug}`}
                  className="small"
                  // Same 44px thumb target as the control beside it, bought with
                  // padding and pulled back by the negative margin so the row
                  // still reads as one line of quiet links.
                  style={{ color: "var(--blue)", fontWeight: 600, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", padding: "12px 8px", margin: "-12px -8px", minHeight: 44 }}
                >
                  View public profile ›
                </Link>
              </div>
            </div>
          </div>

          {/* Tabs: Home = activation + daily pulse; the tools live behind
              job-based tabs so a new agent is not buried in a 12-section wall,
              while the Home launcher keeps every tool discoverable. */}
          <div className="fc-hero-in fc-hero-in--2" style={{ display: "flex", gap: 4, overflowX: "auto", borderBottom: "1px solid var(--line)" }}>
            {(([["today", "Today"], ["pipeline", "Pipeline"], ["find", "Find"], ["you", "You"]]) as [TabId, string][]).map(([id, label]) => (
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

          {/* Keyed by tab: remounts on switch so content fades up (fc-tab-in). */}
          <div key={activeTab} className="fc-tab-in" style={{ display: "flex", flexDirection: "column", gap: 22 }}>

          {/* ---------- TODAY: the one question "what needs me now" ----------
              Deliberately thin. Standing, performance and demand are mirrors,
              not actions, so they moved to You: a dashboard that opens with how
              well you are doing is a dashboard that answers a question nobody
              asked at 9am. */}
          {activeTab === "today" && (
            <>
              {/* The habit worklist. A live enquiry or viewing request outranks
                  finishing setup, so it leads when present. Each row jumps into
                  the pipeline. */}
              {today && (today.openLeads > 0 || today.viewingRequests > 0) && (
                <div className="fc-card fc-card--pad" style={{ borderLeft: "3px solid var(--ok)" }}>
                  <p className="kicker" style={{ color: "var(--ok)", margin: 0 }}>What needs you today</p>
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {today.openLeads > 0 && (
                      <button onClick={() => setTab("pipeline")} className="fc-card fc-card--fill" style={{ padding: "11px 14px", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, width: "100%" }}>
                        <span className="small"><strong>{today.openLeads}</strong> seller enquir{today.openLeads === 1 ? "y is" : "ies are"} awaiting your quote</span>
                        <span className="small" style={{ color: "var(--blue)", fontWeight: 600, whiteSpace: "nowrap" }}>Reply &rarr;</span>
                      </button>
                    )}
                    {today.viewingRequests > 0 && (
                      <button onClick={() => setTab("pipeline")} className="fc-card fc-card--fill" style={{ padding: "11px 14px", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, width: "100%" }}>
                        <span className="small"><strong>{today.viewingRequests}</strong> viewing request{today.viewingRequests === 1 ? "" : "s"} to confirm</span>
                        <span className="small" style={{ color: "var(--blue)", fontWeight: 600, whiteSpace: "nowrap" }}>Confirm &rarr;</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                      : "You're set up and ranked. Nothing needs you right now, so Find is where the next deal comes from."}
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

          {/* First-run Paperwork moment: the agent's own letterhead, before an
              empty form. Hides itself once they have a document. */}
          {agent.cea_registration && (
            <PaperworkNudge
              name={agent.name}
              agencyName={agent.agency_name}
              ceaRegistration={agent.cea_registration}
              onStart={() => startDocument("loi", undefined, "first_run_card")}
            />
          )}

            </>
          )}

          {/* ---------- PIPELINE: the deal spine ----------
              Absorbs the old Leads, Planner and Paperwork tabs. A deal is one
              property; its enquiry, viewings and documents hang off it. The
              document editor takes over the whole tab when one is open, because
              filling in a tenancy agreement is not a glance-at-the-list task. */}
          {activeTab === "pipeline" && agent.cea_registration && (
            <>
              {docOpen ? (
                <DocumentsPanel
                  onUpgrade={() => handleUpgrade("verified")}
                  autoStart={newDoc}
                  onAutoStartConsumed={() => setNewDoc(undefined)}
                  onClose={() => setDocOpen(false)}
                />
              ) : (
                <>
                  <PipelinePanel
                    onIssueDocument={(docType, seed, entry, fromDocumentId) => {
                      setNewDoc({ type: docType, seed, entry, fromDocumentId });
                      setDocOpen(true);
                    }}
                    onOpenDocument={(documentId) => {
                      setNewDoc({ openId: documentId });
                      setDocOpen(true);
                    }}
                  />

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

                  <PlannerPanel onIssueLoi={(propertyLabel) => startDocument("loi", { premises_address: propertyLabel }, "viewing_row")} />

                  <button
                    type="button"
                    onClick={() => { setNewDoc(undefined); setDocOpen(true); }}
                    className="small"
                    style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--slate)", fontWeight: 600, textDecoration: "underline" }}
                  >
                    All documents
                  </button>
                </>
              )}
            </>
          )}
          {activeTab === "pipeline" && !agent.cea_registration && (
            <div className="fc-card" style={{ padding: 22 }}>
              <p className="kicker" style={{ margin: 0 }}>Pipeline</p>
              <h2 className="serif" style={{ fontSize: 20, margin: "6px 0 0" }}>We need your CEA registration first.</h2>
              <p className="muted" style={{ marginTop: 8, fontSize: 14.5, maxWidth: "52ch" }}>
                Every document goes out over your name and CEA registration number, so we cannot draw one up until your
                profile carries it. Add it on your profile and this tab opens.
              </p>
              <button onClick={() => setTab("you")} className="fc-btn fc-btn--primary fc-btn--sm" style={{ marginTop: 14 }}>
                Go to your profile &rarr;
              </button>
            </div>
          )}

          {/* ---------- GROW: prospecting + marketing toolkit ---------- */}
          {activeTab === "find" && agent.cea_registration && (
            <div id="deal-radar">
              <DealRadar />
            </div>
          )}
          {activeTab === "find" && agent.cea_registration && <PitchKitPanel />}
          {activeTab === "find" && agent.cea_registration && <AreaIntelPanel />}
          {activeTab === "find" && agent.cea_registration && <BuildingPagesPanel />}
          {activeTab === "find" && agent.cea_registration && <PerfUploadCard />}

          {/* Consolidated share surface (Find tab). */}
          {activeTab === "find" && <ShareCard slug={agent.slug} score={agent.score} />}

          {/* ---------- YOU: the mirror ----------
              Standing, demand and performance are how the agent is doing, not
              what they should do next. They belong together, one tab away from
              the work, rather than interrupting it. */}
          {activeTab === "you" && (
            <>
              <StandingPanel standing={standing} primaryArea={agent.primary_area} score={agent.score} />
              {agent.cea_registration && <PerformancePanel onUpgrade={() => handleUpgrade("professional")} />}
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
                  <span className="muted small">Contact-click detail unlocks with <strong style={{ color: "var(--ink)" }}>Verified</strong>.</span>
                  <span className="small" style={{ color: "var(--blue)", fontWeight: 600, whiteSpace: "nowrap" }}>{checkoutLoading === "verified" ? "…" : "Unlock →"}</span>
                </button>
              )}

                  {/* Contact-click detail for paid tiers (views live in Demand above). */}
                  {isPaid(agent.subscription_tier) && (
                    <div className="fc-card" style={{ padding: 18, textAlign: "center" }}>
                      <p className="serif tnum" style={{ fontSize: 30, fontWeight: 600, color: "var(--blue)" }}>{agent.whatsapp_clicks_this_week ?? 0}</p>
                      <p className="kicker" style={{ marginTop: 4 }}>Contact-button clicks this week</p>
                    </div>
                  )}

            </>
          )}

          {/* ---------- PROFILE: identity model + verified + edit form ---------- */}
          {activeTab === "you" && (
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

          {/* Plan & billing — account settings for every tier (ST: sandbox-aware) */}
          {activeTab === "you" && (
            <PlanBillingPanel
              tier={agent.subscription_tier}
              subscriptionEndsAt={agent.subscription_ends_at}
              isSandbox={agent.is_sandbox}
              sandboxTestReady={agent.sandbox_test_ready}
              checkoutLoading={checkoutLoading}
              billingLoading={billingLoading}
              onUpgrade={handleUpgrade}
              onManageBilling={openBillingPortal}
              onSandboxChanged={handleSandboxChanged}
            />
          )}

          {/* Profile edit form */}
          {activeTab === "you" && (
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
                  className="fc-btn fc-btn--primary fc-btn--hairline"
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

          </div>{/* end keyed tab wrapper */}
        </div>
      )}
    </div>
  );
}

