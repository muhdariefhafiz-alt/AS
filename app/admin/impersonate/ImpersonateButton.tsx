"use client";

import { useState } from "react";

export default function ImpersonateButton({ agentId, agentName }: { agentId: number; agentName: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    if (!confirm(`Open ${agentName}'s dashboard as admin? This is logged.`)) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "Failed to start impersonation");
        setLoading(false);
        return;
      }
      window.location.href = data.redirect ?? "/dashboard";
    } catch {
      setErr("Failed to start impersonation");
      setLoading(false);
    }
  }

  return (
    <div className="shrink-0 text-right">
      <button
        onClick={go}
        disabled={loading}
        className="rounded-md border border-gray-900 bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {loading ? "Opening..." : "Impersonate"}
      </button>
      {err && <p className="mt-1 text-[11px] text-red-600">{err}</p>}
    </div>
  );
}
