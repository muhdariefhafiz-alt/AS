import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, EmptyState } from "../shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Pipeline tracker. The dashboard was restructured around the deal on the claim
// that naming an agent's work after their work makes the work progress. These
// are the numbers that decide whether that was true.
//
// The one to watch is not deals_total. It is stuck_30d against deals_total: a
// rising count of deals nobody has touched in a month means we built a place to
// park work rather than a place to do it, and every other number here is vanity.

type Tracker = {
  deals_total: number;
  deals_30d: number;
  agents_with_a_deal: number;
  by_stage: Record<string, number>;
  by_source: Record<string, number>;
  median_dwell_days: Record<string, number>;
  transitions: { from: string; to: string; n: number }[];
  reached_agreement: number;
  completed: number;
  lost: number;
  stuck_30d: number;
  docs_attached_pct: number | null;
};

const STAGE_ORDER = ["enquiry", "viewing", "offer", "agreement", "completed", "lost"];
const STAGE_LABEL: Record<string, string> = {
  enquiry: "Enquiry", viewing: "Viewing", offer: "Offer",
  agreement: "Agreement", completed: "Completed", lost: "Lost",
};

export async function PipelineTab() {
  const { data, error } = await supabase.rpc("sg_pipeline_tracker");
  if (error || !data) {
    return <EmptyState title="Pipeline tracker unavailable" hint={error?.message ?? "RPC returned no data"} />;
  }
  const t = data as Tracker;
  const open = STAGE_ORDER.slice(0, 4).reduce((a, s) => a + (t.by_stage[s] ?? 0), 0);

  return (
    <div className="space-y-8">
      <section>
        <SectionHeading
          title="Does the spine move?"
          hint="A deal is created by a booked viewing or an addressed document, never by an agent filling in a form. Sandbox agents are excluded inside the RPC."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Deals, all time" value={t.deals_total} sub={`${t.agents_with_a_deal} agents have one`} />
          <StatCard title="Started in 30 days" value={t.deals_30d} sub="the supply of real work" />
          <StatCard title="Reached agreement" value={t.reached_agreement} sub={`${t.completed} completed`} />
          <StatCard
            title="COUNTER: stuck 30d+"
            value={t.stuck_30d}
            sub={t.deals_total ? `${Math.round((100 * t.stuck_30d) / Math.max(1, open))}% of open deals untouched` : "no deals yet"}
          />
        </div>
      </section>

      <section>
        <SectionHeading title="Where the work is sitting" hint="Live count per stage, and the median days a deal spends there before it moves." />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STAGE_ORDER.map((s) => (
            <StatCard
              key={s}
              title={STAGE_LABEL[s]}
              value={t.by_stage[s] ?? 0}
              sub={t.median_dwell_days[s] != null ? `${t.median_dwell_days[s]} days median` : "no history"}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Which entry point starts a deal" hint="If manual dominates, the automatic paths are not catching real work and the agent is doing our filing." />
        {Object.keys(t.by_source).length === 0 ? (
          <EmptyState title="No deals yet" hint="Nothing has been started by a real agent." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(t.by_source)
              .sort((a, b) => b[1] - a[1])
              .map(([source, n]) => <StatCard key={source} title={source} value={n} sub="deals started here" />)}
          </div>
        )}
      </section>

      <section>
        <SectionHeading title="Stage to stage" hint="Recorded transitions. A stage with plenty in and nothing out is a wall, not a step." />
        {t.transitions.length === 0 ? (
          <EmptyState title="No transitions yet" hint="Deals have not moved between stages." />
        ) : (
          <ul className="space-y-1 text-sm text-gray-700">
            {t.transitions.map((tr, i) => (
              <li key={i}>
                {STAGE_LABEL[tr.from] ?? tr.from} &rarr; {STAGE_LABEL[tr.to] ?? tr.to}:{" "}
                <b className="tabular-nums text-gray-900">{tr.n}</b>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-gray-500">
          Documents attached to a deal:{" "}
          <b className="text-gray-900">{t.docs_attached_pct == null ? "no documents yet" : `${t.docs_attached_pct}%`}</b>. A low
          number means documents are being written without an address, so the spine cannot see them.
        </p>
      </section>
    </div>
  );
}
