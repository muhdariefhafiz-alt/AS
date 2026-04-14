"use client";

import { useEffect, useRef } from "react";

interface FunnelTrackerProps {
  event: string;
  agentId?: number;
  agentSlug?: string;
  pagePath?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Invisible component that fires a single funnel event on mount.
 * Used on server-rendered pages to track page views without hydrating the whole page.
 */
export default function FunnelTracker({ event, agentId, agentSlug, pagePath, metadata }: FunnelTrackerProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    fetch("/api/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, agentId, agentSlug, pagePath, metadata }),
    }).catch(() => {});
  }, [event, agentId, agentSlug, pagePath, metadata]);

  return null;
}
