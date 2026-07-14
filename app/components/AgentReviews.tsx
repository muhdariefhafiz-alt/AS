"use client";

import { useState, useEffect } from "react";
import { greetName } from "../lib/names";

type Review = {
  id: number;
  reviewer_name: string;
  rating: number;
  transaction_type: string | null;
  comment: string | null;
  created_at: string;
};

type Props = {
  agentId: number;
  agentName: string;
};

const TX_TYPES = [
  "Bought a property",
  "Sold a property",
  "Rented a property",
  "Other",
];

function Stars({ rating, interactive, onChange }: { rating: number; interactive?: boolean; onChange?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type={interactive ? "button" : undefined}
          disabled={!interactive}
          onClick={() => onChange?.(i)}
          className={`text-lg ${interactive ? "cursor-pointer hover:scale-110 transition" : "cursor-default"} ${i <= rating ? "text-amber-400" : "text-gray-200"}`}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
        >
          &#9733;
        </button>
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? "s" : ""} ago`;
}

export default function AgentReviews({ agentId, agentName }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [txType, setTxType] = useState("");
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reviews?agentId=${agentId}`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : { reviews: [] })
      .then((d) => setReviews(d.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [agentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || rating === 0) {
      setError("Please enter your name and select a rating.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email — we send a one-click confirmation.");
      return;
    }
    if (comment.trim().length < 15) {
      setError("Please write at least 15 characters about your experience.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          reviewerName: name,
          reviewerEmail: email,
          rating,
          transactionType: txType || null,
          comment: comment || null,
          website, // honeypot
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || "Could not submit review");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const firstName = greetName(agentName);

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Client reviews</h2>
          {reviews.length > 0 && (
            <p className="mt-0.5 text-sm text-gray-500">
              {avgRating}/5 average from {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {!showForm && !submitted && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-[var(--line-2)] hover:text-[var(--blue-deep)]"
          >
            Write a review
          </button>
        )}
      </div>

      {/* Review form */}
      {showForm && !submitted && (
        <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-gray-200 bg-gray-50/50 p-5">
          <p className="text-sm font-medium text-gray-900">Share your experience with {firstName}</p>

          {/* Rating */}
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-500">Rating</label>
            <div className="mt-1">
              <Stars rating={rating} interactive onChange={setRating} />
            </div>
          </div>

          {/* Name */}
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-500">Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah T."
              maxLength={100}
              required
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
            />
            <p className="mt-1 text-[11px] text-gray-400">Published as initials only.</p>
          </div>

          {/* Email (verification) */}
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-500">Your email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              maxLength={254}
              required
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Never shown. We email a one-click link to confirm your review is real.
            </p>
          </div>

          {/* Honeypot — hidden from humans, bots fill it */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, overflow: "hidden" }}>
            <label>Website</label>
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {/* Transaction type */}
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-500">How did you work with {firstName}?</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {TX_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTxType(txType === t ? "" : t)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    txType === t
                      ? "border-[var(--blue)] bg-[var(--blue-wash)] text-[var(--blue-deep)]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-500">Your review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What was your experience like?"
              maxLength={2000}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
            />
          </div>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[var(--blue)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--blue-deep)] disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit review"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Email-confirmed before publishing. Reviews are spot-checked and abuse is removed. Sales sourced through FairComparisons carry a &ldquo;Verified completion&rdquo; badge.
          </p>
        </form>
      )}

      {/* Success message */}
      {submitted && (
        <div className="mt-4 rounded-xl border border-[var(--line-2)] bg-[var(--blue-wash)] p-4">
          <p className="text-sm font-medium text-[var(--blue-deep)]">Almost done — check your email.</p>
          <p className="mt-1 text-xs text-[var(--blue-deep)]">
            We sent a one-click confirmation link. Your review publishes the moment you click it. (This is how we keep fake reviews out.)
          </p>
        </div>
      )}

      {/* Existing reviews */}
      {loading ? (
        <div className="mt-4 text-sm text-gray-400">Loading reviews...</div>
      ) : reviews.length > 0 ? (
        <div className="mt-4 space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-lg border border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                    {r.reviewer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">{r.reviewer_name}</span>
                    {r.transaction_type && (
                      <span className="ml-2 text-xs text-gray-400">{r.transaction_type}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
              </div>
              <div className="mt-1.5">
                <Stars rating={r.rating} />
              </div>
              {r.comment && (
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      ) : !showForm && !submitted ? (
        <p className="mt-4 text-sm text-gray-400">
          No reviews yet. Worked with {firstName}?{" "}
          <button onClick={() => setShowForm(true)} className="text-[var(--blue)] hover:underline">
            Be the first to leave a review.
          </button>
        </p>
      ) : null}
    </section>
  );
}
