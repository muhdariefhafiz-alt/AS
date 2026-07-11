"use client";

import { useState } from "react";

// Quote form for the magic-invite brief. Submitting an unclaimed profile's
// first quote also claims the profile (identity + consent from the required
// checkbox); the API does both in one call, so the agent never sees a
// password screen or a separate verification loop.
export default function InviteQuoteForm({
  inviteToken,
  agentName,
  claimed,
  alreadyQuoted,
}: {
  inviteToken: string;
  agentName: string;
  claimed: boolean;
  alreadyQuoted: boolean;
}) {
  const [pct, setPct] = useState("");
  const [weeks, setWeeks] = useState("");
  const [plan, setPlan] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">(
    alreadyQuoted ? "done" : "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [wasResubmit] = useState(alreadyQuoted);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    setError(null);
    if (!consent) {
      setError("Please confirm your identity and consent to be contacted.");
      return;
    }
    setState("submitting");
    try {
      const res = await fetch("/api/invite/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_token: inviteToken,
          commission_pct: Number(pct),
          est_timeline_weeks: weeks ? Number(weeks) : null,
          marketing_plan: plan,
          note: note || null,
          contact_consent: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not submit your quote.");
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setError("Network error. Please try again.");
      setState("idle");
    }
  }

  if (state === "done" && !error) {
    return (
      <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--blue-wash)] p-6 text-center">
        <p className="text-base font-bold text-gray-900">
          {wasResubmit
            ? "You have already quoted on this request."
            : "Your quote is with the homeowner."}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          We will email you the moment they respond.{" "}
          {!claimed &&
            "Your profile is now activated: future seller requests reach you directly."}
        </p>
        <a
          href="/dashboard?utm_source=invite_quote"
          className="mt-4 inline-block rounded-lg bg-[var(--blue)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--blue-deep)]"
        >
          Open your dashboard
        </a>
        <p className="mt-3 text-xs text-gray-500">
          Want the next request in seconds, not hours?{" "}
          <a href="/telegram-alerts?src=invite_success" className="underline">
            Get instant lead alerts on Telegram
          </a>
        </p>
        {wasResubmit && (
          <p className="mt-3 text-xs text-gray-500">
            Need to revise it?{" "}
            <button
              type="button"
              onClick={() => setState("idle")}
              className="underline"
            >
              Submit an updated quote
            </button>
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6"
    >
      <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
        Your quote
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Commission (%)
          </span>
          <input
            type="number"
            step="0.05"
            min="0.1"
            max="10"
            required
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            placeholder="e.g. 1.5"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[var(--blue)] focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Estimated time to sell (weeks, optional)
          </span>
          <input
            type="number"
            min="1"
            max="52"
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            placeholder="e.g. 8"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[var(--blue)] focus:outline-none"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-gray-700">
          How would you market this property?
        </span>
        <textarea
          required
          minLength={20}
          maxLength={2000}
          rows={4}
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          placeholder="Your pricing strategy, marketing channels, and how you qualify buyers. The homeowner compares this side by side with other quotes."
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[var(--blue)] focus:outline-none"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-gray-700">
          Note to the homeowner (optional)
        </span>
        <input
          type="text"
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[var(--blue)] focus:outline-none"
        />
      </label>

      <label className="mt-5 flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300"
        />
        <span className="text-xs text-gray-600">
          I confirm I am {agentName || "the agent named above"} and I agree to
          be contacted by FairComparisons about seller requests. This activates
          your free profile; you can unsubscribe at any time.
          {!claimed && " No password needed."}
        </span>
      </label>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        className={
          "mt-5 w-full rounded-lg px-5 py-3 text-sm font-semibold text-white shadow transition " +
          (state === "submitting"
            ? "bg-gray-400"
            : "bg-[var(--blue)] hover:bg-[var(--blue-deep)]")
        }
      >
        {state === "submitting" ? "Sending your quote…" : "Send my quote"}
      </button>
      <p className="mt-2 text-center text-xs text-gray-400">
        Free to respond. No platform fee. Quoting never affects your ranking.
      </p>
    </form>
  );
}
