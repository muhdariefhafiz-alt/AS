import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { logInboxSetup } from "../../../lib/inbox-activation";

// List invited leads for the signed-in agent. Derived from the session cookie,
// never from a request-body email. Returns seller PII + lead tokens.
//
// Rows are ordered "money-at-risk first": unanswered invited leads lead the
// queue (overdue, then biggest deal, then oldest), so nothing rots. Each row
// carries an SLA age so the UI can show a countdown; a summary drives the
// "N leads need a reply" habit line.

// Deal size = midpoint of the seller's own indicated value range (honest, not a
// fabricated commission). Used only to rank, never shown as commission.
function midValue(low: number | null, high: number | null): number {
  const lo = Number(low) || 0;
  const hi = Number(high) || 0;
  if (lo && hi) return (lo + hi) / 2;
  return hi || lo || 0;
}

type Sla = "fresh" | "aging" | "overdue";
function slaFor(ageHours: number): Sla {
  if (ageHours >= 24) return "overdue";
  if (ageHours >= 4) return "aging";
  return "fresh";
}

// Inbox ordering groups: needs-you first, then wins, then waiting, then closed.
function groupOf(status: string): number {
  if (status === "invited") return 0;
  if (status === "picked") return 1;
  if (status === "quoted") return 2;
  return 3;
}
export async function POST() {
  try {
    const session = await getAgentSession();
    if (!session) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const sb = supabaseAdmin();

    const { data: agent } = await sb
      .from("sg_agents")
      .select("id, cea_registration, slug")
      .eq("id", session.agentId)
      .single();
    if (!agent) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Pull every shortlist row this agent has, plus the lead context.
    // sg_lead_shortlist.status: invited | quoted | picked | not_picked | declined | suggested
    const { data: rows } = await sb
      .from("sg_lead_shortlist")
      .select(
        "id, status, invited_at, quoted_at, picked_at, first_reply_at, sg_leads!inner(id, token, status, property_type, town, district_code, bedrooms, est_value_low, est_value_high, timeline, reason, full_name, email, phone, whatsapp, created_at)"
      )
      .eq("agent_id", agent.id)
      .in("status", ["invited", "quoted", "picked", "not_picked"])
      .order("picked_at", { ascending: false, nullsFirst: false })
      .order("invited_at", { ascending: false });

    type LeadObj = Record<string, unknown>;
    // sg_leads is a 1:1 from the shortlist row, but Supabase types it as an
    // array of the joined shape. Cast through unknown to flatten.
    const leadOf = (r: { sg_leads: unknown }): LeadObj =>
      ((Array.isArray(r.sg_leads) ? r.sg_leads[0] : r.sg_leads) ?? {}) as LeadObj;
    const leadIds: number[] = (rows ?? [])
      .map((r) => Number(leadOf(r).id ?? 0))
      .filter((id) => id > 0);

    let quotesByLead = new Map<
      number,
      {
        id: number;
        commission_pct: number;
        est_timeline_weeks: number | null;
        est_value_low: number | null;
        est_value_high: number | null;
        marketing_plan: string;
        status: string;
        submitted_at: string | null;
      }
    >();
    let completionByLead = new Map<
      number,
      {
        id: number;
        instruction_signed_at: string | null;
        otp_signed_at: string | null;
        completion_date: string | null;
        sale_price: number | null;
        commission_pct_final: number | null;
      }
    >();
    if (leadIds.length > 0) {
      const { data: q } = await sb
        .from("sg_lead_quotes")
        .select(
          "id, lead_id, commission_pct, est_timeline_weeks, est_value_low, est_value_high, marketing_plan, status, submitted_at"
        )
        .eq("agent_id", agent.id)
        .in("lead_id", leadIds);
      quotesByLead = new Map(
        (q ?? []).map((x) => [
          Number(x.lead_id),
          {
            id: Number(x.id),
            commission_pct: Number(x.commission_pct),
            est_timeline_weeks: x.est_timeline_weeks ?? null,
            est_value_low: x.est_value_low ?? null,
            est_value_high: x.est_value_high ?? null,
            marketing_plan: String(x.marketing_plan ?? ""),
            status: String(x.status ?? ""),
            submitted_at: x.submitted_at ?? null,
          },
        ])
      );

      const { data: c } = await sb
        .from("sg_lead_completions")
        .select(
          "id, lead_id, instruction_signed_at, otp_signed_at, completion_date, sale_price, commission_pct_final"
        )
        .eq("agent_id", agent.id)
        .in("lead_id", leadIds);
      completionByLead = new Map(
        (c ?? []).map((x) => [
          Number(x.lead_id),
          {
            id: Number(x.id),
            instruction_signed_at: x.instruction_signed_at ?? null,
            otp_signed_at: x.otp_signed_at ?? null,
            completion_date: x.completion_date ?? null,
            sale_price: x.sale_price ?? null,
            commission_pct_final: x.commission_pct_final ?? null,
          },
        ])
      );
    }

    const now = Date.now();
    const out = (rows ?? []).map((r) => {
      const l = leadOf(r);
      const lid = Number(l.id ?? 0);
      const dealValue = midValue(
        l.est_value_low != null ? Number(l.est_value_low) : null,
        l.est_value_high != null ? Number(l.est_value_high) : null
      );
      const needsReply = String(r.status) === "invited" && !r.first_reply_at;
      const ageHours = r.invited_at
        ? Math.max(0, (now - new Date(String(r.invited_at)).getTime()) / 3_600_000)
        : null;
      return {
        shortlist_id: Number(r.id),
        status: String(r.status),
        invited_at: r.invited_at ?? null,
        quoted_at: r.quoted_at ?? null,
        picked_at: r.picked_at ?? null,
        first_reply_at: r.first_reply_at ?? null,
        needs_reply: needsReply,
        age_hours: ageHours != null ? Math.round(ageHours) : null,
        sla: needsReply && ageHours != null ? slaFor(ageHours) : null,
        deal_value: dealValue,
        lead: {
          id: lid,
          token: String(l.token ?? ""),
          status: String(l.status ?? ""),
          property_type: String(l.property_type ?? ""),
          town: (l.town as string) ?? null,
          district_code: (l.district_code as string) ?? null,
          bedrooms: l.bedrooms ?? null,
          est_value_low: l.est_value_low ?? null,
          est_value_high: l.est_value_high ?? null,
          timeline: (l.timeline as string) ?? null,
          reason: (l.reason as string) ?? null,
          full_name: (l.full_name as string) ?? null,
          created_at: l.created_at ?? null,
          // Seller contact details are released ONLY on the lead this agent
          // won: the seller chose them, which is what the PDPA consent
          // permits. Every other status gets nulls.
          ...(String(r.status) === "picked"
            ? {
                email: (l.email as string) ?? null,
                phone: (l.phone as string) ?? null,
                whatsapp: (l.whatsapp as string) ?? null,
              }
            : { email: null, phone: null, whatsapp: null }),
        },
        quote: quotesByLead.get(lid) ?? null,
        completion: completionByLead.get(lid) ?? null,
      };
    });

    // Money-at-risk ordering: needs-you leads first (overdue, then biggest deal,
    // then oldest), then wins, waiting, closed.
    out.sort((a, b) => {
      const ga = groupOf(a.status);
      const gb = groupOf(b.status);
      if (ga !== gb) return ga - gb;
      if (ga === 0) {
        if (a.needs_reply !== b.needs_reply) return a.needs_reply ? -1 : 1;
        if (a.needs_reply && b.needs_reply) {
          const ao = (a.age_hours ?? 0) >= 24 ? 0 : 1;
          const bo = (b.age_hours ?? 0) >= 24 ? 0 : 1;
          if (ao !== bo) return ao - bo;
          if (b.deal_value !== a.deal_value) return b.deal_value - a.deal_value;
          return (b.age_hours ?? 0) - (a.age_hours ?? 0);
        }
        return 0;
      }
      const ta = new Date(String(a.picked_at || a.quoted_at || a.invited_at || 0)).getTime();
      const tb = new Date(String(b.picked_at || b.quoted_at || b.invited_at || 0)).getTime();
      return tb - ta;
    });

    const needs = out.filter((r) => r.needs_reply);
    const summary = {
      needs_reply: needs.length,
      oldest_aging_hours: needs.length ? Math.max(...needs.map((r) => r.age_hours ?? 0)) : 0,
      top_deal_value: needs.length ? Math.max(...needs.map((r) => r.deal_value)) : 0,
    };

    // Setup activation event (idempotent, best-effort): the agent has the inbox.
    logInboxSetup(sb, Number(agent.id), (agent.slug as string | null) ?? null).catch(() => {});

    return NextResponse.json({
      cea_registration: agent.cea_registration,
      leads: out,
      summary,
    });
  } catch (err) {
    console.error("[dashboard/leads] error", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
