"use client";

import { useState, useEffect, useRef } from "react";
import { trackEvent } from "../lib/analytics";
import { greetName } from "../lib/names";

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
    if (claimed || hasTrackedView.current) return;
    const el = bannerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTrackedView.current) {
          hasTrackedView.current = true;
          trackFunnel("claim_banner_view", agentId, meta());
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
      <div className="flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50/80 px-4 py-3">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[11px] text-white">
          &#10003;
        </span>
        <span className="text-sm font-medium text-green-800">Verified and claimed profile</span>
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
      <div className="rounded-xl border border-[var(--line-2)] bg-[var(--blue-wash)] p-5">
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
      <div className="rounded-xl border border-[var(--line-2)] bg-[var(--blue-wash)] p-5">
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
    <div
      ref={bannerRef}
      id="claim"
      className="overflow-hidden rounded-xl border border-[var(--line-2)] bg-gradient-to-r from-[var(--blue-wash)] to-white"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-base font-bold text-gray-900">{headline}</p>
            <p className="mt-1.5 text-sm text-gray-600">
              Your CEA transaction record is already public, so this page exists whether you claim it or not.
              Claim it to add your photo and bio and subscribe to agent tools.
            </p>
            {variant === "B" && profileViews7d != null && profileViews7d > 0 && (
              <p className="mt-2 text-sm font-semibold text-[var(--blue-deep)]">
                {profileViews7d} {profileViews7d === 1 ? "person" : "people"} viewed your profile in the last 7 days.
              </p>
            )}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--blue-wash)] text-[10px] font-bold text-[var(--blue-deep)]">
                  1
                </span>
                <span>Show sellers comparing agents in your area your photo, bio and record.</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--blue-wash)] text-[10px] font-bold text-[var(--blue-deep)]">
                  2
                </span>
                <span>Add a photo, bio and message so sellers know who they are contacting.</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--blue-wash)] text-[10px] font-bold text-[var(--blue-deep)]">
                  3
                </span>
                <span>Track your profile views and performance in your dashboard.</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Free. No paid placements, no ranking changes. We rank agents on CEA data, not on who pays.
            </p>
          </div>
          {!open && (
            <button
              onClick={() => {
                trackEvent("claim_click", { agent_id: agentId, agent_name: agentName });
                trackFunnel("claim_click", agentId, meta());
                setOpen(true);
              }}
              className="flex-shrink-0 rounded-lg bg-[var(--blue)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--blue-deep)] hover:shadow-md"
            >
              Claim profile
            </button>
          )}
        </div>

        {open && (
          <form onSubmit={handleSubmit} className="mt-5 rounded-lg border border-[var(--line)] bg-white p-4">
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
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
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
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
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
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="submit"
                disabled={status === "loading" || !consent || !contactConsent}
                className="rounded-lg bg-[var(--blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--blue-deep)] disabled:opacity-50 disabled:cursor-not-allowed"
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
