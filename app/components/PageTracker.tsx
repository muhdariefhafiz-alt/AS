"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isBotUA, isInternalPath } from "../lib/isBot";

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
    if (isInternalPath(pathname)) return;

    // Skip bots / headless / AI crawlers (shared list in lib/isBot — catches
    // HeadlessChrome + Playwright QA, GPTBot/ClaudeBot training scrapers, and
    // real-time answer-engine fetchers like ChatGPT-User / Perplexity-User).
    if (isBotUA(navigator.userAgent)) return;

    // Anonymous session id: lets analytics distinguish a real visit (multiple
    // pages under one id) from stateless bots that spoof browser UAs but hold no
    // storage. Not a user identifier; anonymous UUID, no PII.
    //
    // Stored in localStorage with a 30-minute rolling inactivity window (the
    // standard web-analytics session definition), NOT sessionStorage. The old
    // per-tab sessionStorage id reset every time a visitor opened a link in a new
    // tab or came back later, so almost every visit logged as a single-pageview
    // "bounce" and multi-page sessions were unmeasurable. localStorage is shared
    // across tabs of the same origin and the timestamp expires the session after
    // 30 min idle, so a genuine visit now keeps one id across tabs and reloads.
    let sessionId: string | null = null;
    try {
      const SESSION_TTL_MS = 30 * 60 * 1000;
      const now = Date.now();
      const raw = localStorage.getItem("fc_sid");
      if (raw) {
        const sep = raw.lastIndexOf(":");
        const id = sep > 0 ? raw.slice(0, sep) : "";
        const ts = sep > 0 ? Number(raw.slice(sep + 1)) : NaN;
        if (id && Number.isFinite(ts) && now - ts < SESSION_TTL_MS) sessionId = id;
      }
      if (!sessionId) sessionId = crypto.randomUUID();
      // Re-stamp on every pageview so the 30-min window rolls forward while active.
      localStorage.setItem("fc_sid", `${sessionId}:${now}`);
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
