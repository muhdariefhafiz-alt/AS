"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postalToDistrictCode, looksLikePostal } from "../lib/postal";

// Postcode entry on ranking pages. Resolves the postcode to a URA district and
// routes straight into the prefilled /sell comparison. Falls back to plain
// /sell if the postcode is unrecognised, so the CTA always works.
export default function PostcodeBox({ source = "ranking" }: { source?: string }) {
  const router = useRouter();
  const [pc, setPc] = useState("");
  // Pending state so the button gives feedback while Next navigates + renders
  // /sell (server-rendered with a DB lookup); otherwise it looks frozen.
  const [pending, startTransition] = useTransition();

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    const q = pc.trim();
    const code = looksLikePostal(q) ? postalToDistrictCode(q) : null;
    const href = code
      ? `/sell?type=CONDO&district=${code}&utm_source=${source}`
      : `/sell?utm_source=${source}`;
    startTransition(() => router.push(href));
  }

  return (
    <form onSubmit={go} className="fc-search" style={{ maxWidth: 460 }}>
      <input
        value={pc}
        onChange={(e) => setPc(e.target.value)}
        placeholder="Enter your postal code"
        inputMode="numeric"
        aria-label="Postal code"
        disabled={pending}
      />
      <button type="submit" className="fc-btn fc-btn--primary" disabled={pending} aria-busy={pending}>
        {pending ? "Finding agents…" : "Compare agents"}
      </button>
    </form>
  );
}
