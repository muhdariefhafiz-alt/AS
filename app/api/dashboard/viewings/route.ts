import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { syncViewingToCalendar } from "../../../lib/calendar-sync";

// Planner: an agent's viewing appointments. Session-gated; the agent is derived
// from the signed cookie, never request input. All access via supabaseAdmin
// (sg_viewings is RLS-locked from anon).

const STATUSES = new Set(["requested", "confirmed", "completed", "cancelled"]);

async function loadAgent(agentId: number) {
  const { data } = await supabaseAdmin()
    .from("sg_agents")
    .select("id, cea_registration, slug")
    .eq("id", agentId)
    .single();
  return data;
}

async function feed(cea: string, slug: string | null, agentId?: number) {
  const { data } = await supabaseAdmin()
    .from("sg_viewings")
    .select("id, property_label, viewing_at, attendee_name, attendee_contact, message, status, created_at")
    .eq("agent_cea_no", cea)
    .order("viewing_at", { ascending: true });
  return {
    viewings: data ?? [],
    bookUrl: slug ? `https://fair-comparisons.com/book/${slug}` : null,
    // For client-side tracker events (planner_link_copied); not sensitive.
    agentId: agentId ?? null,
  };
}

export async function GET() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const agent = await loadAgent(session.agentId);
  if (!agent?.cea_registration) return NextResponse.json({ error: "No CEA registration on file" }, { status: 404 });
  return NextResponse.json(await feed(agent.cea_registration, agent.slug ?? null, session.agentId));
}

export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.impersonatedBy) {
    return NextResponse.json({ error: "Disabled during admin impersonation." }, { status: 403 });
  }
  const agent = await loadAgent(session.agentId);
  if (!agent?.cea_registration) return NextResponse.json({ error: "No CEA registration on file" }, { status: 404 });

  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const id = String(body.id ?? "");
  const status = String(body.status ?? "");
  if (!id || !STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  // Scope the update to this agent's own viewing (defence in depth alongside RLS).
  const { error } = await supabaseAdmin()
    .from("sg_viewings")
    .update({ status })
    .eq("id", id)
    .eq("agent_cea_no", agent.cea_registration);
  if (error) return NextResponse.json({ error: "Could not update." }, { status: 500 });

  // Planner tracker: record the agent's response as a funnel event. The
  // event timestamp minus the viewing's created_at is the time-to-respond
  // satisfaction proxy in sg_planner_tracker(). Best-effort, never blocks.
  if (status === "confirmed" || status === "cancelled" || status === "completed") {
    await supabaseAdmin().from("sg_funnel_events").insert({
      event: `viewing_${status}`,
      agent_id: session.agentId,
      agent_slug: agent.slug ?? null,
      source: "planner",
      metadata: { viewing_id: id },
    }).then(
      () => undefined,
      (e: unknown) => console.error("[dashboard/viewings] funnel event failed", e)
    );
  }

  // On confirm, best-effort drop the viewing into the agent's connected
  // calendar (Google or Outlook; no-op unless connected). Never blocks the confirm.
  if (status === "confirmed") {
    try {
      const { data: v } = await supabaseAdmin()
        .from("sg_viewings")
        .select("property_label, viewing_at, attendee_name, attendee_contact, message")
        .eq("id", id)
        .eq("agent_cea_no", agent.cea_registration)
        .maybeSingle();
      if (v?.viewing_at) {
        const start = new Date(String(v.viewing_at));
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        await syncViewingToCalendar(session.agentId, {
          title: `Viewing: ${v.property_label ?? "property"}`,
          location: v.property_label ?? undefined,
          description: [
            "Booked through FairComparisons.",
            v.attendee_name ? `Attendee: ${v.attendee_name}` : null,
            v.attendee_contact ? `Contact: ${v.attendee_contact}` : null,
            v.message ? `Note: ${v.message}` : null,
          ].filter(Boolean).join("\n"),
          startIso: start.toISOString(),
          endIso: end.toISOString(),
        });
      }
    } catch { /* calendar is best-effort */ }
  }

  return NextResponse.json(await feed(agent.cea_registration, agent.slug ?? null));
}
