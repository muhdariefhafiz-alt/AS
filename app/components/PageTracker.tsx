"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isBotUA } from "../lib/isBot";

export default function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Self-exclusion: visiting any page with ?notrack=1 opts THIS browser out
    // permanently (stored locally). Use it on every device/browser you QA from.
    if (params.get("notrack") === "1") {
      try { localStorage.setItem("fc_notrack", "1"); } catch {}
    }
    try { if (localStorage.getItem("fc_notrack") === "1") return; } catch {}

    // Internal surfaces are not marketing traffic.
    if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) return;

    // Skip bots / headless / AI crawlers (shared list in lib/isBot — catches
    // HeadlessChrome + Playwright QA, GPTBot/ClaudeBot training scrapers, and
    // real-time answer-engine fetchers like ChatGPT-User / Perplexity-User).
    if (isBotUA(navigator.userAgent)) return;

    // Anonymous per-tab session id: lets analytics distinguish real browsing
    // sessions (multiple pages, one id) from stateless bots that spoof browser
    // UAs but hold no storage. Not a user identifier; resets when the tab closes.
    let sessionId: string | null = null;
    try {
      sessionId = sessionStorage.getItem("fc_sid");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem("fc_sid", sessionId);
      }
    } catch {}

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
        session_id: sessionId,
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
