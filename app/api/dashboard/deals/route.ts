import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { attachOrCreateDeal, nextAction, propertyKey, DEAL_STAGES, type DealStage } from "../../../lib/deals";

// The agent's pipeline: every live deal with the artefacts hanging off it.
//
// One query per artefact table rather than a join, because the counts are
// small (an agent runs a handful of deals) and the shapes are different enough
// that a join would need unpicking on the client anyway.

type ViewingRow = { id: string; deal_id: string | null; property_label: string; viewing_at: string; attendee_name: string; status: string };
type DocRow = { id: string; deal_id: string | null; doc_type: string; title: string; status: string; updated_at: string };

export async function GET() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const sb = supabaseAdmin();

  const { data: dealRows } = await sb
    .from("sg_deals")
    .select("id, stage, property_label, postal_code, counterparty_name, counterparty_contact, side, rent_or_price, source, lost_reason, created_at, updated_at, closed_at")
    .eq("agent_id", session.agentId)
    .order("updated_at", { ascending: false })
    .limit(200);
  const deals = dealRows ?? [];
  if (!deals.length) return NextResponse.json({ deals: [] });

  const ids = deals.map((d) => d.id);
  const [{ data: viewings }, { data: docs }] = await Promise.all([
    sb
      .from("sg_viewings")
      .select("id, deal_id, property_label, viewing_at, attendee_name, status")
      .in("deal_id", ids)
      .order("viewing_at", { ascending: true }),
    sb
      .from("sg_documents")
      .select("id, deal_id, doc_type, title, status, updated_at")
      .in("deal_id", ids)
      .neq("status", "void")
      .order("updated_at", { ascending: false }),
  ]);

  const byDeal = new Map<string, { viewings: ViewingRow[]; documents: DocRow[] }>();
  for (const id of ids) byDeal.set(id, { viewings: [], documents: [] });
  for (const v of (viewings ?? []) as ViewingRow[]) if (v.deal_id) byDeal.get(v.deal_id)?.viewings.push(v);
  for (const d of (docs ?? []) as DocRow[]) if (d.deal_id) byDeal.get(d.deal_id)?.documents.push(d);

  return NextResponse.json({
    deals: deals.map((d) => {
      const bits = byDeal.get(d.id) ?? { viewings: [], documents: [] };
      const has = {
        viewing: bits.viewings.length > 0,
        loi: bits.documents.some((x) => x.doc_type === "loi"),
        ta: bits.documents.some((x) => x.doc_type === "tenancy_agreement"),
      };
      return {
        ...d,
        viewings: bits.viewings,
        documents: bits.documents,
        next_action: nextAction(d.stage as DealStage, has),
      };
    }),
  });
}

// Start a deal by hand. The only place an agent ever names one, and it exists
// for the case the automatic paths cannot cover: a deal that began on WhatsApp
// or at a coffee shop, before any artefact exists.
export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.impersonatedBy) {
    return NextResponse.json({ error: "Disabled during admin impersonation." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    property_label?: string;
    counterparty_name?: string;
    side?: string;
  };
  const label = String(body.property_label ?? "").trim().slice(0, 200);
  if (!label) return NextResponse.json({ error: "Which property is this?" }, { status: 400 });

  const sb = supabaseAdmin();
  const id = await attachOrCreateDeal(sb, {
    agentId: session.agentId,
    propertyLabel: label,
    createStage: "enquiry",
    source: "manual",
    trigger: "manual",
    counterpartyName: String(body.counterparty_name ?? "").trim().slice(0, 160) || null,
    side: ["landlord", "tenant", "seller", "buyer"].includes(String(body.side)) ? String(body.side) : null,
  });
  if (!id) return NextResponse.json({ error: "Could not start that deal." }, { status: 500 });
  return NextResponse.json({ ok: true, id });
}

// Stage override and close. A stage the agent sets by hand is never overwritten
// by a later automatic move: the agent knows things about their own deal that
// no document can prove.
export async function PATCH(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.impersonatedBy) {
    return NextResponse.json({ error: "Disabled during admin impersonation." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    stage?: string;
    lost_reason?: string;
    property_label?: string;
    counterparty_name?: string;
    counterparty_contact?: string;
    rent_or_price?: string;
  };
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: deal } = await sb
    .from("sg_deals")
    .select("id, stage")
    .eq("id", id)
    .eq("agent_id", session.agentId)
    .maybeSingle();
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.stage) {
    if (!(DEAL_STAGES as readonly string[]).includes(body.stage)) {
      return NextResponse.json({ error: "Unknown stage." }, { status: 400 });
    }
    patch.stage = body.stage;
    patch.stage_set_manually_at = new Date().toISOString();
    if (body.stage === "completed" || body.stage === "lost") patch.closed_at = new Date().toISOString();
    else patch.closed_at = null;
    if (body.stage === "lost") patch.lost_reason = String(body.lost_reason ?? "").trim().slice(0, 120) || null;
  }
  if (typeof body.property_label === "string" && body.property_label.trim()) {
    const label = body.property_label.trim().slice(0, 200);
    patch.property_label = label;
    patch.property_key = propertyKey(label);
  }
  for (const k of ["counterparty_name", "counterparty_contact", "rent_or_price"] as const) {
    if (typeof body[k] === "string") patch[k] = body[k]!.trim().slice(0, 200) || null;
  }

  const { error } = await sb.from("sg_deals").update(patch).eq("id", id).eq("agent_id", session.agentId);
  if (error) {
    console.error("[deals] patch failed", error);
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }

  if (body.stage && body.stage !== deal.stage) {
    await sb.from("sg_deal_events").insert({
      deal_id: id,
      agent_id: session.agentId,
      from_stage: deal.stage,
      to_stage: body.stage,
      trigger: "manual",
    });
  }

  return NextResponse.json({ ok: true });
}
