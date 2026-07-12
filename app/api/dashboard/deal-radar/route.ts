import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";

// Deal Radar: an agent's saved farm areas + the prospecting feed built from
// deal_radar() (real transaction rows only). Session-gated; the agent is
// derived from the signed cookie, never the request body. All writes via
// supabaseAdmin (service role): sg_agent_farm_areas is RLS-locked from anon.

type Area = { area_type: "district" | "town"; area_key: string };
const AREA_TYPES = new Set(["district", "town"]);

async function loadAgent(agentId: number) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("sg_agents")
    .select("id, cea_registration")
    .eq("id", agentId)
    .single();
  return data;
}

async function feed(cea: string) {
  const sb = supabaseAdmin();
  const [{ data: areas }, { data: items }] = await Promise.all([
    sb
      .from("sg_agent_farm_areas")
      .select("area_type, area_key")
      .eq("agent_cea_no", cea)
      .order("created_at"),
    sb.rpc("deal_radar", { p_cea: cea, p_window_days: 180, p_limit: 60 }),
  ]);
  return { areas: areas ?? [], items: items ?? [] };
}

export async function GET() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const agent = await loadAgent(session.agentId);
  if (!agent?.cea_registration) {
    return NextResponse.json({ error: "No CEA registration on file" }, { status: 404 });
  }
  return NextResponse.json(await feed(agent.cea_registration));
}

export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.impersonatedBy) {
    return NextResponse.json({ error: "Disabled during admin impersonation." }, { status: 403 });
  }
  const agent = await loadAgent(session.agentId);
  if (!agent?.cea_registration) {
    return NextResponse.json({ error: "No CEA registration on file" }, { status: 404 });
  }
  const cea = agent.cea_registration;

  let body: { action?: string; area_type?: string; area_key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const action = body.action;
  const area_type = String(body.area_type ?? "").toLowerCase();
  const area_key = String(body.area_key ?? "").trim().toUpperCase().slice(0, 60);
  if (!AREA_TYPES.has(area_type) || !area_key) {
    return NextResponse.json({ error: "Invalid area." }, { status: 400 });
  }

  const sb = supabaseAdmin();
  if (action === "add") {
    // Cap farm areas (free tier). Keeps the feed focused and cheap.
    const { count } = await sb
      .from("sg_agent_farm_areas")
      .select("id", { count: "exact", head: true })
      .eq("agent_cea_no", cea);
    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: "You can track up to 5 areas." }, { status: 400 });
    }
    await sb
      .from("sg_agent_farm_areas")
      .upsert(
        { agent_cea_no: cea, area_type, area_key },
        { onConflict: "agent_cea_no,area_type,area_key", ignoreDuplicates: true }
      );
  } else if (action === "remove") {
    await sb
      .from("sg_agent_farm_areas")
      .delete()
      .eq("agent_cea_no", cea)
      .eq("area_type", area_type)
      .eq("area_key", area_key);
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  return NextResponse.json(await feed(cea));
}

export type { Area };
