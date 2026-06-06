"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postalToDistrictCode, looksLikePostal } from "../lib/postal";

// Postcode entry on ranking pages. Resolves the postcode to a URA district and
// routes straight into the prefilled /sell comparison. Falls back to plain
// /sell if the postcode is unrecognised, so the CTA always works.
export default function PostcodeBox({ source = "ranking" }: { source?: string }) {
  const router = useRouter();
  const [pc, setPc] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const q = pc.trim();
    const code = looksLikePostal(q) ? postalToDistrictCode(q) : null;
    router.push(
      code
        ? `/sell?type=CONDO&district=${code}&utm_source=${source}`
        : `/sell?utm_source=${source}`,
    );
  }

  return (
    <form onSubmit={go} className="fc-search" style={{ maxWidth: 460 }}>
      <input
        value={pc}
        onChange={(e) => setPc(e.target.value)}
        placeholder="Enter your postal code"
        inputMode="numeric"
        aria-label="Postal code"
      />
      <button type="submit" className="fc-btn fc-btn--primary">
        Compare agents
      </button>
    </form>
  );
}
