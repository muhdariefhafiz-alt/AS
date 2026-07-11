import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { validateQuoteFields, submitQuoteCore } from "../../../lib/quotes";

// Agent submits a quote on a lead they were invited to. Authenticated by the
// signed agent session cookie; identity is never taken from the request body.
// Submission mechanics live in lib/quotes.ts, shared with /api/invite/quote.

export async function POST(req: Request) {
  try {
    const session = await getAgentSession();
    if (!session) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (session.impersonatedBy) {
      return NextResponse.json(
        { error: "This action is disabled during admin impersonation." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { token } = body ?? {};
    if (typeof token !== "string" || token.length < 8 || token.length > 64) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }
    const v = validateQuoteFields(body ?? {});
    if (!v.ok) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    const sb = supabaseAdmin();

    const { data: agent, error: agentErr } = await sb
      .from("sg_agents")
      .select("id, name")
      .eq("id", session.agentId)
      .single();
    if (agentErr || !agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    const { data: lead } = await sb
      .from("sg_leads")
      .select(
        "id, token, status, email, whatsapp, marketing_consent, full_name, property_type, town, district_code"
      )
      .eq("token", token)
      .single();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const { data: shortlist } = await sb
      .from("sg_lead_shortlist")
      .select("id, status")
      .eq("lead_id", lead.id)
      .eq("agent_id", agent.id)
      .single();
    if (!shortlist || shortlist.status !== "invited") {
      return NextResponse.json(
        { error: "You were not invited to quote on this lead." },
        { status: 403 }
      );
    }

    const result = await submitQuoteCore({
      lead,
      agent,
      shortlistId: Number(shortlist.id),
      pct: v.pct,
      plan: v.plan,
      fields: body ?? {},
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[sell/quote] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
