import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { titleName, cleanAgency } from "../../../lib/names";
import { buildDraftPrompt, callClaude, type Comp } from "../../../lib/draft-reply";
import { isPaid } from "../../../lib/tiers";
import { FREE_DRAFTS_PER_MONTH, DRAFT_EVENT, countDraftsThisMonth } from "../../../lib/inbox-quota";

// AI-drafted reply for a seller lead. Session-gated; the shortlist row must
// belong to the signed-in agent. Grounded ONLY in DB facts (lead brief, the
// agent's own record, recent area comps via area_recent_sales). Drafting only:
// nothing is sent. Returns 503 until ANTHROPIC_API_KEY is configured.

export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  // An impersonating admin must not spend Anthropic budget or burn the agent's
  // free-draft quota; mirror labels/notes/reply-sent.
  if (session.impersonatedBy) {
    return NextResponse.json({ error: "Disabled during admin impersonation." }, { status: 403 });
  }

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
    .select("id, slug, name, agency_name, score, primary_area, subscription_tier")
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

  // Free/paid line: meter AI-draft VOLUME only. Free tier gets a small monthly
  // allowance (enough to hit the Aha more than once); paid tiers are unlimited.
  // Checked BEFORE the paid Claude call so a capped agent never triggers spend.
  // The base inbox, the money-at-risk sort and the seller's first reply stay free.
  if (!isPaid(agent.subscription_tier)) {
    const used = await countDraftsThisMonth(sb, Number(agent.id));
    if (used >= FREE_DRAFTS_PER_MONTH) {
      return NextResponse.json(
        {
          error: `You've used your ${FREE_DRAFTS_PER_MONTH} free AI drafts this month. Upgrade to Verified for unlimited drafts.`,
          upgrade: true,
        },
        { status: 403 },
      );
    }
  }

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
    // Meter the successful generation (only successes burn the free allowance).
    // Best-effort: a logging failure must never fail the draft.
    try {
      await sb.from("sg_funnel_events").insert({
        event: DRAFT_EVENT,
        agent_id: Number(agent.id),
        agent_slug: (agent.slug as string | null) ?? null,
        source: "dashboard",
        page_path: "/dashboard",
        metadata: { shortlist_id: shortlistId, lead_id: Number(row.lead_id) },
      });
    } catch (logErr) {
      console.error("[draft-reply] draft-event log failed", logErr);
    }
    return NextResponse.json({ draft });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "not_configured") {
      return NextResponse.json({ error: "AI drafting is not configured yet." }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not draft a reply. Please try again." }, { status: 502 });
  }
}
