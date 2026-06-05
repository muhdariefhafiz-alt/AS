"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type QuoteRow = {
  quote_id: number;
  agent_id: number;
  agent_name: string;
  agent_slug: string | null;
  agency_name: string;
  agent_score: number;
  commission_pct: number;
  est_timeline_weeks: number | null;
  est_value_low: number | null;
  est_value_high: number | null;
  marketing_plan: string;
  note: string | null;
  status: string;
  submitted_at: string | null;
};

type Props = {
  token: string;
  rows: QuoteRow[];
  alreadyPicked: boolean;
  pickedQuoteId: number | null;
};

function fmtPrice(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `S$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `S$${(n / 1_000).toFixed(0)}K`;
  return `S$${n}`;
}

export default function QuotesView({
  token,
  rows,
  alreadyPicked,
  pickedQuoteId,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reshortlisting, setReshortlisting] = useState(false);

  async function reshortlist() {
    if (reshortlisting || alreadyPicked) return;
    setReshortlisting(true);
    setError(null);
    try {
      const res = await fetch("/api/sell/reshortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not expand your shortlist.");
        setReshortlisting(false);
        return;
      }
      router.push(`/sell/shortlist/${token}`);
    } catch {
      setError("Network error. Please try again.");
      setReshortlisting(false);
    }
  }

  async function pick(quote_id: number) {
    if (submitting !== null || alreadyPicked) return;
    setSubmitting(quote_id);
    setError(null);
    try {
      const res = await fetch("/api/sell/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, quote_id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not record your pick.");
        setSubmitting(null);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-base font-semibold text-gray-900">
          No quotes yet.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Invited agents have 24 hours to submit a fee quote. We&apos;ll email
          you the moment each one comes in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {rows.map((q) => {
        const isWinner = pickedQuoteId === q.quote_id;
        const isLoser = alreadyPicked && !isWinner;
        return (
          <div
            key={q.quote_id}
            className={
              "rounded-2xl border p-5 transition " +
              (isWinner
                ? "border-[var(--blue)] bg-[var(--blue-wash)]"
                : isLoser
                  ? "border-gray-200 bg-gray-50 opacity-70"
                  : "border-gray-200 bg-white")
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {q.agent_name}
                </h3>
                <p className="mt-0.5 text-sm text-gray-600">
                  {q.agency_name}
                  {q.agent_slug && (
                    <>
                      {" · "}
                      <Link
                        href={`/property-agents/agent/${q.agent_slug}`}
                        target="_blank"
                        className="text-xs font-medium text-[var(--blue)] hover:underline"
                      >
                        Profile {"↗"}
                      </Link>
                    </>
                  )}
                </p>
              </div>
              {isWinner && (
                <span className="inline-flex items-center rounded-full bg-[var(--blue)] px-3 py-1 text-xs font-semibold text-white">
                  Instructed
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Commission
                </p>
                <p className="mt-0.5 text-2xl font-extrabold text-gray-900">
                  {q.commission_pct.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Est. timeline
                </p>
                <p className="mt-0.5 text-2xl font-extrabold text-gray-900">
                  {q.est_timeline_weeks
                    ? `${q.est_timeline_weeks} wks`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Est. sale range
                </p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {fmtPrice(q.est_value_low)} – {fmtPrice(q.est_value_high)}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Marketing approach
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-gray-800">
                {q.marketing_plan}
              </p>
              {q.note && (
                <p className="mt-3 text-xs text-gray-500">{q.note}</p>
              )}
            </div>

            {!alreadyPicked && (
              <button
                type="button"
                onClick={() => pick(q.quote_id)}
                disabled={submitting !== null}
                className={
                  "mt-5 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white shadow transition " +
                  (submitting === q.quote_id
                    ? "bg-gray-400"
                    : "bg-[var(--blue)] hover:bg-[var(--blue-deep)]")
                }
              >
                {submitting === q.quote_id
                  ? "Recording your pick…"
                  : `Instruct ${q.agent_name.split(" ")[0]}`}
              </button>
            )}
          </div>
        );
      })}

      {!alreadyPicked && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center">
          <p className="text-sm text-gray-600">
            None of these the right fit?
          </p>
          <button
            type="button"
            onClick={reshortlist}
            disabled={reshortlisting}
            className={
              "mt-3 rounded-lg border px-5 py-2.5 text-sm font-semibold transition " +
              (reshortlisting
                ? "border-gray-200 text-gray-400"
                : "border-[var(--line-2)] text-[var(--blue-deep)] hover:bg-[var(--blue-wash)]")
            }
          >
            {reshortlisting ? "Finding more agents…" : "Show me more agents"}
          </button>
        </div>
      )}
    </div>
  );
}
