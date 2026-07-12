import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { titleName, cleanAgency } from "../../../lib/names";
import { buildDraftPrompt, callClaude, type Comp } from "../../../lib/draft-reply";

// AI-drafted reply for a seller lead. Session-gated; the shortlist row must
// belong to the signed-in agent. Grounded ONLY in DB facts (lead brief, the
// agent's own record, recent area comps via area_recent_sales). Drafting only:
// nothing is sent. Returns 503 until ANTHROPIC_API_KEY is configured.

export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { shortlist_id?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const shortlistId = Number(body.shortlist_id);
  if (!Number.isFinite(shortlistId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: agent } = await sb
    .from("sg_agents")
    .select("id, name, agency_name, score, primary_area")
    .eq("id", session.agentId)
    .single();
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  // Ownership check: the shortlist row must be this agent's.
  const { data: row } = await sb
    .from("sg_lead_shortlist")
    .select("id, lead_id")
    .eq("id", shortlistId)
    .eq("agent_id", agent.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const { data: lead } = await sb
    .from("sg_leads")
    .select("property_type, town, district_code, bedrooms, est_value_low, est_value_high, timeline, reason, full_name")
    .eq("id", row.lead_id)
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Grounding comps from the same open records the area pages show.
  const isHdb = String(lead.property_type).toUpperCase() === "HDB";
  const areaType = isHdb ? "town" : "district";
  const areaKey = isHdb ? lead.town : lead.district_code;
  let comps: Comp[] = [];
  if (areaKey) {
    const { data } = await sb.rpc("area_recent_sales", { p_type: areaType, p_key: String(areaKey), p_limit: 5 });
    comps = (data as Comp[] | null) ?? [];
  }

  const area = lead.town
    ? titleName(String(lead.town))
    : lead.district_code
      ? `District ${lead.district_code}`
      : null;
  const prompt = buildDraftPrompt(
    {
      propertyType: String(lead.property_type ?? "property"),
      area,
      bedrooms: lead.bedrooms != null ? Number(lead.bedrooms) : null,
      estValueLow: lead.est_value_low != null ? Number(lead.est_value_low) : null,
      estValueHigh: lead.est_value_high != null ? Number(lead.est_value_high) : null,
      timeline: (lead.timeline as string | null) ?? null,
      reason: (lead.reason as string | null) ?? null,
      sellerFirstName: lead.full_name ? titleName(String(lead.full_name)).split(" ")[0] : null,
    },
    {
      name: titleName(String(agent.name)),
      agency: cleanAgency(String(agent.agency_name ?? "")),
      score: agent.score != null ? Math.round(Number(agent.score)) : null,
      primaryArea: (agent.primary_area as string | null) ?? null,
    },
    comps
  );

  try {
    const draft = await callClaude(prompt);
    return NextResponse.json({ draft });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "not_configured") {
      return NextResponse.json({ error: "AI drafting is not configured yet." }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not draft a reply. Please try again." }, { status: 502 });
  }
}
