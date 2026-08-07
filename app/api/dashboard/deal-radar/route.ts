import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";

// Deal Radar: an agent's saved farm areas + the prospecting feed built from
// deal_radar() (real transaction rows only). Session-gated; the agent is
// derived from the signed cookie, never the request body. All writes via
// supabaseAdmin (service role): sg_agent_farm_areas is RLS-locked from anon.
//
// Setup is CONFIRMATION, not composition. sg_agent_farm_areas held zero rows
// platform-wide while the picker asked agents to type in areas their own CEA
// record already names, so the only daily-shaped feed in the product returned
// nothing for everyone. GET now ships suggestions computed from the agent's own
// transactions (sg_farm_area_suggestions), and POST accepts a one-tap "confirm"
// of several suggested areas at once. farm_area_confirmed is the redesign's
// SETUP event; it fires here server-side, on the real write, never on render.

type Area = { area_type: "district" | "town"; area_key: string };
const AREA_TYPES = new Set(["district", "town"]);
const MAX_AREAS = 5;

// Districts live zero-padded ('06') in every transaction table, but the picker
// historically sent '6' (and people type 'D15'). Normalising here means a
// picked district actually matches the feed instead of silently never joining.
function normaliseKey(area_type: string, raw: string): string {
  let key = String(raw ?? "").trim().toUpperCase().slice(0, 60);
  if (area_type === "district") {
    key = key.replace(/^D/, "").replace(/^0+(?=\d\d)/, "");
    if (/^\d{1,2}$/.test(key)) key = key.padStart(2, "0");
  }
  return key;
}

async function loadAgent(agentId: number) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("sg_agents")
    .select("id, cea_registration, slug, is_sandbox")
    .eq("id", agentId)
    .single();
  return data;
}

async function feed(cea: string) {
  const sb = supabaseAdmin();
  const [{ data: areas }, { data: items }, { data: suggestions }] = await Promise.all([
    sb
      .from("sg_agent_farm_areas")
      .select("area_type, area_key")
      .eq("agent_cea_no", cea)
      .order("created_at"),
    sb.rpc("deal_radar", { p_cea: cea, p_window_days: 180, p_limit: 60 }),
    sb.rpc("sg_farm_area_suggestions", { p_reg: cea }),
  ]);
  const saved = new Set((areas ?? []).map((a) => `${a.area_type}:${a.area_key}`));
  // Suggested = the agent's real areas they have not saved yet. deals/last_deal
  // ride along so the chip can say "23 deals · last Mar 2026" — their own
  // record, not an invented number.
  const suggested = ((suggestions ?? []) as { area_type: string; area_key: string; deals: number; last_deal: string }[])
    .filter((s) => !saved.has(`${s.area_type}:${s.area_key}`));
  return { areas: areas ?? [], items: items ?? [], suggested };
}

// The setup event. Fired on the real write only, and never for the sandbox
// account, which already accounts for 81% of all recorded dashboard opens.
async function logConfirmed(
  agent: { id: number; slug: string | null; is_sandbox: boolean | null },
  entries: { area_type: string; area_key: string; source: "prefill" | "manual" }[]
) {
  if (agent.is_sandbox || !entries.length) return;
  const sb = supabaseAdmin();
  await sb.from("sg_funnel_events").insert(
    entries.map((e) => ({
      event: "farm_area_confirmed",
      agent_id: agent.id,
      agent_slug: agent.slug,
      metadata: { source: e.source, area_type: e.area_type, area_key: e.area_key },
    }))
  );
}

export async function GET() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const agent = await loadAgent(session.agentId);
  if (!agent?.cea_registration) {
    return NextResponse.json({ error: "No CEA registration on file" }, { status: 404 });
  }
  return NextResponse.json({ ...(await feed(agent.cea_registration)), agentSlug: agent.slug ?? null });
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { action } = body as { action?: string };
  const sb = supabaseAdmin();

  const currentCount = async () => {
    const { count } = await sb
      .from("sg_agent_farm_areas")
      .select("id", { count: "exact", head: true })
      .eq("agent_cea_no", cea);
    return count ?? 0;
  };

  if (action === "confirm") {
    // One tap accepts several suggested areas. Validated server-side against
    // the agent's OWN suggestions, so the client cannot smuggle in arbitrary
    // keys under a "prefill" label and the event stays trustworthy.
    const raw = (body as { areas?: unknown }).areas;
    if (!Array.isArray(raw) || !raw.length) {
      return NextResponse.json({ error: "Nothing to confirm." }, { status: 400 });
    }
    const { data: sugg } = await sb.rpc("sg_farm_area_suggestions", { p_reg: cea });
    const allowed = new Map(
      ((sugg ?? []) as { area_type: string; area_key: string }[]).map((s) => [`${s.area_type}:${s.area_key}`, s])
    );
    const picks: Area[] = [];
    for (const r of raw.slice(0, MAX_AREAS)) {
      if (!r || typeof r !== "object") continue;
      const at = String((r as Area).area_type ?? "").toLowerCase();
      const key = normaliseKey(at, String((r as Area).area_key ?? ""));
      if (AREA_TYPES.has(at) && allowed.has(`${at}:${key}`)) {
        picks.push({ area_type: at as Area["area_type"], area_key: key });
      }
    }
    if (!picks.length) return NextResponse.json({ error: "Nothing to confirm." }, { status: 400 });
    const room = MAX_AREAS - (await currentCount());
    if (room <= 0) {
      return NextResponse.json({ error: `You can track up to ${MAX_AREAS} areas.` }, { status: 400 });
    }
    const toAdd = picks.slice(0, room);
    // .select() so we log only what was actually INSERTED. With
    // ignoreDuplicates a repeat confirm writes no row, and firing the setup
    // event anyway would let the same area inflate activation on every tap.
    const { data: inserted, error } = await sb
      .from("sg_agent_farm_areas")
      .upsert(
        toAdd.map((p) => ({ agent_cea_no: cea, area_type: p.area_type, area_key: p.area_key })),
        { onConflict: "agent_cea_no,area_type,area_key", ignoreDuplicates: true }
      )
      .select("area_type, area_key");
    if (error) {
      console.error("[deal-radar] confirm failed", error);
      return NextResponse.json({ error: "Could not save your areas." }, { status: 500 });
    }
    await logConfirmed(
      agent,
      (inserted ?? []).map((r) => ({ area_type: String(r.area_type), area_key: String(r.area_key), source: "prefill" as const }))
    );
    return NextResponse.json(await feed(cea));
  }

  const area_type = String((body as { area_type?: string }).area_type ?? "").toLowerCase();
  const area_key = normaliseKey(area_type, String((body as { area_key?: string }).area_key ?? ""));
  if (!AREA_TYPES.has(area_type) || !area_key) {
    return NextResponse.json({ error: "Invalid area." }, { status: 400 });
  }

  if (action === "add") {
    // Cap farm areas at 5 for EVERY tier. Keeps the feed focused and cheap.
    if ((await currentCount()) >= MAX_AREAS) {
      return NextResponse.json({ error: `You can track up to ${MAX_AREAS} areas.` }, { status: 400 });
    }
    const { data: inserted, error } = await sb
      .from("sg_agent_farm_areas")
      .upsert(
        { agent_cea_no: cea, area_type, area_key },
        { onConflict: "agent_cea_no,area_type,area_key", ignoreDuplicates: true }
      )
      .select("area_type, area_key");
    if (error) {
      console.error("[deal-radar] add failed", error);
      return NextResponse.json({ error: "Could not save the area." }, { status: 500 });
    }
    // Re-adding an area the agent already tracks is a no-op, not a setup event.
    if ((inserted ?? []).length) {
      await logConfirmed(agent, [{ area_type, area_key, source: "manual" }]);
    }
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
