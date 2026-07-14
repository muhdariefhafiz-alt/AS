import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, MS_DAY } from "../shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const uniq =<T,>(rows: T[] | null | undefined, key: keyof T) =>
  new Set((rows ?? []).map((r) => r[key]).filter(Boolean)).size;

async function countEvent(event: string, since?: string): Promise<number> {
  let q = supabase.from("sg_funnel_events").select("id", { count: "exact", head: true }).eq("event", event);
  if (since) q = q.gte("created_at", since);
  const { count } = await q;
  return count ?? 0;
}
async function countLeadEvent(eventType: string, since?: string): Promise<number> {
  let q = supabase.from("sg_lead_events").select("id", { count: "exact", head: true }).eq("event_type", eventType);
  if (since) q = q.gte("created_at", since);
  const { count } = await q;
  return count ?? 0;
}

// One funnel stage: label, count, bar (vs top), and step conversion from prev.
function Stage({ label, n, top, prev, leak }: { label: string; n: number; top: number; prev?: number; leak?: boolean }) {
  const pct = top > 0 ? Math.max(Math.round((n / top) * 100), n > 0 ? 3 : 0) : 0;
  const step = prev != null && prev > 0 ? Math.round((n / prev) * 100) : null;
  return (
    <div className="grid grid-cols-[150px_1fr_120px] items-center gap-3 py-1.5">
      <span className="text-[13px] font-medium text-gray-700">{label}</span>
      <div className="h-3 rounded bg-gray-100">
        <div className={`h-3 rounded ${leak ? "bg-red-400" : "bg-teal-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-right text-[13px] tabular-nums text-gray-900">
        <span className="font-bold">{n.toLocaleString()}</span>
        {step != null && <span className={`ml-2 text-[11px] ${step < 40 ? "text-red-600" : "text-gray-400"}`}>{step}%</span>}
      </span>
    </div>
  );
}

export async function LoopsTab() {
  const now = Date.now();
  const d30 = new Date(now - 30 * MS_DAY).toISOString();

  const [
    completionsRes, leadsRes, shortlistRes, quotesRes, reviewsRes, agreementsRes,
    profilesRes, scoredRes, claimedRes, completeRes, leads30Res,
    pv30, srch30, self30, email30,
  ] = await Promise.all([
    supabase.from("sg_lead_completions").select("agent_id, instruction_signed_at, completion_date"),
    supabase.from("sg_leads").select("id", { count: "exact", head: true }),
    supabase.from("sg_lead_shortlist").select("lead_id, agent_id").limit(20000),
    supabase.from("sg_lead_quotes").select("lead_id, agent_id").limit(20000),
    supabase.from("sg_agent_reviews").select("verified_completion, status, created_at").limit(20000),
    supabase.from("sg_agent_agreements").select("agent_id").limit(20000),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).not("score", "is", null),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).eq("claimed", true),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).eq("claimed", true).not("whatsapp", "is", null).not("photo_url", "is", null),
    supabase.from("sg_leads").select("id", { count: "exact", head: true }).gte("created_at", d30),
    countEvent("profile_view", d30),
    countEvent("search_performed", d30),
    countEvent("suspected_self_view", d30),
    countEvent("email_capture", d30),
  ]);

  const leadsTotal = leadsRes.count ?? 0;
  const profilesTotal = profilesRes.count ?? 0;
  const scored = scoredRes.count ?? 0;
  const claimed = claimedRes.count ?? 0;
  const profileComplete = completeRes.count ?? 0;
  const leads30 = leads30Res.count ?? 0;
  const comps = completionsRes.data ?? [];
  const shortlist = shortlistRes.data ?? [];
  const quotes = quotesRes.data ?? [];
  const reviews = reviewsRes.data ?? [];

  // Seller demand funnel (state-derived)
  const shortlistedLeads = uniq(shortlist, "lead_id");
  const quotedLeads = uniq(quotes, "lead_id");
  const instructed = comps.filter((c) => c.instruction_signed_at).length;
  const completed = comps.filter((c) => c.completion_date).length;
  const emptyShortlist = Math.max(leadsTotal - shortlistedLeads, 0);

  // Agent supply loop
  const signedAgents = uniq(agreementsRes.data, "agent_id");
  const agentsWithLead = uniq(shortlist, "agent_id");
  const agentsResponded = uniq(quotes, "agent_id");
  const agentsClosed = uniq(comps.filter((c) => c.completion_date), "agent_id");

  // Reviews moat
  const reviewsTotal = reviews.length;
  const reviewsVerified = reviews.filter((r) => r.verified_completion).length;
  const reviews30 = reviews.filter((r) => r.created_at && new Date(r.created_at).getTime() > now - 30 * MS_DAY).length;

  // Newly instrumented first-class events (30d), proving the loop fires.
  const [evShortlistEmpty, evLeadReceived, evResponded, evReviewed] = await Promise.all([
    countLeadEvent("shortlist_empty", d30),
    countLeadEvent("lead_received", d30),
    countLeadEvent("agent_submit_quote", d30),
    countLeadEvent("submit_review", d30),
  ]);

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-500">
        The constellation: the seller demand funnel, the agent supply loop, and the reviews moat that compound into a
        defensible marketplace. Counts are all-time and state-derived, so they are reliable even when event volume is
        thin. Step % is conversion from the stage above; red flags a leak.
      </p>

      {/* Seller demand funnel */}
      <div>
        <SectionHeading title="Seller demand funnel" hint="Where sellers drop between landing and a completed sale." />
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
          <Stage label="Leads created" n={leadsTotal} top={leadsTotal || 1} />
          <Stage label="Shortlisted" n={shortlistedLeads} top={leadsTotal || 1} prev={leadsTotal} />
          <Stage label="Got a quote" n={quotedLeads} top={leadsTotal || 1} prev={shortlistedLeads} />
          <Stage label="Instructed an agent" n={instructed} top={leadsTotal || 1} prev={quotedLeads} />
          <Stage label="Completed sale" n={completed} top={leadsTotal || 1} prev={instructed} />
        </div>
        {emptyShortlist > 0 && (
          <p className="mt-2 text-xs text-red-600">
            ⚠ {emptyShortlist.toLocaleString()} lead{emptyShortlist === 1 ? "" : "s"} never got a shortlist (thin agent supply in that area). This is the top liquidity leak to watch.
          </p>
        )}
        <p className="mt-1 text-[11px] text-gray-400">New leads (30d): {leads30.toLocaleString()}. For the 30-day event view (form views, step beacons), see the Funnel tab.</p>
      </div>

      {/* Agent supply loop */}
      <div>
        <SectionHeading title="Agent supply loop" hint="Profiles becoming live, contracted, lead-receiving supply." />
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
          <Stage label="Scored profiles" n={scored} top={scored || 1} />
          <Stage label="Claimed" n={claimed} top={scored || 1} prev={scored} />
          <Stage label="Profile complete" n={profileComplete} top={scored || 1} prev={claimed} />
          <Stage label="Agreement signed" n={signedAgents} top={scored || 1} prev={claimed} />
          <Stage label="Received a lead" n={agentsWithLead} top={scored || 1} prev={claimed} />
          <Stage label="Responded (quoted)" n={agentsResponded} top={scored || 1} prev={agentsWithLead} />
          <Stage label="Closed a sale" n={agentsClosed} top={scored || 1} prev={agentsResponded} />
        </div>
        <p className="mt-1 text-[11px] text-gray-400">{profilesTotal.toLocaleString()} total profiles · {scored.toLocaleString()} scored. Claim → active supply is the leading indicator of marketplace health.</p>
      </div>

      {/* Reviews moat + growth loops */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeading title="Reviews moat" hint="Verified reviews are the defensible asset; track the growth rate." />
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <StatCard title="Reviews" value={reviewsTotal} sub="total on file" />
            <StatCard title="Verified" value={reviewsVerified} sub="tied to a sale" />
            <StatCard title="New (30d)" value={reviews30} sub="moat growth" />
          </div>
        </div>
        <div>
          <SectionHeading title="Growth loops (30d)" hint="Top-of-loop input metrics. Volume only matters if it converts." />
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <StatCard title="Profile views" value={pv30.toLocaleString()} sub="SEO + vanity loop" />
            <StatCard title="Searches" value={srch30.toLocaleString()} sub="seller intent" />
            <StatCard title="Self-views" value={self30.toLocaleString()} sub="agent discovers profile" />
            <StatCard title="Email captures" value={email30.toLocaleString()} sub="retention list" />
          </div>
        </div>
      </div>

      <div>
        <SectionHeading title="Instrumented events (30d)" hint="First-class funnel/loop events now firing at the source: time-series + attribution, not just state." />
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Shortlist empty" value={evShortlistEmpty} sub="demand, no supply" danger={evShortlistEmpty > 0} />
          <StatCard title="Lead received" value={evLeadReceived} sub="one per shortlisted agent" />
          <StatCard title="Agent responded" value={evResponded} sub="quote sent" />
          <StatCard title="Review submitted" value={evReviewed} sub="moat input" />
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          New events wired at the source: <code>shortlist_empty</code>, <code>lead_received</code>, plus
          <code> source</code>/<code>utm_campaign</code> on <code>submit_form</code>.
          <code> agent_submit_quote</code> and <code>submit_review</code> already existed. They flow into the Funnel tab too.
        </p>
      </div>
    </div>
  );
}
