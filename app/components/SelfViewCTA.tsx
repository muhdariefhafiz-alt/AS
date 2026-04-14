"use client";

import { useState, useEffect } from "react";

interface SelfViewCTAProps {
  agentSlug: string;
  agentName: string;
  claimed: boolean;
}

/**
 * Detects when a visitor has viewed the same agent profile multiple times
 * (likely the agent themselves) and shows a prominent claim CTA.
 * Uses localStorage to track visit counts per agent slug.
 */
export default function SelfViewCTA({ agentSlug, agentName, claimed }: SelfViewCTAProps) {
  const [show, setShow] = useState(false);
  const [visitCount, setVisitCount] = useState(0);

  useEffect(() => {
    if (claimed) return;

    try {
      const key = `fc_visits_${agentSlug}`;
      const stored = localStorage.getItem(key);
      const count = stored ? parseInt(stored, 10) + 1 : 1;
      localStorage.setItem(key, String(count));
      setVisitCount(count);

      // Show after 2+ visits to the same profile
      if (count >= 2) {
        setShow(true);
        // Track this as a potential self-view
        fetch("/api/funnel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "suspected_self_view",
            agentSlug,
            metadata: { visit_count: count },
          }),
        }).catch(() => {});
      }
    } catch {
      // localStorage unavailable
    }
  }, [agentSlug, claimed]);

  if (!show || claimed) return null;

  const firstName = agentName.split(" ")[0];

  return (
    <div className="mx-auto max-w-[1120px] px-5 md:px-8">
      <div className="relative overflow-hidden rounded-xl border-2 border-teal-400 bg-gradient-to-r from-teal-600 to-teal-500 p-6 text-white shadow-lg">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-200">
            {visitCount >= 4 ? "Welcome back" : "Is this you"}, {firstName}?
          </p>
          <p className="mt-2 text-lg font-bold">
            {visitCount >= 4
              ? "You've checked this profile several times. Take control of it."
              : "This looks like your profile. Claim it for free in 30 seconds."}
          </p>
          <p className="mt-1 text-sm text-white/80">
            Add your photo, bio, and WhatsApp number. Buyers searching for agents in your area will see your complete profile.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="#claim"
              className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-teal-700 shadow-sm transition hover:bg-teal-50"
            >
              Claim this profile
            </a>
            <button
              onClick={() => setShow(false)}
              className="text-sm text-white/60 hover:text-white"
            >
              Not me
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
