"use client";

import { useState } from "react";

export type ClaimRow = {
  id: number;
  email: string;
  phone: string | null;
  created_at: string;
  agent_id: number;
  agent_name: string;
  agent_slug: string | null;
  agency_name: string | null;
  primary_area: string | null;
  cea_registration: string | null;
  score: number | null;
};

export function ClaimsQueue({ claims }: { claims: ClaimRow[] }) {
  const [rows, setRows] = useState<ClaimRow[]>(claims);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(claimId: number, decision: "approve" | "reject") {
    if (busy) return;
    if (decision === "approve" && !confirm("Approve this claim? It marks the profile claimed and records the agent agreement.")) return;
    setBusy(claimId);
    setError(null);
    try {
      const res = await fetch("/api/admin/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, decision }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error ?? "Action failed.");
        setBusy(null);
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== claimId));
      setBusy(null);
    } catch {
      setError("Network error. Please try again.");
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No claim requests awaiting review.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {rows.map((c) => (
        <div key={c.id} className="rounded-md border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h3 className="text-base font-bold text-gray-900">{c.agent_name}</h3>
                {c.agent_slug && (
                  <a
                    href={`/property-agents/agent/${c.agent_slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-[var(--blue,#1f44ff)] hover:underline"
                  >
                    View profile ↗
                  </a>
                )}
              </div>
              <p className="mt-0.5 text-sm text-gray-600">
                {c.agency_name ?? "—"}
                {c.primary_area ? ` · ${c.primary_area}` : ""}
                {c.cea_registration ? ` · CEA ${c.cea_registration}` : ""}
                {c.score != null ? ` · score ${Math.round(c.score)}` : ""}
              </p>
              <div className="mt-2 text-sm text-gray-800">
                Requested by <span className="font-semibold">{c.email}</span>
                {c.phone ? <span className="text-gray-500"> · {c.phone}</span> : null}
              </div>
              <div className="mt-1 text-[11px] text-gray-400">
                {c.created_at ? new Date(c.created_at).toLocaleString("en-SG") : ""}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={busy === c.id}
                onClick={() => decide(c.id, "reject")}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={busy === c.id}
                onClick={() => decide(c.id, "approve")}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === c.id ? "…" : "Approve"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
