"use client";

import { useState, useEffect } from "react";

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
  const [rating, setRating] = useState(0);
  const [txType, setTxType] = useState("");
  const [comment, setComment] = useState("");
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
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          reviewerName: name,
          rating,
          transactionType: txType || null,
          comment: comment || null,
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

  const firstName = agentName.split(" ")[0];

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
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-teal-300 hover:text-teal-700"
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
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
                      ? "border-teal-500 bg-teal-50 text-teal-700"
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
            <label className="text-xs font-medium text-gray-500">Your review (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What was your experience like?"
              maxLength={2000}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
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
            Reviews are moderated before publishing. Only genuine client experiences are approved.
          </p>
        </form>
      )}

      {/* Success message */}
      {submitted && (
        <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4">
          <p className="text-sm font-medium text-teal-800">Thank you for your review.</p>
          <p className="mt-1 text-xs text-teal-700">It will appear on this page after moderation.</p>
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
          <button onClick={() => setShowForm(true)} className="text-teal-600 hover:underline">
            Be the first to leave a review.
          </button>
        </p>
      ) : null}
    </section>
  );
}
