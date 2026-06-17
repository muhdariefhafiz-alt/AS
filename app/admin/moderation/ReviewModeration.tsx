"use client";

import { useState } from "react";

// Community (open) reviews that have passed email confirmation and are waiting
// for an admin to approve before they go public. Approve publishes + refreshes
// the agent aggregate; reject hides it. Verified-completion reviews from the
// seller funnel skip this (already trusted) and never appear here.

export type PendingReview = {
  id: number;
  agent_name: string;
  agent_slug: string | null;
  agency_name: string | null;
  reviewer_name: string;
  rating_overall: number;
  transaction_type: string | null;
  comment: string;
  created_at: string | null;
};

export function ReviewModeration({ reviews }: { reviews: PendingReview[] }) {
  const [items, setItems] = useState(reviews);
  const [busy, setBusy] = useState<number | null>(null);

  async function decide(id: number, decision: "approve" | "reject") {
    setBusy(id);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "review", reviewId: id, decision }),
      });
      if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">No community reviews awaiting moderation.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">
                {"★".repeat(Math.max(0, Math.min(5, Math.round(r.rating_overall))))}
                <span className="ml-1.5 font-normal text-gray-400">{r.rating_overall}/5</span>
              </div>
              <p className="mt-1.5 whitespace-pre-line text-sm text-gray-800">{r.comment}</p>
              <p className="mt-2 text-xs text-gray-500">
                {r.reviewer_name} on{" "}
                {r.agent_slug ? (
                  <a
                    href={`/property-agents/agent/${r.agent_slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[var(--blue)] hover:underline"
                  >
                    {r.agent_name}
                  </a>
                ) : (
                  r.agent_name
                )}
                {r.agency_name ? ` · ${r.agency_name}` : ""}
                {r.transaction_type ? ` · ${r.transaction_type}` : ""}
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <button
                onClick={() => decide(r.id, "approve")}
                disabled={busy === r.id}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => decide(r.id, "reject")}
                disabled={busy === r.id}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
