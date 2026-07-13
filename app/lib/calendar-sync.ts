import { supabaseAdmin } from "./supabase";
import { insertViewingEvent } from "./google-calendar";
import { msInsertViewingEvent } from "./microsoft-calendar";

// Provider dispatcher for the Planner's calendar sync. One connection per
// agent (sg_agent_calendar, PK agent_id); the provider column decides where a
// confirmed viewing lands. Best-effort like the per-provider inserts: false,
// never throws.

export type ViewingEvent = { title: string; description: string; startIso: string; endIso: string; location?: string };

export async function syncViewingToCalendar(agentId: number, ev: ViewingEvent): Promise<boolean> {
  try {
    const { data: conn } = await supabaseAdmin()
      .from("sg_agent_calendar")
      .select("provider")
      .eq("agent_id", agentId)
      .maybeSingle();
    if (!conn) return false;
    if (conn.provider === "microsoft") return msInsertViewingEvent(agentId, ev);
    return insertViewingEvent(agentId, ev);
  } catch {
    return false;
  }
}
