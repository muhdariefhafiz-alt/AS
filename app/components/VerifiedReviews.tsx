import { supabase } from "../lib/supabase";

type Review = {
  id: number;
  rating_overall: number;
  comment: string | null;
  seller_initials: string | null;
  verified_completion: boolean;
  updated_at: string;
};

function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={
            "text-base " + (n <= value ? "text-amber-400" : "text-gray-200")
          }
        >
          ★
        </span>
      ))}
    </span>
  );
}

// Server-rendered verified reviews block. Sits above the existing
// AgentReviews component on each agent profile. Only shows when the agent
// has at least one published, PDPA-consented review.
export default async function VerifiedReviews({
  agentId,
}: {
  agentId: number;
}) {
  const { data: reviews } = await supabase
    .from("sg_agent_reviews")
    .select(
      "id, rating_overall, comment, seller_initials, verified_completion, updated_at"
    )
    .eq("agent_id", agentId)
    .eq("status", "published")
    .eq("pdpa_consent_review", true)
    .order("updated_at", { ascending: false })
    .limit(20);

  const rows = (reviews ?? []) as Review[];
  if (rows.length === 0) return null;

  const avg =
    rows.reduce((s, r) => s + (Number(r.rating_overall) || 0), 0) / rows.length;

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-900">
          Verified seller reviews
        </h2>
        <span className="text-xs text-gray-500">
          {rows.length} {rows.length === 1 ? "review" : "reviews"} ·{" "}
          {avg.toFixed(1)}/5 average
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Each review is tied to a sale that completed through FairComparisons.
        Initials only; full names never shown.
      </p>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-2xl border border-gray-100 bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Stars value={r.rating_overall} />
                {r.verified_completion && (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    Verified completion
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {r.seller_initials ?? "Anonymous"} ·{" "}
                {new Date(r.updated_at).toLocaleDateString("en-SG", {
                  year: "numeric",
                  month: "short",
                })}
              </span>
            </div>
            {r.comment && (
              <p className="mt-2 text-sm text-gray-700">{r.comment}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
