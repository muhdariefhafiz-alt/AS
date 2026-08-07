"use client";

/**
 * Fire a dashboard event, attributed server-side to the signed-in agent.
 *
 * Deliberately fire-and-forget and deliberately silent on failure: telemetry
 * must never break the surface it measures. keepalive so an event fired as the
 * agent navigates away still lands.
 *
 * Call these on ACTIONS, not on render. This codebase has twice shipped metrics
 * that fired on mount (dashboard_login, standing_view, area_intel_viewed) and
 * then could not tell intent from a page load, which is how a feature ends up
 * looking used when nobody touched it. The one exception is tab views, where
 * the render IS the action: the agent chose that tab.
 */
export function track(event: string, metadata?: Record<string, unknown>) {
  try {
    void fetch("/api/dashboard/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, metadata: metadata ?? {} }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never let telemetry throw into a render path */
  }
}

/**
 * First use of a tool, per agent per tool, deduplicated in this browser.
 *
 * Feature discovery (brief section 07) is measured as "tools first used per
 * claimed agent", so a repeat open must not look like a new discovery. The
 * localStorage guard is best-effort; the analysis should still count DISTINCT
 * (agent, tool) rather than trusting the client.
 */
export function trackFirstUse(tool: string, arrivedFrom: string) {
  const key = `fc_tool_first:${tool}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    /* private mode: fall through and let the server dedupe on distinct */
  }
  track("tool_first_used", { tool, arrived_from: arrivedFrom });
}
