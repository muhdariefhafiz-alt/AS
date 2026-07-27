import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, Pill, EmptyState } from "../shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Planner (scheduler) feature tracker. TARS-shaped, all data from the
// sg_planner_tracker() RPC:
//   Target      claimed agents (the adoption denominator, never all 38k)
//   Adoption    split passive (requests RECEIVED) vs active (agent copied
//               link / confirmed / connected calendar)
//   Retention   active in 2+ distinct weeks of the last 4 (weekly natural freq)
//   Satisfaction confirm rate + median hours to confirm (behavioral proxies)

type Weekly = { week_start: string; booking_views: number; requests: number; confirms: number; active_agents: number };
type AgentRow = {
  id: number; name: string; slug: string | null; claimed: boolean;
  calendar_connected: boolean; views_30d: number; copies_30d: number;
  requests_30d: number; confirmed_30d: number; last_activity: string | null;
};
type Tracker = {
  tars: {
    target_claimed_agents: number;
    reach_booking_page_viewed_30d: number;
    passive_requests_received_30d: number;
    active_adopted_30d: number;
    active_adopted_ever: number;
    calendar_connected: number;
    retained_2plus_weeks_of_4: number;
    confirm_rate_30d_pct: number | null;
    median_hours_to_confirm_90d: number | null;
  };
  funnel_30d: {
    booking_views: number; link_copies: number; booking_requests: number;
    confirmed: number; cancelled: number; awaiting_response: number; calendar_connects: number;
  };
  weekly: Weekly[];
  agents: AgentRow[];
};

function pct(n: number, d: number): string {
  if (!d) return "0%";
  return `${Math.round((100 * n) / d)}%`;
}

export async function PlannerTab() {
  const { data, error } = await supabase.rpc("sg_planner_tracker");
  if (error || !data) {
    return <EmptyState title="Planner tracker unavailable" hint={error?.message ?? "RPC returned no data"} />;
  }
  const t = data as Tracker;
  const target = t.tars.target_claimed_agents;
  const maxWeekly = Math.max(1, ...t.weekly.map((w) => Math.max(w.booking_views, w.requests, w.confirms)));

  return (
    <div className="space-y-8">
      {/* TARS ladder */}
      <section>
        <SectionHeading
          title="TARS: is the scheduler finding its users?"
          hint="Denominator discipline: adoption is measured against CLAIMED agents (the target), never the full register. Passive = demand arrived; active = the agent did something with the feature."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Target: claimed agents" value={target} sub="the adoption denominator" />
          <StatCard
            title="Active adoption 30d"
            value={t.tars.active_adopted_30d}
            sub={`${pct(t.tars.active_adopted_30d, target)} of target · copied link, confirmed, or connected calendar`}
          />
          <StatCard
            title="Retained (2+ of last 4 wks)"
            value={t.tars.retained_2plus_weeks_of_4}
            sub="weekly is the natural frequency"
          />
          <StatCard
            title="Confirm rate 30d"
            value={t.tars.confirm_rate_30d_pct != null ? `${t.tars.confirm_rate_30d_pct}%` : "no requests yet"}
            sub={
              t.tars.median_hours_to_confirm_90d != null
                ? `median ${t.tars.median_hours_to_confirm_90d}h to confirm`
                : "satisfaction proxy"
            }
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatCard title="Booking pages viewed 30d" value={t.tars.reach_booking_page_viewed_30d} sub="distinct agents whose /book page got traffic" />
          <StatCard title="Requests received 30d" value={t.tars.passive_requests_received_30d} sub="distinct agents with seller demand (passive)" />
          <StatCard title="Calendar connected" value={t.tars.calendar_connected} sub={`${pct(t.tars.calendar_connected, target)} of target · deepest commitment signal`} />
        </div>
      </section>

      {/* 30-day funnel */}
      <section>
        <SectionHeading
          title="Funnel, last 30 days"
          hint="Seller side: page view to request. Agent side: request to response. A gap between views and requests is a booking-page conversion problem; a gap between requests and confirms is an agent responsiveness problem."
        />
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 font-medium text-gray-700">Booking page views</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{t.funnel_30d.booking_views}</td>
                <td className="px-4 py-2.5 text-xs text-gray-400">seller lands on /book/[agent]</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 font-medium text-gray-700">Viewing requests</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{t.funnel_30d.booking_requests}</td>
                <td className="px-4 py-2.5 text-xs text-gray-400">
                  {pct(t.funnel_30d.booking_requests, t.funnel_30d.booking_views)} of views
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 font-medium text-gray-700">Confirmed</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{t.funnel_30d.confirmed}</td>
                <td className="px-4 py-2.5 text-xs text-gray-400">
                  {pct(t.funnel_30d.confirmed, t.funnel_30d.booking_requests)} of requests
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 font-medium text-gray-700">Awaiting response</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{t.funnel_30d.awaiting_response}</td>
                <td className="px-4 py-2.5 text-xs text-gray-400">{t.funnel_30d.cancelled} cancelled</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-gray-700">Link copies / calendar connects</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">
                  {t.funnel_30d.link_copies} / {t.funnel_30d.calendar_connects}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-400">agent-initiated distribution + commitment</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Weekly trend */}
      <section>
        <SectionHeading title="Weekly trend, last 8 weeks" hint="Views vs requests vs confirms, plus how many distinct agents had any planner activity that week." />
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="pb-2 pr-4 font-medium">Week of</th>
                <th className="pb-2 pr-4 font-medium">Views</th>
                <th className="pb-2 pr-4 font-medium">Requests</th>
                <th className="pb-2 pr-4 font-medium">Confirms</th>
                <th className="pb-2 font-medium">Active agents</th>
              </tr>
            </thead>
            <tbody>
              {t.weekly.map((w) => (
                <tr key={w.week_start} className="border-t border-gray-50">
                  <td className="py-1.5 pr-4 font-medium text-gray-600">{w.week_start}</td>
                  {[w.booking_views, w.requests, w.confirms].map((n, i) => (
                    <td key={i} className="py-1.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-right font-bold tabular-nums text-gray-800">{n}</span>
                        <span
                          className="inline-block h-2 rounded-sm"
                          style={{
                            width: `${Math.max(2, Math.round((n / maxWeekly) * 90))}px`,
                            background: i === 0 ? "#93c5fd" : i === 1 ? "#1f44ff" : "#059669",
                          }}
                        />
                      </div>
                    </td>
                  ))}
                  <td className="py-1.5 font-bold tabular-nums text-gray-800">{w.active_agents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per-agent detail */}
      <section>
        <SectionHeading title="Per agent" hint="Everyone who has ever touched the scheduler (viewings, calendar, link copies), most recent first. Top 20." />
        {t.agents.length === 0 ? (
          <EmptyState
            title="No scheduler activity yet"
            hint="Instrumentation is live from today. Views, requests, link copies and calendar connects will appear here as they happen."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="px-4 py-2 font-medium">Agent</th>
                  <th className="px-4 py-2 font-medium">Calendar</th>
                  <th className="px-4 py-2 text-right font-medium">Views 30d</th>
                  <th className="px-4 py-2 text-right font-medium">Copies 30d</th>
                  <th className="px-4 py-2 text-right font-medium">Requests 30d</th>
                  <th className="px-4 py-2 text-right font-medium">Confirmed 30d</th>
                  <th className="px-4 py-2 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {t.agents.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50">
                    <td className="px-4 py-2">
                      <span className="font-semibold text-gray-900">{a.name}</span>{" "}
                      {a.claimed ? <Pill color="emerald">claimed</Pill> : <Pill color="gray">unclaimed</Pill>}
                    </td>
                    <td className="px-4 py-2">{a.calendar_connected ? <Pill color="blue">connected</Pill> : <span className="text-xs text-gray-400">not connected</span>}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{a.views_30d}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{a.copies_30d}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{a.requests_30d}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{a.confirmed_30d}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {a.last_activity ? new Date(a.last_activity).toLocaleDateString("en-SG", { day: "numeric", month: "short" }) : "never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-gray-400">
        Reading guide: viewings are episodic, so judge this feature on penetration of the claimed base and
        on the confirm-rate quality bar, not on raw repeat usage. Adoption benchmark for a
        medium-severity workflow problem: 50-60% of target. Below 30% with healthy booking-page
        traffic means an awareness or friction problem in the dashboard, not a demand problem.
      </p>
    </div>
  );
}
