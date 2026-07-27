import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";

// Pitch Kit picker data: the agent's active areas (from their OWN transaction
// history via sg_pitch_kit picker mode, so it works for every claimed agent,
// not just those in area top lists) plus the slug to build the kit URL.
// Session-gated; agent derived from the signed cookie, never request input.
export async function GET() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const sb = supabaseAdmin();
  const { data: agent } = await sb
    .from("sg_agents")
    .select("slug, cea_registration")
    .eq("id", session.agentId)
    .single();
  if (!agent?.cea_registration) {
    return NextResponse.json({ error: "No CEA registration on file" }, { status: 404 });
  }

  const { data: kit, error } = await sb.rpc("sg_pitch_kit", { p_reg: agent.cea_registration });
  if (error) return NextResponse.json({ error: "Could not load your record." }, { status: 500 });

  return NextResponse.json({
    slug: agent.slug,
    areas: (kit as { areas?: unknown })?.areas ?? [],
    record: (kit as { record?: unknown })?.record ?? null,
  });
}
