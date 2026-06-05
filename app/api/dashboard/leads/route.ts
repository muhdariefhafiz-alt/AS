import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { checkRateLimit, clientIp } from "../../../lib/rateLimit";

// List invited leads for an agent. Auth = email match against claimed_email,
// same pattern as /api/dashboard/lookup.
export async function POST(req: Request) {
  try {
    // Auth is email-only and this returns seller PII (names) + lead tokens, so
    // throttle to stop enumeration of claimed agents and their pipelines.
    const ip = clientIp(req);
    const { limited } = await checkRateLimit(`dash-leads:${ip}`, 10, 60 * 60 * 1000);
    if (limited) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    const normalized = email.toLowerCase().trim();
    const sb = supabaseAdmin();

    const { data: agent } = await sb
      .from("sg_agents")
      .select("id, cea_registration")
      .eq("claimed", true)
      .eq("claimed_email", normalized)
      .single();
    if (!agent) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Pull every shortlist row this agent has, plus the lead context.
    // sg_lead_shortlist.status: invited | quoted | picked | not_picked | declined | suggested
    const { data: rows } = await sb
      .from("sg_lead_shortlist")
      .select(
        "id, status, invited_at, quoted_at, picked_at, sg_leads!inner(id, token, status, property_type, town, district_code, bedrooms, est_value_low, est_value_high, timeline, reason, full_name, created_at)"
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
        platform_fee_amt: number | null;
        fee_status: string;
        invoice_reference: string | null;
        invoice_due_at: string | null;
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
          "id, lead_id, instruction_signed_at, otp_signed_at, completion_date, sale_price, commission_pct_final, platform_fee_amt, fee_status, invoice_reference, invoice_due_at"
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
            platform_fee_amt: x.platform_fee_amt ?? null,
            fee_status: String(x.fee_status ?? "pending"),
            invoice_reference: x.invoice_reference ?? null,
            invoice_due_at: x.invoice_due_at ?? null,
          },
        ])
      );
    }

    const out = (rows ?? []).map((r) => {
      const l = leadOf(r);
      const lid = Number(l.id ?? 0);
      return {
        shortlist_id: Number(r.id),
        status: String(r.status),
        invited_at: r.invited_at ?? null,
        quoted_at: r.quoted_at ?? null,
        picked_at: r.picked_at ?? null,
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
        },
        quote: quotesByLead.get(lid) ?? null,
        completion: completionByLead.get(lid) ?? null,
      };
    });

    return NextResponse.json({
      cea_registration: agent.cea_registration,
      leads: out,
    });
  } catch (err) {
    console.error("[dashboard/leads] error", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
