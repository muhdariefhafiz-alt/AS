"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AgentFlags from "../../../components/AgentFlags";
import { greetName } from "../../../lib/names";

export type QuoteRow = {
  quote_id: number;
  agent_id: number;
  agent_name: string;
  agent_slug: string | null;
  agency_name: string;
  agent_score: number;
  agent_flags?: { t: string; pct?: number }[] | null;
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
  // The page renders a richer "we emailed your agents, waiting on them" notice
  // above this component. When it does, skip the plain "no quotes yet" card so
  // the seller does not see two competing empty states.
  waitingNoticeShown?: boolean;
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
  waitingNoticeShown = false,
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
    // The page already shows the "we emailed your agents, waiting on them"
    // notice above, so avoid a second, blunter empty state under it.
    if (waitingNoticeShown) return null;
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

  const winner = rows.find((r) => r.quote_id === pickedQuoteId) ?? null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {alreadyPicked && winner && (
        // Post-pick next steps: the handoff email (api/sell/pick) has sent the
        // seller's contact details to this one agent, so tell the seller
        // exactly what to expect instead of leaving a bare badge.
        <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--blue-wash)] p-5">
          <p className="text-sm font-bold text-gray-900">What happens next</p>
          <p className="mt-1 text-sm text-gray-700">
            {winner.agent_name} has been sent your contact details and is
            expected to contact you within a day or two to arrange the agency
            agreement. Nothing is binding until you sign that agreement with
            them. We have emailed you a written record of the agreed terms.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Heard nothing after a few days? Email{" "}
            <a href="mailto:hello@fair-comparisons.com" className="underline">
              hello@fair-comparisons.com
            </a>{" "}
            and we will chase it.
          </p>
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
                {q.agent_flags && q.agent_flags.length > 0 && (
                  <div className="mt-2">
                    <AgentFlags flags={q.agent_flags} size="sm" max={3} />
                  </div>
                )}
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
                  : `Instruct ${greetName(q.agent_name) || q.agent_name}`}
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
