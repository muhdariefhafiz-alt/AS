"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LeadsInbox from "./LeadsInbox";
import StandingPanel, { type Standing } from "./StandingPanel";
import DealRadar from "./DealRadar";
import { titleName, cleanAgency } from "../lib/names";
import { isPaid } from "../lib/tiers";

type Tier = "free" | "verified" | "professional" | "elite";

const TIER_LABELS: Record<Tier, string> = {
  free: "Free",
  verified: "Verified",
  professional: "Professional",
  elite: "Elite",
};

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
      <div className="eyebrow">Agent dashboard</div>
      <h1 style={{ fontSize: "var(--t-h2)", margin: "10px 0 0" }}>Your FairComparisons account</h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>
        Manage your profile, see how sellers find you, and track your reputation and analytics.
      </p>

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
            <span className="fc-badge" style={{ background: "var(--cloud)", color: "var(--ink)" }}>
              {TIER_LABELS[agent.subscription_tier]} plan
            </span>
          </div>

          {/* Your standing (hero). AgentScore is absorbed into this panel. */}
          <StandingPanel standing={standing} primaryArea={agent.primary_area} score={agent.score} />

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="fc-card" style={{ padding: 18, textAlign: "center" }}>
              <p className="serif" style={{ fontSize: 30, fontWeight: 600 }}>{TIER_LABELS[agent.subscription_tier]}</p>
              <p className="kicker" style={{ marginTop: 4 }}>Current plan</p>
            </div>
            <div className="fc-card" style={{ padding: 18, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <Link href={`/property-agents/agent/${agent.slug}`} style={{ color: "var(--blue)", fontWeight: 600, fontSize: 15 }}>
                View profile ›
              </Link>
              <p className="kicker" style={{ marginTop: 4 }}>Public page</p>
            </div>
          </div>

          {/* Deal Radar: daily farm-area prospecting feed (the daily-habit hook) */}
          {agent.cea_registration && <DealRadar />}

          {/* Seller leads inbox */}
          {agent.cea_registration && (
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

          {/* Profile activity. Views are shown to everyone (the upgrade hook);
              richer analytics (clicks, and later trends) are a Verified+ tool. */}
          <div>
            <h2 style={{ fontSize: 18, margin: 0 }}>Profile activity</h2>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="fc-card" style={{ padding: 18, textAlign: "center" }}>
                <p className="serif tnum" style={{ fontSize: 30, fontWeight: 600, color: "var(--blue)" }}>{agent.views_this_week}</p>
                <p className="kicker" style={{ marginTop: 4 }}>Profile views this week</p>
              </div>
              {isPaid(agent.subscription_tier) ? (
                <div className="fc-card" style={{ padding: 18, textAlign: "center" }}>
                  <p className="serif tnum" style={{ fontSize: 30, fontWeight: 600, color: "var(--blue)" }}>{agent.whatsapp_clicks_this_week}</p>
                  <p className="kicker" style={{ marginTop: 4 }}>Contact-button clicks this week</p>
                </div>
              ) : (
                <div className="fc-card" style={{ padding: 18, textAlign: "center", background: "var(--cloud)", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
                  <p className="kicker" style={{ margin: 0, lineHeight: 1.4 }}>Contact clicks and weekly trends</p>
                  <button onClick={() => handleUpgrade("verified")} disabled={checkoutLoading !== null} className="fc-btn fc-btn--ghost fc-btn--sm">
                    {checkoutLoading === "verified" ? "…" : "Unlock with Verified"}
                  </button>
                </div>
              )}
            </div>
            <p className="muted small" style={{ marginTop: 8 }}>View tracking runs once your profile is set up.</p>
          </div>

          {/* How it works — independent comparison model: every agent is
              listed and ranked free on their CEA record, sellers compare and
              contact agents themselves, and FairComparisons is paid only by
              optional subscriptions that never affect ranking. */}
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

          {/* Exp 3: embeddable AgentScore badge */}
          <BadgeCard slug={agent.slug} />

          {/* Optional tools tier — NON-ranking only (analytics + market data).
              Gated behind the 7-day "aha moment". */}
          {agent.subscription_tier === "free" && (() => {
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
          {agent.subscription_tier !== "free" && (
            <div className="fc-card fc-card--fill" style={{ padding: "14px 16px" }}>
              <p className="muted small">
                You have {TIER_LABELS[agent.subscription_tier]} tools. To manage or cancel, email{" "}
                <a href="mailto:hello@fair-comparisons.com" style={{ color: "var(--blue)" }}>hello@fair-comparisons.com</a>.
              </p>
            </div>
          )}

          {/* Profile edit form */}
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
              <div className="fc-field">
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
              <div className="fc-field">
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
              <div className="fc-field">
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
              <div className="fc-field">
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
        </div>
      )}
    </div>
  );
}

// Exp 3: embeddable AgentScore badge. Live preview + copy-paste embed code.
function BadgeCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const base = "https://fair-comparisons.com";
  const embed = `<a href="${base}/property-agents/agent/${slug}?ref=badge"><img src="${base}/badge/${slug}.svg" alt="My AgentScore on FairComparisons" width="320" height="96"></a>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(embed);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="fc-card" style={{ padding: 22 }}>
      <div className="kicker">Your verified badge</div>
      <p className="muted small" style={{ marginTop: 6 }}>
        Add your AgentScore badge to your email signature, website, or social profiles. It links back to your profile so sellers can see your full record.
      </p>
      <div style={{ marginTop: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/badge/${slug}.svg`} alt="Your AgentScore badge" width={320} height={96} style={{ maxWidth: "100%", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }} />
      </div>
      <textarea
        readOnly
        value={embed}
        onFocus={(e) => e.currentTarget.select()}
        className="fc-textarea"
        style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 12, height: 84 }}
      />
      <button onClick={copy} className="fc-btn fc-btn--ink fc-btn--sm" style={{ marginTop: 10 }}>
        {copied ? "Copied" : "Copy embed code"}
      </button>
    </div>
  );
}
