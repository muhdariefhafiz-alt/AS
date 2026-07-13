import type { SupabaseClient } from "@supabase/supabase-js";

// Phase-0 activation instrumentation for the reply wedge. Events land in
// sg_funnel_events (agent-level funnel) and sg_lead_events (per-lead timeline).
// Setup / Aha / Habit are each logged at most once per agent (idempotent), so
// funnel rates can be measured against the claimed / lead-receiving denominator,
// never against all CEA agents.

async function hasFunnelEvent(sb: SupabaseClient, agentId: number, event: string): Promise<boolean> {
  const { count } = await sb
    .from("sg_funnel_events")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .eq("event", event);
  return (count ?? 0) > 0;
}

async function logFunnel(
  sb: SupabaseClient,
  agentId: number,
  agentSlug: string | null,
  event: string,
  metadata: Record<string, unknown>,
) {
  await sb.from("sg_funnel_events").insert({
    event,
    agent_id: agentId,
    agent_slug: agentSlug,
    source: "dashboard",
    page_path: "/dashboard",
    metadata,
  });
}

// SETUP: the agent has the inbox usable (claimed + a reply channel). Logged
// once, the first time they load the inbox. Best-effort, fire-and-forget.
export async function logInboxSetup(sb: SupabaseClient, agentId: number, agentSlug: string | null): Promise<void> {
  try {
    if (await hasFunnelEvent(sb, agentId, "inbox_setup")) return;
    await logFunnel(sb, agentId, agentSlug, "inbox_setup", {});
  } catch (e) {
    console.error("[inbox-activation] setup failed", e);
  }
}

// REPLY SENT: the instrumentable North-Star + Aha/Habit signal. Logs the
// per-lead timeline event and the agent funnel event on every send, then
// evaluates Aha (first ever reply) and Habit (>=3 replies across >=2 distinct
// leads within 14 days), each logged at most once.
export async function logReplySent(
  sb: SupabaseClient,
  opts: { agentId: number; agentSlug: string | null; shortlistId: number; leadId: number },
): Promise<void> {
  const { agentId, agentSlug, shortlistId, leadId } = opts;
  try {
    // Per-lead timeline event (a reply can legitimately be re-sent).
    await sb.from("sg_lead_events").insert({
      lead_id: leadId,
      agent_id: agentId,
      event_type: "reply_sent",
      meta: { shortlist_id: shortlistId },
    });
    // Agent funnel event, every send.
    await logFunnel(sb, agentId, agentSlug, "inbox_reply_sent", { shortlist_id: shortlistId, lead_id: leadId });

    // Aha: first ever reply.
    if (!(await hasFunnelEvent(sb, agentId, "inbox_aha"))) {
      await logFunnel(sb, agentId, agentSlug, "inbox_aha", { shortlist_id: shortlistId, lead_id: leadId });
    }

    // Habit: >=3 replies across >=2 distinct leads within 14 days.
    if (!(await hasFunnelEvent(sb, agentId, "inbox_habit"))) {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await sb
        .from("sg_lead_events")
        .select("lead_id")
        .eq("agent_id", agentId)
        .eq("event_type", "reply_sent")
        .gte("created_at", since);
      const rows = data ?? [];
      const distinctLeads = new Set(rows.map((r) => Number(r.lead_id)));
      if (rows.length >= 3 && distinctLeads.size >= 2) {
        await logFunnel(sb, agentId, agentSlug, "inbox_habit", {
          replies_14d: rows.length,
          distinct_leads: distinctLeads.size,
        });
      }
    }
  } catch (e) {
    console.error("[inbox-activation] reply-sent failed", e);
  }
}
