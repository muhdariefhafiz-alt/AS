import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { sendEmail } from "../../../../lib/email";
import { emailShell, p } from "../../../../lib/email-layout";
import { getAgentSession } from "../../../../lib/agent-auth";

// Agents log instruction → OTP → completion. Each step is a separate POST so
// the agent can stop anywhere without losing earlier state.
//
// stage="instruction" payload: { instruction_signed_at, commission_pct_final? }
// stage="otp"         payload: { otp_signed_at }
// stage="completion"  payload: { completion_date, sale_price }
//
// Auth = signed agent session cookie; identity is never taken from the body.

const STAGES = new Set(["instruction", "otp", "completion"]);

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
    const {
      token,
      stage,
      instruction_signed_at,
      otp_signed_at,
      completion_date,
      sale_price,
      commission_pct_final,
    } = body ?? {};

    if (typeof token !== "string" || token.length < 8 || token.length > 64) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }
    if (!STAGES.has(stage)) {
      return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
    }

    const sb = supabaseAdmin();

    const { data: agent, error: agentErr } = await sb
      .from("sg_agents")
      .select("id, name, slug, cea_registration")
      .eq("id", session.agentId)
      .single();
    if (agentErr || !agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    const { data: lead } = await sb
      .from("sg_leads")
      .select(
        "id, token, status, property_type, town, district_code, bedrooms, full_name, email"
      )
      .eq("token", token)
      .single();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const { data: completion } = await sb
      .from("sg_lead_completions")
      .select(
        "id, agent_id, quote_id, instruction_signed_at, otp_signed_at, completion_date, sale_price, commission_pct_final"
      )
      .eq("lead_id", lead.id)
      .single();
    if (!completion || completion.agent_id !== agent.id) {
      return NextResponse.json(
        { error: "You are not the instructed agent on this lead." },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();

    // ── stage: instruction ────────────────────────────────────────────────
    if (stage === "instruction") {
      const signedAt = instruction_signed_at
        ? new Date(String(instruction_signed_at)).toISOString()
        : nowIso;
      const overridePct =
        commission_pct_final !== undefined && commission_pct_final !== null
          ? Number(commission_pct_final)
          : null;
      if (
        overridePct !== null &&
        (!Number.isFinite(overridePct) || overridePct <= 0 || overridePct > 10)
      ) {
        return NextResponse.json(
          { error: "Override commission must be between 0 and 10%." },
          { status: 400 }
        );
      }
      const patch: Record<string, unknown> = {
        instruction_signed_at: signedAt,
      };
      if (overridePct !== null) patch.commission_pct_final = overridePct;
      await sb
        .from("sg_lead_completions")
        .update(patch)
        .eq("id", completion.id);
      await sb
        .from("sg_leads")
        .update({ status: "instructed" })
        .eq("id", lead.id);
      await sb.from("sg_lead_events").insert({
        lead_id: lead.id,
        agent_id: agent.id,
        event_type: "log_instruction",
        meta: {
          signed_at: signedAt,
          commission_override: overridePct,
        },
      });
      return NextResponse.json({ success: true, stage });
    }

    // ── stage: otp ────────────────────────────────────────────────────────
    if (stage === "otp") {
      const otpAt = otp_signed_at
        ? new Date(String(otp_signed_at)).toISOString()
        : nowIso;
      if (!completion.instruction_signed_at) {
        return NextResponse.json(
          { error: "Log instruction signing first." },
          { status: 409 }
        );
      }
      await sb
        .from("sg_lead_completions")
        .update({ otp_signed_at: otpAt })
        .eq("id", completion.id);
      await sb.from("sg_lead_events").insert({
        lead_id: lead.id,
        agent_id: agent.id,
        event_type: "log_otp",
        meta: { otp_signed_at: otpAt },
      });
      return NextResponse.json({ success: true, stage });
    }

    // ── stage: completion ─────────────────────────────────────────────────
    const salePrice = Number(sale_price);
    if (!Number.isFinite(salePrice) || salePrice <= 0 || salePrice > 1e9) {
      return NextResponse.json(
        { error: "Sale price looks invalid." },
        { status: 400 }
      );
    }
    if (!completion_date) {
      return NextResponse.json(
        { error: "Completion date required." },
        { status: 400 }
      );
    }
    const completionDate = new Date(String(completion_date));
    if (Number.isNaN(completionDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid completion date." },
        { status: 400 }
      );
    }
    if (!completion.otp_signed_at) {
      return NextResponse.json(
        { error: "Log OTP signing first." },
        { status: 409 }
      );
    }

    const finalPct =
      completion.commission_pct_final ??
      null;
    const agentCommissionAmt = finalPct
      ? salePrice * (Number(finalPct) / 100)
      : null;

    await sb
      .from("sg_lead_completions")
      .update({
        completion_date: completionDate.toISOString().slice(0, 10),
        sale_price: salePrice,
        agent_commission_amt: agentCommissionAmt,
      })
      .eq("id", completion.id);

    await sb
      .from("sg_leads")
      .update({ status: "completed" })
      .eq("id", lead.id);

    await sb.from("sg_lead_events").insert({
      lead_id: lead.id,
      agent_id: agent.id,
      event_type: "log_completion",
      meta: {
        sale_price: salePrice,
      },
    });

    // The completion feeds the agent's verified track record. The subscription
    // model takes no cut of any sale, so no invoice is raised here. Only the
    // seller "sale completed, leave a review" prompt fires.
    if (lead.email) {
      const site =
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
      const reviewLink = `${site}/sell/review/${token}?utm_source=email`;
      const propertyType = lead.property_type || "property";
      const area = lead.town || lead.district_code || "your area";
      const agentName = agent.name ?? "your agent";
      sendEmail({
        to: lead.email,
        subject: `Congratulations on selling your ${propertyType}`,
        html: emailShell({
          preheader: `One quick thing that helps the next seller in ${area}.`,
          heading: `Congratulations on selling your ${propertyType}`,
          bodyHtml: [
            p(
              `Congratulations on completing the sale of your ${propertyType} in ${area}.`
            ),
            p(
              `Would you take 60 seconds to review ${agentName}? Verified reviews from real sellers are the single most useful thing for the next person choosing an agent here, and yours is verified because we saw the transaction.`
            ),
          ].join(""),
          cta: { label: "Leave a verified review", href: reviewLink },
          unsubscribeEmail: lead.email,
        }),
        metric: "Seller Completion",
        properties: {
          lead_token: token,
          agent_id: agent.id,
        },
      }).catch((e) =>
        console.error("[completion/log] seller email failed", e)
      );
    }

    return NextResponse.json({
      success: true,
      stage,
    });
  } catch (err) {
    console.error("[completion/log] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
