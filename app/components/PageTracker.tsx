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

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
