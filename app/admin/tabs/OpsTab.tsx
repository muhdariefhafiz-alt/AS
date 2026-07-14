import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, Pill, EmptyState, MS_DAY } from "../shared";
import ExportCard from "./ExportCard";
import CronRunButton from "./CronRunButton";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Real cron schedule, sourced from vercel.json (single source of truth).
// Times are UTC (SGT = UTC+8). Kept in sync manually with vercel.json crons.
const CRONS: [string, string, string][] = [
  ["refresh-scores", "18:00 UTC daily", "AgentScore recalculation"],
  ["revalidate", "19:00 UTC daily", "ISR purge"],
  ["ping-google", "20:00 UTC daily", "IndexNow + Bing ping"],
  ["outreach", "02:00 UTC daily", "Agent outreach emails"],
  ["agent-activation", "01:30 UTC daily", "Activation drip"],
  ["weekly-digest", "01:00 UTC Mon", "Top agents email"],
  ["agent-notifications", "02:00 UTC Mon", "Profile view reports"],
  ["scrape-contacts", "03:00 UTC daily", "Agent contact scrape"],
  ["mop-alerts", "01:00 UTC daily", "Seller MOP alerts"],
  ["review-requests", "02:15 UTC daily", "Post-sale review asks"],
  ["verify-completions", "04:00 UTC daily", "Completion verification"],
  ["expire-leads", "05:00 UTC daily", "Lapse stale leads"],
  ["gsc-sync", "05:30 UTC daily", "Search Console pull"],
  ["ai-tracker-scan", "07:00-07:30 UTC Mon", "AI citation SOV (4 surfaces)"],
  ["hdb-sync", "06:00 UTC Mon", "HDB resale re-mirror"],
  ["standing-digest", "08:00 UTC monthly (2nd)", "Agent standing email"],
  ["ops-digest", "00:45 UTC Mon", "Operator health + regression digest"],
];

export async function OpsTab() {
  const cutoff7 = new Date(Date.now() - 7 * MS_DAY).toISOString();
  const cutoff30 = new Date(Date.now() - 30 * MS_DAY).toISOString();

  const [
    pendingClaims,
    rejectedClaims30,
    mxOk,
    noMx,
    emailBad,
    outreachSent7,
    outreachFailed,
    unsubSubs,
    unsubAgents,
    unsubLeads,
    auditLog,
    staleScrapes,
    modMessages,
    modPhotos,
    modBios,
  ] = await Promise.all([
    supabase.from("sg_claim_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("sg_claim_requests").select("id", { count: "exact", head: true }).eq("status", "rejected").gte("created_at", cutoff30),
    // SG email health: deliverability graded on sg_agents.email_status (bounce
    // webhook + MX sweep), not the Netherlands app's email_queue.
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).eq("email_status", "mx_ok"),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).eq("email_status", "no_mx"),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).in("email_status", ["bounced", "complained"]),
    // SG outreach send log (the real send pipeline).
    supabase.from("sg_outreach").select("id", { count: "exact", head: true }).eq("email_sent", true).gte("email_sent_at", cutoff7),
    supabase.from("sg_outreach").select("id", { count: "exact", head: true }).eq("status", "failed"),
    // SG opt-outs across all three suppression sources.
    supabase.from("sg_email_subscribers").select("id", { count: "exact", head: true }).eq("unsubscribed", true).gte("unsubscribed_at", cutoff30),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).gte("email_opt_out_at", cutoff30),
    supabase.from("sg_leads").select("id", { count: "exact", head: true }).gte("email_opt_out_at", cutoff30),
    supabase
      .from("admin_audit_log")
      .select("admin_identifier, action, target_type, target_id, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    // Actionable stale scrapes only: the scrape cron re-touches agents whose
    // contact is still unknown, so gate on missing email AND phone.
    supabase
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .lt("contact_scraped_at", cutoff30)
      .is("email", null)
      .is("phone", null),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).eq("message_status", "pending").not("message", "is", null),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).eq("photo_status", "pending").not("photo_url", "is", null),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).eq("bio_status", "pending").not("bio", "is", null),
  ]);

  const modTotal = (modMessages.count ?? 0) + (modPhotos.count ?? 0) + (modBios.count ?? 0);
  const unsubTotal = (unsubSubs.count ?? 0) + (unsubAgents.count ?? 0) + (unsubLeads.count ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading title="UGC moderation" hint="Agent-generated content awaiting review." />
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard title="UGC total pending" value={modTotal} sub="message + photo + bio" danger={modTotal > 10} href="/admin/moderation" />
          <StatCard title="Messages pending" value={modMessages.count ?? 0} />
          <StatCard title="Photos pending" value={modPhotos.count ?? 0} />
          <StatCard title="Bios pending" value={modBios.count ?? 0} />
        </div>
      </div>

      <div>
        <SectionHeading title="Moderation queues" hint="Items awaiting operator action." />
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard title="Pending claims" value={pendingClaims.count ?? 0} sub="awaiting email verify" danger={(pendingClaims.count ?? 0) > 10} href="/admin/claims" />
          <StatCard title="Rejected claims (30d)" value={rejectedClaims30.count ?? 0} sub="CEA mismatches = fraud?" danger={(rejectedClaims30.count ?? 0) > 5} />
          <StatCard title="Stale scrapes" value={staleScrapes.count ?? 0} sub=">30d old, still no email/phone" color="#d97706" />
        </div>
      </div>

      <div>
        <SectionHeading title="Email health (SG)" hint="Deliverability graded on sg_agents.email_status + the sg_outreach send log." />
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard title="Deliverable (MX ok)" value={mxOk.count ?? 0} color="#059669" />
          <StatCard title="No MX / undeliverable" value={noMx.count ?? 0} sub="dead mailbox domains" color="#d97706" />
          <StatCard title="Bounced / complained" value={emailBad.count ?? 0} danger={(emailBad.count ?? 0) > 0} color="#dc2626" />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <StatCard title="Outreach sent 7d" value={outreachSent7.count ?? 0} sub="sg_outreach" color="#059669" />
          <StatCard title="Outreach failed" value={outreachFailed.count ?? 0} danger={(outreachFailed.count ?? 0) > 0} color="#dc2626" />
          <StatCard title="Unsubscribes 30d" value={unsubTotal} sub="subscribers + agent + lead opt-outs" />
        </div>
      </div>

      <div>
        <SectionHeading title="Admin audit log (last 20)" hint="Every admin action is logged here." />
        {(auditLog.data ?? []).length === 0 ? (
          <EmptyState title="No audit entries" />
        ) : (
          <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Admin</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {(auditLog.data ?? []).map((a, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <Pill color={a.action === "impersonate_start" ? "amber" : "gray"}>{a.action}</Pill>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{a.admin_identifier}</td>
                    <td className="px-3 py-2 text-xs">{a.target_id}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{new Date(a.created_at).toLocaleString("en-SG")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <SectionHeading title="Cron schedule" hint="From vercel.json. Times are UTC (SGT = UTC+8)." />
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-3 py-2">Cron</th>
                <th className="px-3 py-2">Schedule</th>
                <th className="px-3 py-2">Purpose</th>
                <th className="px-3 py-2">Run</th>
              </tr>
            </thead>
            <tbody>
              {CRONS.map(([name, schedule, purpose]) => (
                <tr key={name} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono text-xs">{name}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{schedule}</td>
                  <td className="px-3 py-2 text-xs">{purpose}</td>
                  <td className="px-3 py-2"><CronRunButton path={`/api/cron/${name}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">Run now fires the job on demand with the cron secret. Long jobs (hdb-sync, scrape-contacts) may time out at the platform limit; the schedule still runs them fully.</p>
      </div>

      <div>
        <ExportCard />
      </div>
    </div>
  );
}
