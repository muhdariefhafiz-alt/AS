import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, Pill, EmptyState, MS_DAY } from "../shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function OpsTab() {
  const cutoff7 = new Date(Date.now() - 7 * MS_DAY).toISOString();
  const cutoff30 = new Date(Date.now() - 30 * MS_DAY).toISOString();

  const [
    pendingClaims,
    feedbackPending,
    emailPending,
    emailFailed,
    emailSent7,
    unsubs30,
    auditLog,
    recentErrors,
    staleScrapes,
    rejectedClaims30,
    modMessages,
    modPhotos,
    modBios,
  ] = await Promise.all([
    supabase.from("sg_claim_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("dashboard_feedback").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", cutoff7),
    supabase.from("email_unsubscribes").select("id", { count: "exact", head: true }).gte("created_at", cutoff30),
    supabase
      .from("admin_audit_log")
      .select("admin_identifier, action, target_type, target_id, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("email_queue")
      .select("id, to_email, subject, template, created_at")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .not("contact_scraped_at", "is", null)
      .lt("contact_scraped_at", new Date(Date.now() - 30 * MS_DAY).toISOString()),
    supabase
      .from("sg_claim_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected")
      .gte("created_at", cutoff30),
    supabase
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("message_status", "pending")
      .not("message", "is", null),
    supabase
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("photo_status", "pending")
      .not("photo_url", "is", null),
    supabase
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("bio_status", "pending")
      .not("bio", "is", null),
  ]);

  const modTotal = (modMessages.count ?? 0) + (modPhotos.count ?? 0) + (modBios.count ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading title="UGC moderation" hint="Agent-gegenereerde content awaiting review." />
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard
            title="UGC total pending"
            value={modTotal}
            sub="message + photo + bio"
            danger={modTotal > 10}
            href="/admin/moderation"
          />
          <StatCard title="Messages pending" value={modMessages.count ?? 0} />
          <StatCard title="Photos pending" value={modPhotos.count ?? 0} />
          <StatCard title="Bios pending" value={modBios.count ?? 0} />
        </div>
      </div>

      <div>
        <SectionHeading title="Moderation queues" hint="Zaken die op actie wachten." />
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard
            title="Pending claims"
            value={pendingClaims.count ?? 0}
            sub="awaiting email verify"
            danger={(pendingClaims.count ?? 0) > 10}
          />
          <StatCard
            title="Rejected (30d)"
            value={rejectedClaims30.count ?? 0}
            sub="CEA mismatches = fraud?"
            danger={(rejectedClaims30.count ?? 0) > 5}
          />
          <StatCard
            title="Feedback pending"
            value={feedbackPending.count ?? 0}
            danger={(feedbackPending.count ?? 0) > 5}
          />
          <StatCard
            title="Stale scrapes"
            value={staleScrapes.count ?? 0}
            sub=">30 days old"
            color="#d97706"
          />
        </div>
      </div>

      <div>
        <SectionHeading title="Email queue" hint="Send-cron draait dagelijks 08:00 UTC." />
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard title="Pending" value={emailPending.count ?? 0} danger={(emailPending.count ?? 0) > 50} />
          <StatCard
            title="Failed"
            value={emailFailed.count ?? 0}
            danger={(emailFailed.count ?? 0) > 0}
            color="#dc2626"
          />
          <StatCard title="Sent 7d" value={emailSent7.count ?? 0} color="#059669" />
          <StatCard title="Unsubscribes 30d" value={unsubs30.count ?? 0} />
        </div>

        {(recentErrors.data ?? []).length > 0 && (
          <div className="mt-4">
            <SectionHeading title="Last 10 failed emails" />
            <div className="overflow-hidden rounded-md border border-red-200 bg-red-50/30">
              <table className="w-full text-sm">
                <thead className="bg-red-100 text-left text-[10px] font-bold uppercase tracking-widest text-red-800">
                  <tr>
                    <th className="px-3 py-2">To</th>
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2">Template</th>
                    <th className="px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentErrors.data ?? []).map((e) => (
                    <tr key={e.id} className="border-t border-red-200">
                      <td className="px-3 py-2 font-mono text-xs">{e.to_email}</td>
                      <td className="px-3 py-2 text-xs">{e.subject}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{e.template}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {new Date(e.created_at).toLocaleString("en-SG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div>
        <SectionHeading title="Admin audit log (last 20)" hint="Elke admin actie wordt hier gelogd." />
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
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {new Date(a.created_at).toLocaleString("en-SG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <SectionHeading title="Cron schedule" hint="Uit vercel.json. Status wordt zichtbaar als cron fouten loggen." />
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-3 py-2">Cron</th>
                <th className="px-3 py-2">Schedule</th>
                <th className="px-3 py-2">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["refresh-scores", "04:00 daily", "AgentScore recalculation"],
                ["scrape-contacts", "03:00 daily", "Agent contact scrape"],
                ["ping-google", "11:00 daily", "IndexNow + Bing ping"],
                ["revalidate", "00:00 daily", "ISR purge"],
                ["weekly-digest", "10:00 Monday SGT", "Top agents email"],
                ["agent-notifications", "10:00 Monday SGT", "Profile view reports"],
                ["outreach", "09:00 daily", "Agent outreach emails"],
              ].map(([name, schedule, purpose]) => (
                <tr key={name} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono text-xs">{name}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{schedule}</td>
                  <td className="px-3 py-2 text-xs">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
