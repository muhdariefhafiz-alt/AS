"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
  agentName: string;
  agentSlug: string | null;
  alreadyReviewed: boolean;
};

const STARS = [1, 2, 3, 4, 5];

export default function ReviewForm({
  token,
  agentName,
  agentSlug,
  alreadyReviewed,
}: Props) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [initials, setInitials] = useState<string>("");
  const [pdpa, setPdpa] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (alreadyReviewed && !done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-base font-semibold text-emerald-900">
          You&apos;ve already reviewed {agentName}.
        </p>
        {agentSlug && (
          <a
            href={`/property-agents/agent/${agentSlug}`}
            className="mt-3 inline-block text-sm font-medium text-emerald-700 underline"
          >
            See {agentName}&apos;s profile
          </a>
        )}
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-base font-semibold text-emerald-900">
          Thanks. Your review is published.
        </p>
        <p className="mt-2 text-sm text-emerald-800">
          It helps the next seller in your area pick well.
        </p>
        {agentSlug && (
          <a
            href={`/property-agents/agent/${agentSlug}`}
            className="mt-3 inline-block text-sm font-medium text-emerald-700 underline"
          >
            See {agentName}&apos;s public profile
          </a>
        )}
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || rating === 0 || !pdpa || comment.trim().length < 10) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sell/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rating_overall: rating,
          comment: comment.trim(),
          seller_initials: initials.trim() || null,
          pdpa_consent_review: pdpa,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not submit review.");
        setSubmitting(false);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const visibleRating = hover || rating;

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"
    >
      <fieldset className="border-0 p-0">
        <legend className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">
          1 · Your rating
        </legend>
        <div className="mt-3 flex items-center gap-1.5">
          {STARS.map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className={
                "text-3xl transition " +
                (visibleRating >= n ? "text-amber-400" : "text-gray-300")
              }
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
            >
              ★
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-gray-600">
              {rating}/5
            </span>
          )}
        </div>
      </fieldset>

      <fieldset className="mt-6 border-0 p-0">
        <legend className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">
          2 · What stood out
        </legend>
        <p className="mt-1 text-xs text-gray-500">
          What was {agentName} actually like? Honest is most useful. 10–500
          characters.
        </p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          rows={4}
          required
          minLength={10}
          maxLength={500}
          placeholder="They priced realistically, kept us updated weekly, and..."
          className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
        />
        <p className="mt-1 text-right text-xs text-gray-400">
          {comment.length}/500
        </p>
      </fieldset>

      <fieldset className="mt-6 border-0 p-0">
        <legend className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">
          3 · How should we show your name
        </legend>
        <p className="mt-1 text-xs text-gray-500">
          Public reviews show initials only. Default is your initials from
          when you submitted the lead.
        </p>
        <input
          value={initials}
          onChange={(e) =>
            setInitials(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z. ]/g, "")
                .slice(0, 6)
            )
          }
          placeholder="e.g. L.V."
          className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
        />
      </fieldset>

      <label className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-gray-600">
        <input
          type="checkbox"
          checked={pdpa}
          onChange={(e) => setPdpa(e.target.checked)}
          className="mt-0.5 h-4 w-4"
          required
        />
        <span>
          I consent to publishing my rating, comment, and initials on
          FairComparisons. I understand my full name and contact details are
          never shown. (PDPA, separate from my lead-submission consent.)
        </span>
      </label>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={
          submitting || rating === 0 || !pdpa || comment.trim().length < 10
        }
        className={
          "mt-6 w-full rounded-lg px-6 py-3 text-sm font-semibold text-white shadow transition " +
          (submitting || rating === 0 || !pdpa || comment.trim().length < 10
            ? "bg-gray-300"
            : "bg-[var(--blue)] hover:bg-[var(--blue-deep)]")
        }
      >
        {submitting ? "Submitting…" : "Publish my review"}
      </button>
    </form>
  );
}
