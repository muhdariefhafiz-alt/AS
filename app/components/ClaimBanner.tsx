"use client";

import { useState, useEffect, useRef } from "react";
import { trackEvent } from "../lib/analytics";

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
};

export default function ClaimBanner({ agentId, agentName, claimed }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [ceaNumber, setCeaNumber] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const bannerRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

  const firstName = agentName.split(" ")[0];

  useEffect(() => {
    if (claimed || hasTrackedView.current) return;
    const el = bannerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTrackedView.current) {
          hasTrackedView.current = true;
          trackFunnel("claim_banner_view", agentId);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [claimed, agentId]);

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
    if (!email || !ceaNumber) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, email, ceaNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        trackEvent("claim_submit", { agent_id: agentId, agent_name: agentName });
        trackFunnel("claim_submit", agentId);
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-[11px] text-white">
            &#10003;
          </span>
          <p className="font-semibold text-teal-800">Check your email</p>
        </div>
        <p className="mt-2 text-sm text-teal-700">
          We sent a verification link to <strong>{email}</strong>. Click it to activate your profile. The link expires in 24 hours.
        </p>
        <p className="mt-2 text-xs text-teal-600">
          Not seeing it? Check spam, or resubmit.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={bannerRef}
      id="claim"
      className="overflow-hidden rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-white"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-base font-bold text-gray-900">Is this your profile, {firstName}?</p>
            <p className="mt-1.5 text-sm text-gray-600">
              Your CEA transaction record is already public, so this page exists whether you claim it or not.
              Right now buyers can see your score and history but cannot contact you.
            </p>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-700">
                  1
                </span>
                <span>Add a WhatsApp number so buyers can message you directly.</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-700">
                  2
                </span>
                <span>Add a photo and a short message so buyers know who they are contacting.</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-700">
                  3
                </span>
                <span>See how often buyers view your profile in your dashboard.</span>
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
                trackFunnel("claim_click", agentId);
                setOpen(true);
              }}
              className="flex-shrink-0 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 hover:shadow-md"
            >
              Claim profile
            </button>
          )}
        </div>

        {open && (
          <form onSubmit={handleSubmit} className="mt-5 rounded-lg border border-teal-100 bg-white p-4">
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
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <p className="mt-1 text-[11px] text-gray-400">We match this against your CEA public record to verify identity.</p>
              </div>
            </div>
            {status === "error" && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="submit"
                disabled={status === "loading"}
                className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
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
