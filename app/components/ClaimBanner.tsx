"use client";

import { useState, useEffect, useRef } from "react";
import { trackEvent } from "../lib/analytics";
import { greetName } from "../lib/names";
import { Icon } from "./Icons";
import { KeyLine } from "./LineArt";

/** Fire-and-forget funnel event to /api/funnel */
function trackFunnel(event: string, agentId: number, metadata?: Record<string, unknown>) {
  fetch("/api/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, agentId, metadata }),
  }).catch(() => {});
}

type Props = {
  agentId: number;
  agentName: string;
  claimed: boolean;
  /** Exp 1 claim-hook enrichment (all optional; omitted lines simply do not render) */
  variant?: "A" | "B";
  rank?: number | null;
  areaName?: string | null;
  areaTotal?: number | null;
  score?: number | null;
  profileViews7d?: number | null;
};

// The claim conversion surface on unclaimed profiles, rebuilt to the design
// standard (amber scene world, icon-roundel value props that ARRIVE, hairline
// CTA, reassurance microcopy) with every conversion mechanic preserved:
// variants, funnel events, review/success states, both consents.
const VALUE_PROPS: { icon: keyof typeof Icon; text: string }[] = [
  { icon: "Mail", text: "Seller enquiries land in your inbox with an AI-drafted reply" },
  { icon: "Calendar", text: "One booking link; confirmed viewings sync to Google Calendar" },
  { icon: "Radar", text: "Deal Radar: households approaching their MOP in your farm areas" },
];

export default function ClaimBanner({
  agentId,
  agentName,
  claimed,
  variant = "A",
  rank = null,
  areaName = null,
  areaTotal = null,
  score = null,
  profileViews7d = null,
}: Props) {
  const [open, setOpen] = useState(false);
  const [inView, setInView] = useState(false);
  const [email, setEmail] = useState("");
  const [ceaNumber, setCeaNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [contactConsent, setContactConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "review" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const bannerRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);
  const refSource = useRef<string | null>(null);

  const firstName = greetName(agentName);

  // Attribution + experiment metadata on every funnel event for this banner.
  const meta = () => ({ variant, ref: refSource.current });

  useEffect(() => {
    // Capture ?ref (outreach / leaderboard / badge) so a claim attributes back.
    try {
      refSource.current = new URLSearchParams(window.location.search).get("ref");
    } catch {}
  }, []);

  useEffect(() => {
    if (claimed) return;
    const el = bannerRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) setInView(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (!hasTrackedView.current) {
            hasTrackedView.current = true;
            trackFunnel("claim_banner_view", agentId, meta());
          }
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimed, agentId]);

  // Variant B headline: lead with rank if we have it, else score, else the
  // neutral control headline. Every figure is real or the line is dropped.
  const headlineB =
    rank && areaName
      ? `You rank #${rank}${areaTotal ? ` of ${areaTotal}` : ""} in ${areaName}, ${firstName}.`
      : score
        ? `Your AgentScore is ${score}, ${firstName}. Sellers can already see it.`
        : `Is this your profile, ${firstName}?`;
  const headline = variant === "B" ? headlineB : `Is this your profile, ${firstName}?`;

  if (claimed) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border px-4 py-3" style={{ borderColor: "var(--ok)", background: "var(--ok-wash)" }}>
        <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-white" style={{ background: "var(--ok)" }}>
          &#10003;
        </span>
        <span className="text-sm font-medium" style={{ color: "var(--ok)" }}>Verified and claimed profile</span>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !ceaNumber || !consent || !contactConsent) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, email, ceaNumber, contactConsent }),
      });
      const data = await res.json();
      if (res.ok) {
        trackEvent("claim_submit", { agent_id: agentId, agent_name: agentName });
        trackFunnel("claim_submit", agentId, meta());
        // Two server outcomes: auto-verify (email on file → link sent) vs
        // manual review (no on-file email → admin approves, no email sent).
        // The server signals the latter with `review: true`; show the matching
        // message so we never tell someone to check an inbox we did not email.
        setStatus(data.review ? "review" : "success");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  if (status === "review") {
    return (
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--line-2)", background: "var(--blue-wash)" }}>
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--blue)] text-[11px] text-white">
            &#10003;
          </span>
          <p className="font-semibold text-[var(--blue-deep)]">Claim received. We are reviewing it.</p>
        </div>
        <p className="mt-2 text-sm text-[var(--blue-deep)]">
          We do not have a verified email on file for this profile, so our team reviews this claim by hand to protect against impersonation. We will confirm to <strong>{email}</strong> within 1 business day.
        </p>
        <p className="mt-2 text-xs text-[var(--blue)]">
          No further action needed from you right now.
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--line-2)", background: "var(--blue-wash)" }}>
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--blue)] text-[11px] text-white">
            &#10003;
          </span>
          <p className="font-semibold text-[var(--blue-deep)]">Check your email</p>
        </div>
        <p className="mt-2 text-sm text-[var(--blue-deep)]">
          We sent a verification link to <strong>{email}</strong>. Click it to activate your profile. The link expires in 24 hours.
        </p>
        <p className="mt-2 text-xs text-[var(--blue)]">
          Not seeing it? Check spam, or resubmit.
        </p>
      </div>
    );
  }

  return (
    <div ref={bannerRef} id="claim" className="fc-scene fc-scene--planner" style={{ padding: "clamp(14px,2vw,20px)" }}>
      <KeyLine className="fc-lineart fc-float" width={64} style={{ position: "absolute", right: 16, top: 12 }} />
      <div className="fc-scene__card" style={{ padding: "20px 22px", position: "relative" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1" style={{ minWidth: 260 }}>
            <p className="serif" style={{ fontSize: "clamp(19px,2.2vw,24px)", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              {headline}
            </p>
            <p className="mt-1.5 text-sm" style={{ color: "var(--slate)" }}>
              Your CEA transaction record is already public, so this page exists whether you claim it or not.
              Claiming it puts you in control, and unlocks the toolkit:
            </p>
            {variant === "B" && profileViews7d != null && profileViews7d > 0 && (
              <p
                className="fc-cue fc-cue--pop mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold"
                data-on={inView ? "1" : undefined}
                style={{ background: "var(--blue-wash)", color: "var(--blue-deep)" }}
              >
                <Icon.TrendUp size={14} />
                {profileViews7d} {profileViews7d === 1 ? "person" : "people"} viewed your profile in the last 7 days
              </p>
            )}
            <div className="mt-3" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {VALUE_PROPS.map((v, i) => {
                const C = Icon[v.icon];
                return (
                  <div
                    key={v.icon}
                    className="fc-cue flex items-center gap-2.5 text-sm"
                    data-on={inView ? "1" : undefined}
                    style={{ transitionDelay: `${0.15 + i * 0.14}s`, color: "var(--ink)" }}
                  >
                    <span
                      className="flex items-center justify-center"
                      style={{ width: 28, height: 28, borderRadius: 9, background: "var(--blue-wash)", color: "var(--blue-deep)", flexShrink: 0 }}
                    >
                      <C size={15} />
                    </span>
                    <span>{v.text}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs" style={{ color: "var(--slate)" }}>
              Free forever. No paid placements, no ranking changes. We rank agents on CEA data, not on who pays.
            </p>
          </div>
          {!open && (
            <div className="flex-shrink-0" style={{ textAlign: "center" }}>
              <button
                onClick={() => {
                  trackEvent("claim_click", { agent_id: agentId, agent_name: agentName });
                  trackFunnel("claim_click", agentId, meta());
                  setOpen(true);
                }}
                className="fc-btn fc-btn--primary fc-btn--hairline"
              >
                Claim this profile
              </button>
              <p className="mt-2.5 text-[11px]" style={{ color: "var(--slate)" }}>
                Free · takes 30 seconds
              </p>
            </div>
          )}
        </div>

        {open && (
          <form onSubmit={handleSubmit} className="mt-5 rounded-lg border p-4" style={{ borderColor: "var(--line)", background: "var(--cloud)" }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                />
                <p className="mt-1 text-[11px] text-gray-400">We send a verification link to this address.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">CEA registration number</label>
                <input
                  type="text"
                  value={ceaNumber}
                  onChange={(e) => setCeaNumber(e.target.value)}
                  placeholder="R012345A"
                  required
                  autoCapitalize="characters"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                />
                <p className="mt-1 text-[11px] text-gray-400">We match this against your CEA public record to verify identity.</p>
              </div>
            </div>
            <label className="mt-3 flex items-start gap-2 text-[12px] leading-snug text-gray-600">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
                required
              />
              <span>
                I agree to the{" "}
                <a href="/for-agents/agreement" target="_blank" rel="noopener" className="font-semibold underline">FairComparisons Agent Agreement</a>.
                Free to claim. Optional tool subscriptions never influence ranking, and FairComparisons never takes a cut of a sale.
              </span>
            </label>
            <label className="mt-2.5 flex items-start gap-2 text-[12px] leading-snug text-gray-600">
              <input
                type="checkbox"
                checked={contactConsent}
                onChange={(e) => setContactConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
                required
              />
              <span>
                I agree that FairComparisons may contact me by email and WhatsApp about seller leads matched to me and about my profile. I can opt out anytime.
              </span>
            </label>
            {status === "error" && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <button
                type="submit"
                disabled={status === "loading" || !consent || !contactConsent}
                className="fc-btn fc-btn--primary disabled:opacity-50"
              >
                {status === "loading" ? "Sending..." : "Send verification link"}
              </button>
              <p className="text-[11px] text-gray-400">
                Takes about 30 seconds. You add photo and WhatsApp in the dashboard after.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
