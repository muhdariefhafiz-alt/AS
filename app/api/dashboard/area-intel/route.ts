import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { hdbValuation, isValidHdbFlatType } from "../../../lib/avm";

// Area Intelligence: instant CMA + farm intelligence for one area.
// Competition + district pricing come from sg_area_intel (SQL-side windows);
// HDB pricing comes from the same AVM engine that powers My Home, so the
// agent quotes the exact numbers a seller can verify on our public tools.
// Session-gated; the agent's own position is keyed to their CEA reg.
const AREA_RE = /^[A-Za-z0-9 /().'-]{1,60}$/;

export async function GET(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const url = new URL(req.url);
  const areaType = url.searchParams.get("area_type");
  const area = url.searchParams.get("area") ?? "";
  const flatType = url.searchParams.get("flat_type") ?? "";
  if ((areaType !== "town" && areaType !== "district") || !AREA_RE.test(area)) {
    return NextResponse.json({ error: "Invalid area" }, { status: 400 });
  }
  // Districts must be a 1-2 digit code: the RPC lpads digits, and a value
  // like "109" would silently truncate to a DIFFERENT district's data.
  if (areaType === "district" && !/^[0-9]{1,2}$/.test(area)) {
    return NextResponse.json({ error: "Invalid district" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: agent } = await sb
    .from("sg_agents")
    .select("slug, cea_registration")
    .eq("id", session.agentId)
    .single();
  if (!agent?.cea_registration) {
    return NextResponse.json({ error: "No CEA registration on file" }, { status: 404 });
  }

  const [{ data: intel, error }, hdb] = await Promise.all([
    sb.rpc("sg_area_intel", {
      p_area_type: areaType,
      p_area: area.toUpperCase(),
      p_reg: agent.cea_registration,
    }),
    areaType === "town" && isValidHdbFlatType(flatType)
      ? hdbValuation(area.toUpperCase(), flatType as Parameters<typeof hdbValuation>[1])
      : Promise.resolve(null),
  ]);
  if (error) return NextResponse.json({ error: "Could not load area intelligence." }, { status: 500 });

  // Server-written adoption event: reliable, not spoofable via the open
  // funnel endpoint. Best-effort, never blocks the response. supabase-js
  // resolves errors rather than rejecting, so inspect the result directly.
  const { error: evErr } = await sb.from("sg_funnel_events").insert({
    event: "area_intel_viewed",
    agent_id: session.agentId,
    source: "dashboard",
    metadata: {
      area_type: areaType,
      area: area.toUpperCase(),
      flat_type: isValidHdbFlatType(flatType) ? flatType : null,
    },
  });
  if (evErr) console.error("[area-intel] funnel event failed", evErr);

  return NextResponse.json({ slug: agent.slug, intel, hdb });
}
