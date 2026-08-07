import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";

// Dashboard telemetry, attributed to the SIGNED-IN agent.
//
// The existing /api/funnel is an open endpoint that takes agentId from the
// request body, so dashboard panels calling it wrote rows with agent_id NULL
// (nobody passes it) and any caller could attribute an event to any agent. The
// result is a table where 31 of 59 event names have never fired, three major
// features emit nothing at all, and the two events with volume both fire on
// render rather than on an action. "Which tab do agents use" is unanswerable.
//
// This route fixes attribution and honesty at once:
//   - the agent comes from the signed cookie, never the body
//   - only names in the taxonomy below are accepted, so it cannot silently
//     become a dumping ground that nobody can interpret later
//   - sandbox and impersonation are dropped, because the sandbox account
//     produced 81% of all recorded dashboard activity and would swamp any real
//     signal the redesign is meant to produce
//
// Keep this list small. An event that nobody will read is a row nobody trusts.
const TAXONOMY = new Set([
  // Where agents actually go. Zero tab instrumentation existed before this.
  "dashboard_tab_viewed",
  // AHA: the agent looked at the record we publish about them.
  "record_reviewed",
  // Feature discovery (brief section 07): first contact with a tool, carrying
  // how they arrived, so "stage_surfaced" can be told apart from "nav".
  "tool_first_used",
  // Real work on the deal spine.
  "deal_created",
  "document_started",
  // HABIT: they came back because we gave them a reason to.
  "weekly_touch_opened",
]);

export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  // An admin looking at an agent's dashboard is not that agent using it.
  if (session.impersonatedBy) return NextResponse.json({ ok: true, skipped: "impersonation" });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { event, metadata } = body as { event?: string; metadata?: unknown };
  const name = String(event ?? "");
  if (!TAXONOMY.has(name)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  let meta: Record<string, unknown> = {};
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    if (JSON.stringify(metadata).length <= 1000) meta = metadata as Record<string, unknown>;
  }

  const sb = supabaseAdmin();
  const { data: agent } = await sb
    .from("sg_agents")
    .select("id, slug, is_sandbox")
    .eq("id", session.agentId)
    .maybeSingle();
  if (!agent) return NextResponse.json({ ok: true, skipped: "no agent" });
  if (agent.is_sandbox) return NextResponse.json({ ok: true, skipped: "sandbox" });

  const { error } = await sb.from("sg_funnel_events").insert({
    event: name,
    agent_id: agent.id,
    agent_slug: agent.slug,
    source: "dashboard",
    metadata: meta,
  });
  if (error) {
    // Never break the surface for a telemetry write, but do not fail silently
    // either: a metric that quietly stops recording is worse than one missing.
    console.error("[dashboard/track] write failed", name, error);
  }
  return NextResponse.json({ ok: true });
}
