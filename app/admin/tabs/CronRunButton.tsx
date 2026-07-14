"use client";

import { useState } from "react";

/**
 * "Run now" trigger for a single cron, sized to sit inline next to a row in the
 * OpsTab cron schedule table. Posts the cron's path to /api/admin/cron-run
 * (admin-gated, whitelisted server-side), shows a spinner while the job runs,
 * then shows a compact summary of the cron's JSON response (e.g. "sent: 3") or
 * the error inline. Runs live (dry:false); the endpoint itself is the guard.
 */

type RunResult = { ok: boolean; status?: number; body?: unknown; error?: string };

export default function CronRunButton({ path }: { path: string }) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [summary, setSummary] = useState("");

  async function run() {
    setState("running");
    setSummary("");
    try {
      const res = await fetch("/api/admin/cron-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, dry: false }),
      });
      const data = (await res.json()) as RunResult;
      if (!data.ok) {
        setState("error");
        setSummary(data.error ? String(data.error) : `HTTP ${data.status ?? res.status}`);
        return;
      }
      setState("done");
      setSummary(summarize(data.body) || `HTTP ${data.status ?? 200}`);
    } catch {
      setState("error");
      setSummary("request failed");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={state === "running"}
        className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {state === "running" ? (
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
            </svg>
            Running…
          </span>
        ) : (
          "Run now"
        )}
      </button>
      {summary && (
        <span className={`text-xs ${state === "error" ? "text-red-600" : "text-gray-500"}`}>
          {summary}
        </span>
      )}
    </span>
  );
}

/**
 * Turn a cron's JSON response into a short one-line summary. Crons return
 * heterogeneous shapes, so prefer a set of known outcome keys, then fall back
 * to the first couple of primitive fields.
 */
function summarize(body: unknown): string {
  if (body == null) return "";
  if (typeof body === "string") return body.slice(0, 80);
  if (typeof body !== "object") return String(body);

  const o = body as Record<string, unknown>;
  const preferred = [
    "sent", "would_send", "updated", "processed", "notified", "scanned",
    "revalidated", "expired", "verified", "created", "skipped", "count",
    "dry_run", "reason", "error",
  ];
  const parts: string[] = [];
  for (const k of preferred) {
    if (parts.length >= 3) break;
    const v = o[k];
    if (v != null && typeof v !== "object") parts.push(`${k}: ${String(v)}`);
  }
  if (parts.length) return parts.join(", ");

  for (const [k, v] of Object.entries(o)) {
    if (parts.length >= 3) break;
    if (v != null && typeof v !== "object") parts.push(`${k}: ${String(v)}`);
  }
  return parts.join(", ") || "done";
}
